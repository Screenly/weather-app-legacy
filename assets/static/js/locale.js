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

// Recognizes real ISO-3166 regions. With fallback:'none' a known country yields
// its name, while unknown-but-well-formed codes (e.g. 'XX') yield undefined and
// malformed ones throw — the gate that keeps resolveLocale on its neutral
// fallback for junk/absent country codes from the edge.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })

// Default locale when the country is unknown. en-GB gives 24h time and
// neutral English month/day names (better for signage than the player's
// own device locale, which is effectively random).
const FALLBACK_LOCALE = 'en-GB'

// Right-to-left primary language subtags that a resolved locale may carry.
const rtlLanguages = ['ar', 'fa', 'he', 'ps', 'dv', 'ur', 'ckb', 'sd', 'yi']

// BCP-47 locale for the displayed location, plus cached Intl formatters.
let locale = 'en-GB'
// Explicit 12h/24h override from the ?24h launch setting: true forces a 12-hour
// clock, false forces 24-hour, undefined leaves the choice to the locale. This
// is the query param the signage-app manifest's "24h" setting drives.
let hour12Override
// Explicit BCP-47 locale from the ?locale launch setting. When set it wins over
// the displayed location's country-derived locale; undefined = auto-detect.
let localeOverride
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

// Country (ISO-3166 alpha-2) -> BCP-47 locale, via CLDR likely-subtags built
// into the engine (Intl.Locale.maximize), so there is no hand-maintained table:
// 'US' -> 'en-US', 'BR' -> 'pt-BR', 'HK' -> 'zh-HK'. The script subtag is
// dropped because the region re-derives its likely script (e.g. 'zh-TW' still
// renders Traditional). Unknown/absent/malformed codes get the neutral signage
// fallback rather than CLDR's world default.
export const resolveLocale = (code) => {
  try {
    if (!regionNames.of(code) || code === 'ZZ') return FALLBACK_LOCALE
    const max = new Intl.Locale(`und-${code}`).maximize()
    return `${max.language}-${max.region}`
  } catch {
    return FALLBACK_LOCALE
  }
}

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

const applyLocale = (loc) => {
  locale = loc
  buildFormatters()
  // The chrome is authored in English (LTR); only the city, date and time
  // render in the location's language. Tag just those elements with the right
  // lang/dir so assistive tech and RTL scripts (e.g. ar) are handled without
  // mirroring the whole LTR layout. Read `locale` after buildFormatters so a
  // fallback (malformed override) is reflected in the tag.
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

// Apply the ?locale launch setting (a BCP-47 tag, or '' to auto-detect). A set
// override wins over the country passed to setLocale; it is applied at once so
// formatting is correct before weather data arrives, and stays sticky across
// the later setLocale(country) rebuild.
export const setLocaleOverride = (value) => {
  localeOverride = value || undefined
  if (localeOverride) applyLocale(localeOverride)
}

export const setLocale = (code) => applyLocale(localeOverride || resolveLocale(code))

// ISO-3166 region subtag of a BCP-47 tag ('en-US' -> 'US', 'zh-Hant-TW' -> 'TW',
// 'ha-Latn-NG' -> 'NG'), or '' when the tag carries no region ('ar', 'fr') or is
// malformed. Uses the built-in Intl.Locale parser rather than a hand-rolled one.
export const regionOf = (tag) => {
  try {
    return new Intl.Locale(tag).region || ''
  } catch {
    return ''
  }
}

// The country whose unit convention (°C/°F) applies. A ?locale override that
// carries a region wins, so temperature units follow the chosen region; with no
// override (or a region-less one) units follow the displayed location's country.
export const unitsCountry = (locationCountry) =>
  (localeOverride && regionOf(localeOverride)) || locationCountry

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
