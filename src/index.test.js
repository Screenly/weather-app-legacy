import { afterEach, describe, expect, it, mock } from 'bun:test'
import { jsx } from 'hono/jsx'
import App from './components/App'

// The Cloudflare static-assets middleware and its build-time manifest only
// exist in the Workers runtime; stub both before importing the app.
mock.module('__STATIC_CONTENT_MANIFEST', () => ({ default: '{}' }))
mock.module('hono/cloudflare-workers', () => ({
  serveStatic: () => async (_c, next) => next()
}))

// A Map-backed Cache API stub serving both caches.default (SSR page cache,
// keyed by Request) and caches.open() (the weather middleware, keyed by URL).
const makeCache = () => {
  const store = new Map()
  const keyOf = (k) => (typeof k === 'string' ? k : k.url)
  // Clone on store/return, mirroring the real Cache API, so a cached Response
  // body is never consumed twice ("Body has already been used").
  return {
    store,
    match: async (k) => store.get(keyOf(k))?.clone(),
    put: async (k, res) => { store.set(keyOf(k), res.clone()) }
  }
}

// hono's cache() middleware decides whether caching is enabled at construction
// time (module load), from globalThis.caches. Define it BEFORE importing the
// app so the real middleware is wired up, not the no-op fallback. (In the
// Workers runtime caches is always defined, so this only matters under test.)
const BASELINE_CACHE = { default: makeCache(), open: async () => makeCache() }
globalThis.caches = BASELINE_CACHE

const app = (await import('.')).default
const ORIGINAL_FETCH = globalThis.fetch

const runWaitUntil = async (promises) => { await Promise.all(promises) }

afterEach(() => {
  globalThis.caches = BASELINE_CACHE
  globalThis.fetch = ORIGINAL_FETCH
})

describe('Routing', () => {
  it('redirects a location-less request to a default location', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(301)
    expect(res.headers.get('Location')).toContain('lat=')
    expect(res.headers.get('Location')).toContain('lng=')
  })

  it('redirects when only one coordinate is provided', async () => {
    const res = await app.request('http://localhost/?lat=51.5')
    expect(res.status).toBe(301)
    const location = res.headers.get('Location')
    expect(location).toContain('lat=51.5')
    expect(location).toContain('lng=')
    // No malformed double query string.
    expect(location.match(/\?/g)).toHaveLength(1)
  })

  it('renders the page HTML via hono JSX (server-side)', () => {
    // Mirrors the route's `new Response((<App/>).toString())`.
    const body = jsx(App, { env: 'production', lat: '51.5', lng: '-0.12' }).toString()
    expect(body).toContain('<!DOCTYPE html>')
    expect(body).toContain('id="weather-item-list"')
    expect(body).toContain('weather-fx')
    expect(body).not.toContain('[object Object]')
    // main.js is bundled as an ES module (ends in `export default`), so it must
    // be loaded as a module or the browser throws on the `export` token and the
    // page never populates.
    expect(body).toContain('<script type="module" src="/static/js/main.js">')
  })
})

describe('Page caching (/ route)', () => {
  it('renders on a cache miss, caching under a real Request key with the edge Cache-Control', async () => {
    const keys = []
    const puts = []
    globalThis.caches = {
      default: {
        match: async (k) => { keys.push(k); return undefined },
        put: async (k) => { keys.push(k) }
      }
    }
    const ctx = { waitUntil: (p) => puts.push(p), passThroughOnException () {} }

    const res = await app.request('http://localhost/?lat=51.5&lng=-0.12', {}, { ENV: 'production' }, ctx)

    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<!DOCTYPE html>')
    // 12h shared-cache TTL must survive the migration.
    expect(res.headers.get('Cache-Control')).toBe('s-maxage=43200')
    await runWaitUntil(puts)
    // The page cache key must be a real Request (c.req.raw). hono's HonoRequest
    // wrapper also exposes .url, so assert the concrete type to lock the
    // contract — using c.req would fail this instanceof check.
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(key).toBeInstanceOf(Request)
    // The key must be versioned by the asset bundle so a deploy busts the page
    // cache instead of serving HTML that references the previous build's assets.
    for (const key of keys) expect(new URL(key.url).searchParams.get('v')).toBeTruthy()
  })

  it('serves the cached page on a repeat request without re-rendering', async () => {
    const cached = new Response('CACHED PAGE', { status: 200 })
    globalThis.caches = { default: { match: async () => cached, put: async () => {} } }
    const ctx = { waitUntil () {}, passThroughOnException () {} }

    const res = await app.request('http://localhost/?lat=51.5&lng=-0.12', {}, { ENV: 'production' }, ctx)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('CACHED PAGE')
  })
})

describe('Weather API caching (/api/weather)', () => {
  it('caches a 200 upstream response and serves repeats from cache', async () => {
    const cache = makeCache()
    globalThis.caches = { default: cache, open: async () => cache }

    let fetchCount = 0
    globalThis.fetch = async () => {
      fetchCount++
      return new Response(JSON.stringify({ city: { name: 'X' }, list: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }

    const puts = []
    const ctx = { waitUntil: (p) => puts.push(p), passThroughOnException () {} }
    const env = { OPEN_WEATHER_API_KEY: 'test-key' }
    const url = 'http://localhost/api/weather?lat=1&lng=2'

    const first = await app.request(url, {}, env, ctx)
    expect(first.status).toBe(200)
    // The middleware must apply the 3h shared-cache TTL.
    expect(first.headers.get('Cache-Control')).toContain('s-maxage=10800')

    await runWaitUntil(puts)

    const second = await app.request(url, {}, env, ctx)
    expect(second.status).toBe(200)
    // Served from cache: the upstream was only hit once.
    expect(fetchCount).toBe(1)
  })
})
