import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import manifest from '__STATIC_CONTENT_MANIFEST'
import App from './components/App'
import weather from './routes/weather'
import { locationHeaders, locationQueryParams, defaultLocation } from './constants'
import { trimCoordinates } from './utils'

const app = new Hono()

// A short, deploy-stable token derived from the hashed static-asset manifest.
// It changes whenever any asset (JS/CSS/font) changes, which is exactly when a
// deploy ships. Folding it into the page-cache key means a new deploy lands on
// a fresh key instead of serving a previously cached HTML shell that points at
// the previous build's assets. Without this, the 12h SSR page cache outlives a
// deploy and pairs stale HTML with freshly served /static assets.
const ASSET_VERSION = (() => {
  const source = typeof manifest === 'string' ? manifest : JSON.stringify(manifest)
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = (Math.imul(31, hash) + source.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
})()

app.use('*', logger())
app.use('/static/*', serveStatic({ root: './', manifest }))

app.get('/', async (c) => {
  const qLat = c.req.query(locationQueryParams.lat)
  const qLng = c.req.query(locationQueryParams.lng)

  // Redirect to a canonical URL whenever either coordinate is missing, filling
  // gaps from the Screenly location headers or the default location, so the
  // render path always has both lat and lng.
  if (!qLat || !qLng) {
    const lat = qLat || c.req.header(locationHeaders.lat) || defaultLocation.lat
    const lng = qLng || c.req.header(locationHeaders.lng) || defaultLocation.lng
    const coordinates = trimCoordinates({ lat, lng })

    const url = new URL(c.req.url)
    url.searchParams.set('lat', coordinates.lat)
    url.searchParams.set('lng', coordinates.lng)

    return new Response(null, {
      status: 301,
      headers: { Location: url.toString() }
    })
  } else {
    const cache = caches.default
    // hono v4's c.req is a HonoRequest wrapper; the Cache API needs a raw
    // Request. Version the key by the deployed asset bundle so each deploy busts
    // the SSR page cache rather than serving HTML that references stale assets.
    const keyUrl = new URL(c.req.url)
    keyUrl.searchParams.set('v', ASSET_VERSION)
    const key = new Request(keyUrl.toString(), c.req.raw)
    let response = await cache.match(key)

    if (!response) {
      const coordinates = trimCoordinates({ lat: qLat, lng: qLng })
      const env = c.env.ENV
      const body = (<App {...coordinates} env={env} />).toString()
      response = new Response(body, {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=43200',
          'Content-Type': 'text/html; charset=UTF-8'
        }
      })

      c.executionCtx.waitUntil(cache.put(key, response.clone()))
    }

    return response
  }
})

app.get('/api/weather/*', cache({ cacheName: 'default', cacheControl: 's-maxage=10800' }))
app.route('/api/weather', weather)

export default app
