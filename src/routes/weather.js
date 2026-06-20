import { Hono } from 'hono'
import { defaultLocation } from '../constants'

const weather = new Hono()

const UPSTREAM_TIMEOUT_MS = 10000

weather.get('/', async (c) => {
  try {
    const { lat = defaultLocation.lat, lng = defaultLocation.lng } = c.req.query()
    const params = new URLSearchParams({
      lat,
      lon: lng,
      units: 'metric',
      cnt: '10',
      appid: c.env.OPEN_WEATHER_API_KEY
    })
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`

    const timeoutMs = Number(c.env.WEATHER_TIMEOUT_MS) || UPSTREAM_TIMEOUT_MS
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let resp
    try {
      resp = await fetch(apiUrl, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }

    if (!resp.ok) {
      console.log(`Weather upstream returned ${resp.status} ${resp.statusText}`)
      return c.json({ error: true }, 502)
    }

    const json = await resp.json()

    return c.json(json)
  } catch (e) {
    console.log(e)
    // An aborted fetch surfaces as AbortError/TimeoutError directly in the
    // Workers runtime, but some runtimes wrap it as `TypeError: fetch failed`
    // with the original error on `cause`.
    const isTimeout = (err) => err && (err.name === 'AbortError' || err.name === 'TimeoutError')
    return c.json({ error: true }, isTimeout(e) || isTimeout(e.cause) ? 504 : 502)
  }
})

export default weather
