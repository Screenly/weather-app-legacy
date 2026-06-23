/* global module */
(() => {
  let clockTimer
  let weatherTimer
  let refreshTimer
  let ctaTimer
  let tz
  let currentWeatherId
  let tempScale = 'C'
  // BCP-47 locale for the displayed location, plus cached Intl formatters.
  let locale = 'en-GB'
  let timeFormatter
  let dateFormatterLong
  let dateFormatterShort

  const imagesPath = '/static/images'
  const iconsPath = `${imagesPath}/icons`
  const bgPath = `${imagesPath}/bg`

  /**
   * Countries / territories using the Fahrenheit scale:
   * United States (+ territories: Puerto Rico, Guam, US Virgin Islands,
   * American Samoa, Northern Mariana Islands, US Minor Outlying Islands),
   * Bahamas, Cayman Islands, Liberia, Palau, Federated States of Micronesia,
   * Marshall Islands.
   */

  const countriesUsingFahrenheit = [
    'US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM',
    'BS', 'KY', 'LR', 'PW', 'FM', 'MH'
  ]
  const celsiusToFahrenheit = (temp) => ((1.8 * temp) + 32)
  const usesFahrenheit = (code) => countriesUsingFahrenheit.includes(code)

  const getTemp = (temp) => Math.round(tempScale === 'C' ? temp : celsiusToFahrenheit(temp))
  /**
   * Utility Functions
   */
  const generateAnalyticsEvent = (name, payload) => {
    typeof gtag !== 'undefined' && gtag('event', name, payload) // eslint-disable-line no-undef
  }

  const locales = JSON.parse('{"AF":"ps-AF","AL":"sq-AL","DZ":"ar-DZ","AS":"en-AS","AD":"ca","AO":"pt","AI":"en","AQ":"en-US","AG":"en","AR":"es-AR","AM":"hy-AM","AW":"nl","AU":"en-AU","AT":"de-AT","AZ":"az-Cyrl-AZ","BS":"en","BH":"ar-BH","BD":"bn-BD","BB":"en","BY":"be-BY","BE":"nl-BE","BZ":"en-BZ","BJ":"fr-BJ","BM":"en","BT":"dz","BO":"es-BO","BQ":"nl","BA":"bs-BA","BW":"en-BW","BV":"no","BR":"pt-BR","IO":"en","BN":"ms-BN","BG":"bg-BG","BF":"fr-BF","BI":"fr-BI","CV":"kea-CV","KH":"km-KH","CM":"fr-CM","CA":"en-CA","KY":"en","CF":"fr-CF","TD":"fr-TD","CL":"es-CL","CN":"zh-CN","CX":"en","CC":"en","CO":"es-CO","KM":"fr-KM","CD":"fr-CD","CG":"fr-CG","CK":"en","CR":"es-CR","HR":"hr-HR","CU":"es","CW":"nl","CY":"el-CY","CZ":"cs-CZ","CI":"fr-CI","DK":"da-DK","DJ":"fr-DJ","DM":"en","DO":"es-DO","EC":"es-EC","EG":"ar-EG","SV":"es-SV","GQ":"fr-GQ","ER":"ti-ER","EE":"et-EE","SZ":"en","ET":"am-ET","FK":"en","FO":"fo-FO","FJ":"en","FI":"fi-FI","FR":"fr-FR","GF":"fr","PF":"fr","TF":"fr","GA":"fr-GA","GM":"en","GE":"ka-GE","DE":"de-DE","GH":"ak-GH","GI":"en","GR":"el-GR","GL":"kl-GL","GD":"en","GP":"fr-GP","GU":"en-GU","GT":"es-GT","GG":"en","GN":"fr-GN","GW":"pt-GW","GY":"en","HT":"fr","HM":"en","VA":"it","HN":"es-HN","HK":"en-HK","HU":"hu-HU","IS":"is-IS","IN":"hi-IN","ID":"id-ID","IR":"fa-IR","IQ":"ar-IQ","IE":"en-IE","IM":"en","IL":"he-IL","IT":"it-IT","JM":"en-JM","JP":"ja-JP","JE":"en","JO":"ar-JO","KZ":"kk-Cyrl-KZ","KE":"ebu-KE","KI":"en","KP":"ko","KR":"ko-KR","KW":"ar-KW","KG":"ky","LA":"lo","LV":"lv-LV","LB":"ar-LB","LS":"en","LR":"en","LY":"ar-LY","LI":"de-LI","LT":"lt-LT","LU":"fr-LU","MO":"zh-Hans-MO","MG":"fr-MG","MW":"en","MY":"ms-MY","MV":"dv","ML":"fr-ML","MT":"en-MT","MH":"en-MH","MQ":"fr-MQ","MR":"ar","MU":"en-MU","YT":"fr","MX":"es-MX","FM":"en","MD":"ro-MD","MC":"fr-MC","MN":"mn","ME":"sr-Cyrl-ME","MS":"en","MA":"ar-MA","MZ":"pt-MZ","MM":"my-MM","NA":"en-NA","NR":"en","NP":"ne-NP","NL":"nl-NL","AN":"nl-AN","NC":"fr","NZ":"en-NZ","NI":"es-NI","NE":"fr-NE","NG":"ha-Latn-NG","NU":"en","NF":"en","MK":"mk-MK","MP":"en-MP","NO":"nb-NO","OM":"ar-OM","PK":"en-PK","PW":"en","PS":"ar","PA":"es-PA","PG":"en","PY":"es-PY","PE":"es-PE","PH":"en-PH","PN":"en","PL":"pl-PL","PT":"pt-PT","PR":"es-PR","QA":"ar-QA","RO":"ro-RO","RU":"ru-RU","RW":"fr-RW","RE":"fr-RE","BL":"fr-BL","SH":"en","KN":"en","LC":"en","MF":"fr-MF","PM":"fr","VC":"en","WS":"sm","SM":"it","ST":"pt","SA":"ar-SA","SN":"fr-SN","RS":"sr-Cyrl-RS","SC":"fr","SL":"en","SG":"en-SG","SX":"nl","SK":"sk-SK","SI":"sl-SI","SB":"en","SO":"so-SO","ZA":"af-ZA","GS":"en","SS":"en","ES":"es-ES","LK":"si-LK","SD":"ar-SD","SR":"nl","SJ":"no","SE":"sv-SE","CH":"fr-CH","SY":"ar-SY","TW":"zh-Hant-TW","TJ":"tg","TZ":"asa-TZ","TH":"th-TH","TL":"pt","TG":"fr-TG","TK":"en","TO":"to-TO","TT":"en-TT","TN":"ar-TN","TR":"tr-TR","TM":"tk","TC":"en","TV":"en","UG":"cgg-UG","UA":"uk-UA","AE":"ar-AE","GB":"en-GB","UM":"en-UM","US":"en-US","UY":"es-UY","UZ":"uz-Cyrl-UZ","VU":"bi","VE":"es-VE","VN":"vi-VN","VG":"en","VI":"en-VI","WF":"fr","EH":"es","YE":"ar-YE","ZM":"bem-ZM","ZW":"en-ZW","AX":"sv","XK":"sq"}')
  // Default locale when the country is unknown. en-GB gives 24h time and
  // neutral English month/day names (better for signage than the player's
  // own device locale, which is effectively random).
  const FALLBACK_LOCALE = 'en-GB'

  const buildFormatters = () => {
    // Pin the Gregorian calendar so the date always matches the (Gregorian)
    // forecast — otherwise locales like ar-SA would render a Hijri date.
    // Names, ordering and numerals stay localized.
    const timeOpts = { hour: 'numeric', minute: '2-digit' }
    const dateLongOpts = { weekday: 'long', month: 'short', day: 'numeric', calendar: 'gregory' }
    const dateShortOpts = { weekday: 'short', month: 'short', day: 'numeric', calendar: 'gregory' }
    try {
      // Intl picks 12h vs 24h, localized month/day names and AM/PM per locale.
      timeFormatter = new Intl.DateTimeFormat(locale, timeOpts)
      dateFormatterLong = new Intl.DateTimeFormat(locale, dateLongOpts)
      dateFormatterShort = new Intl.DateTimeFormat(locale, dateShortOpts)
    } catch {
      // Malformed locale string: fall back rather than break the clock.
      locale = FALLBACK_LOCALE
      timeFormatter = new Intl.DateTimeFormat(locale, timeOpts)
      dateFormatterLong = new Intl.DateTimeFormat(locale, dateLongOpts)
      dateFormatterShort = new Intl.DateTimeFormat(locale, dateShortOpts)
    }
  }

  const resolveLocale = (code) => locales[code] || FALLBACK_LOCALE

  const setLocale = (code) => {
    locale = resolveLocale(code)
    buildFormatters()
    // Reflect the actual content locale on <html> so assistive tech uses the
    // right pronunciation rules (the SSR shell ships a neutral lang="en").
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }

  // Build defaults up front so the clock works even before any data arrives.
  buildFormatters()

  const getTimeByOffset = (offsetinSecs, dt) => {
    const now = dt ? new Date(dt * 1000) : new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    return new Date(utc + (offsetinSecs * 1000))
  }

  const checkIfNight = (dt) => {
    const dateTime = getTimeByOffset(tz, dt)
    const hrs = dateTime.getHours()

    return hrs <= 5 || hrs >= 20
  }

  const updateContent = (id, text) => {
    document.querySelector(`#${id}`).innerText = text
  }

  const updateAttribute = (id, attr, val) => document.querySelector(`#${id}`).setAttribute(attr, val)

  const loadImage = (img = 'default') => {
    const lowResImgSrc = `${bgPath}/${img}-min.jpg`
    const highResImgSrc = `${bgPath}/${img}.jpg`

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

  /**
   * Update Local Time and Date
   */

  // getTimeByOffset returns a Date whose *local-time* components already read
  // as the location's wall clock, so the default-timezone Intl formatters
  // (which read the same local components) render the correct local time/date.
  const formatTime = (dateObj) => timeFormatter.format(dateObj)

  const formatDate = (dateObj) => {
    const wide = typeof window === 'undefined' || window.innerWidth >= 480
    const formatter = wide ? dateFormatterLong : dateFormatterShort
    return formatter.format(dateObj)
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
    updateAttribute('current-weather-icon', 'src', `${iconsPath}/${icon}.svg`)
    updateContent('current-weather-status', desc)
    updateContent('current-temp', getTemp(temp))
    // The degree sign is a static element; the scale element holds just C/F.
    updateContent('current-temp-scale', tempScale)
  }

  // Simplified condition category used to drive the weather-reactive accent.
  const getCondCategory = (id) => {
    if (id >= 200 && id <= 299) return 'thunderstorm'
    if (id >= 300 && id <= 399) return 'drizzle'
    if (id >= 500 && id <= 599) return 'rain'
    if (id >= 600 && id <= 699) return 'snow'
    if (id >= 700 && id <= 799) return 'haze'
    if (id === 800) return 'clear'
    return 'clouds'
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
      detail.innerHTML = parts.map((part) => `<span>${part}</span>`).join('')
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
      node.querySelector('.item-temp').innerText = getTemp(temp)
      node.querySelector('.item-icon').setAttribute('src', `${iconsPath}/${icon}.svg`)
      node.querySelector('.item-time').innerText = index === 0 ? 'Current' : formatTime(dateTime)

      frag.appendChild(node)
    })

    weatherListContainer.innerHTML = ''
    weatherListContainer.appendChild(frag)
    // Refresh weather from local list every 15 mins
    weatherTimer = setTimeout(() => updateWeather(list), 10 * 60 * 1000)
  }

  const updateData = (data) => {
    const { city: { name, country, timezone }, list } = data
    tempScale = usesFahrenheit(country) ? 'F' : 'C'
    setLocale(country)
    updateLocation(name)
    initDateTime(timezone)
    updateWeather(list)
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      msg.innerText = next
      return
    }

    msg.classList.add('is-out')
    setTimeout(() => {
      msg.innerText = next
      msg.classList.remove('is-out')
    }, 450)
  }

  const setBanner = () => {
    const banner = document.querySelector('.upgrade-banner')
    const { userAgent } = navigator
    const isScreenlyDevice = userAgent.includes('screenly-viewer')

    if (!isScreenlyDevice) {
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
    fetchWeather()
    setBanner()
    // Refresh weather from server every 2 hours
    refreshTimer = setTimeout(fetchWeather, 120 * 60 * 1000)
  }

  // Only auto-run in a real browser; under a test runner there is no document.
  if (typeof document !== 'undefined') {
    init()
  }

  // Expose pure helpers for unit tests. In the browser `module` is undefined,
  // so this is skipped and has no effect on the served script.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      resolveLocale,
      usesFahrenheit,
      setLocale,
      formatTime,
      formatDate,
      getTimeByOffset,
      getCondCategory
    }
  }
})()
