// Locale, formatting and pure weather helpers, extracted from main.js so they
// can be unit-tested with a real ES module import. main.js bundles this in at
// build time; keeping these here (and OUT of main.js's exports) is what lets
// main.js stay a plain self-executing browser script with no `export` token -
// see the build note in main.js / Layout.jsx.

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

export const celsiusToFahrenheit = (temp) => ((1.8 * temp) + 32)
export const usesFahrenheit = (code) => countriesUsingFahrenheit.includes(code)

const locales = JSON.parse('{"AF":"ps-AF","AL":"sq-AL","DZ":"ar-DZ","AS":"en-AS","AD":"ca","AO":"pt","AI":"en","AQ":"en-US","AG":"en","AR":"es-AR","AM":"hy-AM","AW":"nl","AU":"en-AU","AT":"de-AT","AZ":"az-Cyrl-AZ","BS":"en","BH":"ar-BH","BD":"bn-BD","BB":"en","BY":"be-BY","BE":"nl-BE","BZ":"en-BZ","BJ":"fr-BJ","BM":"en","BT":"dz","BO":"es-BO","BQ":"nl","BA":"bs-BA","BW":"en-BW","BV":"no","BR":"pt-BR","IO":"en","BN":"ms-BN","BG":"bg-BG","BF":"fr-BF","BI":"fr-BI","CV":"kea-CV","KH":"km-KH","CM":"fr-CM","CA":"en-CA","KY":"en","CF":"fr-CF","TD":"fr-TD","CL":"es-CL","CN":"zh-CN","CX":"en","CC":"en","CO":"es-CO","KM":"fr-KM","CD":"fr-CD","CG":"fr-CG","CK":"en","CR":"es-CR","HR":"hr-HR","CU":"es","CW":"nl","CY":"el-CY","CZ":"cs-CZ","CI":"fr-CI","DK":"da-DK","DJ":"fr-DJ","DM":"en","DO":"es-DO","EC":"es-EC","EG":"ar-EG","SV":"es-SV","GQ":"fr-GQ","ER":"ti-ER","EE":"et-EE","SZ":"en","ET":"am-ET","FK":"en","FO":"fo-FO","FJ":"en","FI":"fi-FI","FR":"fr-FR","GF":"fr","PF":"fr","TF":"fr","GA":"fr-GA","GM":"en","GE":"ka-GE","DE":"de-DE","GH":"ak-GH","GI":"en","GR":"el-GR","GL":"kl-GL","GD":"en","GP":"fr-GP","GU":"en-GU","GT":"es-GT","GG":"en","GN":"fr-GN","GW":"pt-GW","GY":"en","HT":"fr","HM":"en","VA":"it","HN":"es-HN","HK":"en-HK","HU":"hu-HU","IS":"is-IS","IN":"hi-IN","ID":"id-ID","IR":"fa-IR","IQ":"ar-IQ","IE":"en-IE","IM":"en","IL":"he-IL","IT":"it-IT","JM":"en-JM","JP":"ja-JP","JE":"en","JO":"ar-JO","KZ":"kk-Cyrl-KZ","KE":"ebu-KE","KI":"en","KP":"ko","KR":"ko-KR","KW":"ar-KW","KG":"ky","LA":"lo","LV":"lv-LV","LB":"ar-LB","LS":"en","LR":"en","LY":"ar-LY","LI":"de-LI","LT":"lt-LT","LU":"fr-LU","MO":"zh-Hans-MO","MG":"fr-MG","MW":"en","MY":"ms-MY","MV":"dv","ML":"fr-ML","MT":"en-MT","MH":"en-MH","MQ":"fr-MQ","MR":"ar","MU":"en-MU","YT":"fr","MX":"es-MX","FM":"en","MD":"ro-MD","MC":"fr-MC","MN":"mn","ME":"sr-Cyrl-ME","MS":"en","MA":"ar-MA","MZ":"pt-MZ","MM":"my-MM","NA":"en-NA","NR":"en","NP":"ne-NP","NL":"nl-NL","AN":"nl-AN","NC":"fr","NZ":"en-NZ","NI":"es-NI","NE":"fr-NE","NG":"ha-Latn-NG","NU":"en","NF":"en","MK":"mk-MK","MP":"en-MP","NO":"nb-NO","OM":"ar-OM","PK":"en-PK","PW":"en","PS":"ar","PA":"es-PA","PG":"en","PY":"es-PY","PE":"es-PE","PH":"en-PH","PN":"en","PL":"pl-PL","PT":"pt-PT","PR":"es-PR","QA":"ar-QA","RO":"ro-RO","RU":"ru-RU","RW":"fr-RW","RE":"fr-RE","BL":"fr-BL","SH":"en","KN":"en","LC":"en","MF":"fr-MF","PM":"fr","VC":"en","WS":"sm","SM":"it","ST":"pt","SA":"ar-SA","SN":"fr-SN","RS":"sr-Cyrl-RS","SC":"fr","SL":"en","SG":"en-SG","SX":"nl","SK":"sk-SK","SI":"sl-SI","SB":"en","SO":"so-SO","ZA":"af-ZA","GS":"en","SS":"en","ES":"es-ES","LK":"si-LK","SD":"ar-SD","SR":"nl","SJ":"no","SE":"sv-SE","CH":"fr-CH","SY":"ar-SY","TW":"zh-Hant-TW","TJ":"tg","TZ":"asa-TZ","TH":"th-TH","TL":"pt","TG":"fr-TG","TK":"en","TO":"to-TO","TT":"en-TT","TN":"ar-TN","TR":"tr-TR","TM":"tk","TC":"en","TV":"en","UG":"cgg-UG","UA":"uk-UA","AE":"ar-AE","GB":"en-GB","UM":"en-UM","US":"en-US","UY":"es-UY","UZ":"uz-Cyrl-UZ","VU":"bi","VE":"es-VE","VN":"vi-VN","VG":"en","VI":"en-VI","WF":"fr","EH":"es","YE":"ar-YE","ZM":"bem-ZM","ZW":"en-ZW","AX":"sv","XK":"sq"}')

// Default locale when the country is unknown. en-GB gives 24h time and
// neutral English month/day names (better for signage than the player's
// own device locale, which is effectively random).
const FALLBACK_LOCALE = 'en-GB'

// Right-to-left primary language subtags that appear in the locale map.
const rtlLanguages = ['ar', 'fa', 'he', 'ps', 'dv', 'ur', 'ckb', 'sd', 'yi']

// BCP-47 locale for the displayed location, plus cached Intl formatters.
let locale = 'en-GB'
// Explicit 12h/24h override from the ?24h launch setting: true forces a 12-hour
// clock, false forces 24-hour, undefined leaves the choice to the locale. This
// is the query param the signage-app manifest's "24h" setting drives.
let hour12Override
let timeFormatter
let dateFormatterLong
let dateFormatterShort

const buildFormatters = () => {
  // Pin the Gregorian calendar so the date always matches the (Gregorian)
  // forecast — otherwise locales like ar-SA would render a Hijri date.
  // Names, ordering and numerals stay localized.
  // Only pin hour12 when the ?24h setting forced it; otherwise omit it so Intl
  // keeps the location locale's own 12/24h convention.
  const h12 = hour12Override === undefined ? {} : { hour12: hour12Override }
  const timeOpts = { hour: 'numeric', minute: '2-digit', ...h12 }
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

export const resolveLocale = (code) => locales[code] || FALLBACK_LOCALE

// Map the ?24h launch setting to an hour12 override. The manifest's "24h" enum
// is "" (locale default), "0" (12-hour) and "1" (24-hour); any other value is
// treated as the default. Returns true for a forced 12h clock, false for a
// forced 24h clock, or undefined to defer to the locale.
export const resolveHour12 = (value) => {
  if (value === '1') return false
  if (value === '0') return true
  return undefined
}

// Apply the ?24h launch setting (see resolveHour12). Passing '' / undefined /
// any unrecognized value clears the override and restores the locale default.
export const setTimeFormat = (value) => {
  hour12Override = resolveHour12(value)
  buildFormatters()
}

export const setLocale = (code) => {
  locale = resolveLocale(code)
  buildFormatters()
  // The chrome is authored in English (LTR); only the city, date and time
  // render in the location's language. Tag just those elements with the right
  // lang/dir so assistive tech and RTL scripts (e.g. ar) are handled without
  // mirroring the whole LTR layout.
  if (typeof document !== 'undefined') {
    const dir = rtlLanguages.includes(locale.split('-')[0]) ? 'rtl' : 'ltr'
    for (const id of ['city', 'date', 'time']) {
      const el = document.querySelector(`#${id}`)
      if (el) {
        el.lang = locale
        el.dir = dir
      }
    }
  }
}

// Build defaults up front so the clock works even before any data arrives.
buildFormatters()

export const getTimeByOffset = (offsetinSecs, dt) => {
  const now = dt ? new Date(dt * 1000) : new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  return new Date(utc + (offsetinSecs * 1000))
}

// getTimeByOffset returns a Date whose *local-time* components already read
// as the location's wall clock, so the default-timezone Intl formatters
// (which read the same local components) render the correct local time/date.
export const formatTime = (dateObj) => timeFormatter.format(dateObj)

export const formatDate = (dateObj) => {
  const wide = typeof window === 'undefined' || window.innerWidth >= 480
  const formatter = wide ? dateFormatterLong : dateFormatterShort
  return formatter.format(dateObj)
}

// Simplified condition category used to drive the weather-reactive accent.
export const getCondCategory = (id) => {
  if (id >= 200 && id <= 299) return 'thunderstorm'
  if (id >= 300 && id <= 399) return 'drizzle'
  if (id >= 500 && id <= 599) return 'rain'
  if (id >= 600 && id <= 699) return 'snow'
  if (id >= 700 && id <= 799) return 'haze'
  if (id === 800) return 'clear'
  return 'clouds'
}
