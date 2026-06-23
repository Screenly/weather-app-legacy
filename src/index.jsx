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
    // hono v4's c.req is a HonoRequest wrapper; the Cache API needs the raw Request.
    const key = c.req.raw
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
