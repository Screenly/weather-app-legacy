import {
  usesFahrenheit,
  unitsCountry,
  celsiusToFahrenheit,
  setLocale,
  setLocaleOverride,
  setTimeFormat,
  getTimeByOffset,
  formatTime,
  formatDate,
  getCondCategory
} from './locale.js'

// This file is bundled by Bun.build and served as a PLAIN classic <script>.
// It must therefore stay a self-executing IIFE with NO top-level `export`:
// the testable helpers live in ./locale.js (bundled in here), and this file
// exports nothing. That keeps the served bundle loadable by every cached HTML
// variant — both the old classic <script> tag and a type="module" tag run a
// self-executing script identically — so a deploy never strands cached pages.
(() => {
  let clockTimer
  let weatherTimer
  let refreshTimer
  let ctaTimer
  let tz
  let currentWeatherId
  let tempScale = 'C'

  const imagesPath = '/static/images'
  const iconsPath = `${imagesPath}/icons`
  const bgPath = `${imagesPath}/bg`

  // Cache-busting suffix for JS-built asset URLs (icons, backgrounds). The
  // version is injected by the page as window.__ASSET_V; absent it (e.g. an
  // old cached page), URLs stay unversioned and still resolve.
  const assetVersion = (typeof window !== 'undefined' && window.__ASSET_V) || ''
  const withVersion = (url) => (assetVersion ? `${url}?v=${assetVersion}` : url)

  const getTemp = (temp) => Math.round(tempScale === 'C' ? temp : celsiusToFahrenheit(temp))

  /**
   * Utility Functions
   */
  const generateAnalyticsEvent = (name, payload) => {
    typeof gtag !== 'undefined' && gtag('event', name, payload) // eslint-disable-line no-undef
  }

  const checkIfNight = (dt) => {
    const dateTime = getTimeByOffset(tz, dt)
    const hrs = dateTime.getHours()

    return hrs <= 5 || hrs >= 20
  }

  const updateContent = (id, text) => {
    document.querySelector(`#${id}`).textContent = text
  }

  const updateAttribute = (id, attr, val) => document.querySelector(`#${id}`).setAttribute(attr, val)

  const loadImage = (img = 'default') => {
    const lowResImgSrc = withVersion(`${bgPath}/${img}-min.jpg`)
    const highResImgSrc = withVersion(`${bgPath}/${img}.jpg`)

    const lowResImage = new Image()
    const highResImage = new Image()

    lowResImage.addEventListener('load', () => {
      document.body.style.backgroundImage = `url(${lowResImgSrc})`
    })

    highResImage.addEventListener('load', () => {
      document.body.style.backgroundImage = `url(${highResImgSrc})`
    })

    lowResImage.src = lowResImgSrc
    highResImage.src = highResImgSrc
  }

  const checkIfInRange = (ranges, code) => ranges.reduce((acc, range) => acc || (code >= range[0] && code <= range[1]))

  const getWeatherImagesById = (id = 800, dt) => {
    // List of codes - https://openweathermap.org/weather-conditions
    // To do - Refactor
    const isNight = checkIfNight(dt)
    const hasNightBg = checkIfInRange([[200, 399], [500, 699], [800, 804]], id)
    let icon
    let bg

    if (id >= 200 && id <= 299) {
      icon = 'thunderstorm'
      bg = 'thunderstorm'
    }

    if (id >= 300 && id <= 399) {
      icon = 'drizzle'
      bg = 'drizzle'
    }

    if (id >= 500 && id <= 599) {
      icon = 'rain'
      bg = 'rain'
    }

    if (id >= 600 && id <= 699) {
      icon = 'snow'
      bg = 'snow'
    }

    if (id >= 700 && id <= 799) {
      // To do - Handle all 7xx cases
      icon = 'haze'

      if (id === 701 || id === 721 || id === 741) {
        bg = 'haze'
      } else if (id === 711) {
        bg = 'smoke'
      } else if (id === 731 || id === 751 || id === 761) {
        bg = 'sand'
      } else if (id === 762) {
        bg = 'volcanic-ash'
      } else if (id === 771) {
        // To do - change image squall
        bg = 'volcanic-ash'
      } else if (id === 781) {
        bg = 'tornado'
      }
    }

    if (id === 800) {
      icon = 'clear'
      bg = 'clear'
    }

    if (id === 801) {
      icon = 'partially-cloudy'
      bg = 'cloudy'
    }

    if (id >= 802 && id <= 804) {
      icon = 'mostly-cloudy'
      bg = 'cloudy'
    }

    return {
      icon: isNight ? `${icon}-night` : icon,
      bg: isNight && hasNightBg ? `${bg}-night` : bg
    }
  }

  const initDateTime = (tzOffset) => {
    tz = tzOffset
    clearTimeout(clockTimer)
    const today = getTimeByOffset(tzOffset)

    updateContent('time', formatTime(today))
    updateContent('date', formatDate(today))

    clockTimer = setTimeout(() => initDateTime(tzOffset), 30000)
  }

  const getLocation = () => {
    const locationEl = document.querySelector('#location-data')
    const lat = locationEl.getAttribute('data-location-lat')
    const lng = locationEl.getAttribute('data-location-lng')

    return {
      lat,
      lng
    }
  }

  const updateLocation = (name) => {
    updateContent('city', name)
  }

  const updateCurrentWeather = (icon, desc, temp) => {
    updateAttribute('current-weather-icon', 'src', withVersion(`${iconsPath}/${icon}.svg`))
    updateContent('current-weather-status', desc)
    updateContent('current-temp', getTemp(temp))
    // The degree sign is a static element; the scale element holds just C/F.
    updateContent('current-temp-scale', tempScale)
  }

  const setAccent = (id, dt) => {
    document.body.dataset.cond = getCondCategory(id)
    document.body.dataset.night = checkIfNight(dt) ? 'true' : 'false'
  }

  const updateDetail = (feelsLike, humidity, windSpeed) => {
    const parts = []
    if (typeof feelsLike === 'number') {
      parts.push(`Feels like ${getTemp(feelsLike)}°`)
    }
    if (typeof humidity === 'number') {
      parts.push(`Humidity ${humidity}%`)
    }
    if (typeof windSpeed === 'number') {
      // OpenWeather metric wind is m/s; show mph for °F countries, else km/h.
      const wind = tempScale === 'F'
        ? `${Math.round(windSpeed * 2.23694)} mph`
        : `${Math.round(windSpeed * 3.6)} km/h`
      parts.push(`Wind ${wind}`)
    }

    const detail = document.querySelector('#detail')
    if (detail) {
      detail.replaceChildren(...parts.map((part) => {
        const span = document.createElement('span')
        span.textContent = part
        return span
      }))
    }
  }

  const findCurrentWeatherItem = (list) => {
    const currentUTC = Math.round(Date.now() / 1000)
    let itemIndex = 0

    while (itemIndex < list.length - 1 && list[itemIndex].dt < currentUTC) {
      itemIndex++
    }

    if (itemIndex > 0) {
      const timeDiffFromPrev = currentUTC - list[itemIndex - 1].dt
      const timeDiffFromCurrent = list[itemIndex].dt - currentUTC

      if (timeDiffFromPrev < timeDiffFromCurrent) {
        itemIndex = itemIndex - 1
      }
    }

    return itemIndex
  }

  const updateWeather = (list) => {
    clearTimeout(weatherTimer)
    if (!Array.isArray(list) || list.length === 0) return

    const currentIndex = findCurrentWeatherItem(list)

    const currentItem = list[currentIndex]
    const { dt, weather, main: { temp, feels_like: feelsLike, humidity } } = currentItem

    if (Array.isArray(weather) && weather.length > 0) {
      const { id, description } = weather[0]
      const { icon, bg } = getWeatherImagesById(id, dt)
      if (id !== currentWeatherId) {
        loadImage(bg)
      }

      updateCurrentWeather(icon, description, temp)
      updateDetail(feelsLike, humidity, currentItem.wind?.speed)
      setAccent(id, dt)
      currentWeatherId = id
    }

    const weatherListContainer = document.querySelector('#weather-item-list')
    const frag = document.createDocumentFragment()
    const windowSize = 5
    const currentWindow = list.slice(currentIndex, currentIndex <= windowSize - 1 ? currentIndex + windowSize : list.length - 1)
    currentWindow.forEach((item, index) => {
      const { dt, main: { temp }, weather } = item

      const { icon } = getWeatherImagesById(weather[0]?.id, dt)
      const dateTime = getTimeByOffset(tz, dt)

      const dummyNode = document.querySelector('.dummy-node')
      const node = dummyNode.cloneNode(true)
      node.classList.remove('dummy-node')
      node.querySelector('.item-temp').textContent = getTemp(temp)
      node.querySelector('.item-icon').setAttribute('src', withVersion(`${iconsPath}/${icon}.svg`))
      node.querySelector('.item-time').textContent = index === 0 ? 'Current' : formatTime(dateTime)

      frag.appendChild(node)
    })

    weatherListContainer.innerHTML = ''
    weatherListContainer.appendChild(frag)
    // Refresh weather from local list every 15 mins
    weatherTimer = setTimeout(() => updateWeather(list), 10 * 60 * 1000)
  }

  const updateData = (data) => {
    // The API returns { error: true } on upstream failures; skip those.
    if (!data?.city) return
    const { city: { name, country, timezone }, list } = data
    // Units follow the ?locale override's region when set, else the location.
    tempScale = usesFahrenheit(unitsCountry(country)) ? 'F' : 'C'
    setLocale(country)
    updateLocation(name)
    initDateTime(timezone)
    updateWeather(list)
    // Report the resolved location so we can track which places are popular.
    generateAnalyticsEvent('location', {
      app_name: 'Screenly Weather App',
      city: name,
      country
    })
  }

  /**
   * Fetch weather
   */

  const fetchWeather = async () => {
    clearTimeout(refreshTimer)
    try {
      const { lat, lng } = getLocation()
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      const isCacheHit = response.headers.get('cf-cache-status') === 'HIT'
      const data = await response.json()
      updateData(data)
      generateAnalyticsEvent('cache_status', {
        app_name: 'Screenly Weather App',
        cached: isCacheHit,
        lat,
        lng
      })
    } catch (e) {
      console.log(e)
    }
    // Reschedule the next refresh so updates keep coming every 2 hours.
    refreshTimer = setTimeout(fetchWeather, 120 * 60 * 1000)
  }

  /**
   * Rotating Screenly call-to-action.
   *
   * The banner is only shown on non-Screenly devices (a browser tab or a rival
   * signage system), so the copy pitches the viewer to switch to Screenly. It
   * is non-interactive (a digital sign has no cursor/touch) and surfaces
   * screenly.io as the destination a viewer types in themselves.
   */
  const ctaMessages = [
    'Powerful, secure, simple digital signage',
    'Secure by default: SOC 2, zero-trust',
    'Manage every screen from anywhere',
    'Run Screenly on hardware you already own',
    'Powering 10,000+ screens worldwide'
  ]
  let ctaIndex = 0

  const rotateCta = () => {
    const msg = document.querySelector('#cta-msg')
    if (!msg) return

    ctaIndex = (ctaIndex + 1) % ctaMessages.length
    const next = ctaMessages[ctaIndex]
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

    if (reduceMotion) {
      msg.textContent = next
      return
    }

    msg.classList.add('is-out')
    setTimeout(() => {
      msg.textContent = next
      msg.classList.remove('is-out')
    }, 450)
  }

  const setBanner = () => {
    const banner = document.querySelector('.upgrade-banner')
    const { userAgent } = navigator
    const isScreenlyDevice = userAgent.includes('screenly-viewer')

    if (banner && !isScreenlyDevice) {
      banner.classList.add('visible')
      clearInterval(ctaTimer)
      ctaTimer = setInterval(rotateCta, 5000)
    }

    generateAnalyticsEvent('device', {
      app_name: 'Screenly Weather App',
      screenly_device: isScreenlyDevice
    })
  }

  const init = () => {
    // Optional overrides from the launch URL (the settings the signage-app
    // manifest exposes in the store): ?locale forces the language/region, ?24h
    // forces 12h (0) or 24h (1). Both are absent/empty by default so the display
    // auto-detects from the resolved location. Applied before the first render;
    // they are sticky module state, so they survive the later setLocale() call.
    const params = new URLSearchParams(window.location.search)
    setLocaleOverride(params.get('locale'))
    setTimeFormat(params.get('24h'))
    // fetchWeather() reschedules itself every 2 hours.
    fetchWeather()
    setBanner()
  }

  // Only auto-run in a real browser; under a test runner there is no document.
  // The script is loaded async, so wait for the DOM before reading elements.
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
    } else {
      init()
    }
  }
})()
