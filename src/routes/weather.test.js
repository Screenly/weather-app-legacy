import weather from './weather'

/* eslint-env jest */
/* global getMiniflareFetchMock */

const env = { OPEN_WEATHER_API_KEY: 'test-key' }
const ctx = { waitUntil () {} }

const ORIGIN = 'https://api.openweathermap.org'

const call = (path = 'http://localhost/') =>
  weather.fetch(new Request(path), env, ctx)

describe('Weather route', () => {
  let fetchMock

  beforeAll(() => {
    fetchMock = getMiniflareFetchMock()
    fetchMock.disableNetConnect()
  })

  it('returns the upstream payload on success', async () => {
    const payload = { city: { name: 'Testville' }, list: [] }
    fetchMock
      .get(ORIGIN)
      .intercept({ method: 'GET', path: () => true })
      .reply(200, payload)

    const res = await call('http://localhost/?lat=37.77&lng=-122.43')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(payload)
  })

  it('escapes query params and the api key in the upstream URL', async () => {
    let capturedPath
    fetchMock
      .get(ORIGIN)
      .intercept({
        method: 'GET',
        path (p) { capturedPath = p; return true }
      })
      .reply(200, {})

    // An injection attempt that tries to smuggle a second appid param.
    await call('http://localhost/?lat=37.77&lng=' + encodeURIComponent('-122&appid=evil'))

    const url = new URL(ORIGIN + capturedPath)

    // The injected value must stay a single `lon` param, not a second appid.
    expect(url.searchParams.get('lon')).toBe('-122&appid=evil')
    expect(url.searchParams.getAll('appid')).toEqual(['test-key'])
    expect(url.searchParams.get('lat')).toBe('37.77')
    expect(url.searchParams.get('units')).toBe('metric')
  })

  it('returns 502 when the upstream responds with a non-OK status', async () => {
    fetchMock
      .get(ORIGIN)
      .intercept({ method: 'GET', path: () => true })
      .reply(401, { cod: 401, message: 'Invalid API key.' })

    const res = await call('http://localhost/?lat=37.77&lng=-122.43')

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: true })
  })

  it('returns 504 when the upstream request times out', async () => {
    // Delay the reply well past the (tiny) configured timeout so the route's
    // own AbortController fires for real.
    fetchMock
      .get(ORIGIN)
      .intercept({ method: 'GET', path: () => true })
      .reply(200, {})
      .delay(200)

    const res = await weather.fetch(
      new Request('http://localhost/?lat=37.77&lng=-122.43'),
      { ...env, WEATHER_TIMEOUT_MS: '10' },
      ctx
    )

    expect(res.status).toBe(504)
    expect(await res.json()).toEqual({ error: true })
  })

  it('returns 502 when fetch fails for other reasons', async () => {
    fetchMock
      .get(ORIGIN)
      .intercept({ method: 'GET', path: () => true })
      .replyWithError(new Error('network down'))

    const res = await call('http://localhost/?lat=37.77&lng=-122.43')

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: true })
  })
})
