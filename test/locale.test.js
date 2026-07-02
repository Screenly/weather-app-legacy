import { afterEach, describe, expect, it } from 'bun:test'

// Unit tests for the client-side locale logic in assets/static/js/locale.js.
// These pure helpers were extracted from main.js into their own ES module so
// they can be imported directly here, while main.js stays an export-free
// self-executing browser script (bundled with locale.js inlined).
import {
  resolveLocale,
  usesFahrenheit,
  setLocale,
  setTimeFormat,
  resolveHour12,
  formatTime,
  formatDate,
  getTimeByOffset,
  getCondCategory
} from '../assets/static/js/locale.js'

// Saturday 2026-06-20 13:30:00 UTC, as the unix seconds main.js works with.
const DT = Math.floor(Date.parse('2026-06-20T13:30:00Z') / 1000)

// formatTime(getTimeByOffset(...)) is independent of the machine timezone:
// getTimeByOffset and the default-timezone Intl formatter both read the same
// local components, so the two timezone dependencies cancel out.
const timeAt = (offsetHours) => formatTime(getTimeByOffset(offsetHours * 3600, DT))
const dateAt = (offsetHours) => formatDate(getTimeByOffset(offsetHours * 3600, DT))

describe('resolveLocale', () => {
  it('maps known country codes to their locale', () => {
    expect(resolveLocale('US')).toBe('en-US')
    expect(resolveLocale('FR')).toBe('fr-FR')
    expect(resolveLocale('JP')).toBe('ja-JP')
    expect(resolveLocale('PR')).toBe('es-PR')
  })

  it('falls back to en-GB for unknown / missing codes (#3)', () => {
    expect(resolveLocale('ZZ')).toBe('en-GB')
    expect(resolveLocale('')).toBe('en-GB')
    expect(resolveLocale(undefined)).toBe('en-GB')
  })
})

describe('usesFahrenheit (#2)', () => {
  it('flags the US and its territories', () => {
    for (const code of ['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM']) {
      expect(usesFahrenheit(code)).toBe(true)
    }
  })

  it('flags the other Fahrenheit countries', () => {
    for (const code of ['BS', 'KY', 'LR', 'PW', 'FM', 'MH']) {
      expect(usesFahrenheit(code)).toBe(true)
    }
  })

  it('uses Celsius elsewhere', () => {
    for (const code of ['FR', 'GB', 'DE', 'JP', 'ZZ']) {
      expect(usesFahrenheit(code)).toBe(false)
    }
  })
})

describe('time formatting (#1, #4)', () => {
  it('uses a 12-hour clock with AM/PM for en-US', () => {
    setLocale('US')
    expect(timeAt(-4)).toMatch(/^9:30(\s| )?AM$/i)
  })

  it('uses a 24-hour clock for en-GB, fr-FR, de-DE', () => {
    setLocale('GB')
    expect(timeAt(1)).toBe('14:30')
    setLocale('FR')
    expect(timeAt(2)).toBe('15:30')
    setLocale('DE')
    expect(timeAt(2)).toBe('15:30')
  })

  it('renders the location wall-clock from the timezone offset', () => {
    setLocale('JP')
    expect(timeAt(9)).toBe('22:30')
  })
})

describe('12h/24h override (?24h launch setting)', () => {
  // The override is sticky module state; clear it after each case so the other
  // tests keep seeing the location's locale default.
  afterEach(() => setTimeFormat(''))

  it('maps the 24h setting values to an hour12 override', () => {
    expect(resolveHour12('0')).toBe(true) // 12-hour
    expect(resolveHour12('1')).toBe(false) // 24-hour
    // Default / empty / unrecognized -> defer to the locale.
    expect(resolveHour12('')).toBeUndefined()
    expect(resolveHour12(null)).toBeUndefined()
    expect(resolveHour12(undefined)).toBeUndefined()
    expect(resolveHour12('yes')).toBeUndefined()
  })

  it('forces a 12-hour clock with AM/PM when ?24h=0, even for a 24h locale', () => {
    setLocale('GB') // en-GB is normally 24-hour
    setTimeFormat('0')
    expect(timeAt(1)).toMatch(/^2:30(\s| )?PM$/i) // 14:30 -> 2:30 PM
  })

  it('forces a 24-hour clock when ?24h=1, even for a 12h locale', () => {
    setLocale('US') // en-US is normally 12-hour
    setTimeFormat('1')
    const time = timeAt(-4) // 09:30
    expect(time).not.toMatch(/AM|PM/i)
    expect(time).toMatch(/^0?9:30$/)
  })

  it('an override survives a later setLocale() (sticky across rebuilds)', () => {
    setTimeFormat('1') // force 24h
    setLocale('US') // rebuilds formatters; must keep the 24h override
    expect(timeAt(-4)).not.toMatch(/AM|PM/i)
  })

  it('restores the locale default when the setting is empty', () => {
    setLocale('US')
    setTimeFormat('1') // force 24h
    expect(timeAt(-4)).not.toMatch(/AM|PM/i)
    setTimeFormat('') // back to locale default (12h for en-US)
    expect(timeAt(-4)).toMatch(/AM|PM/i)
  })
})

describe('date localization (#1)', () => {
  it('renders month names in the location language', () => {
    setLocale('US')
    expect(dateAt(-4)).toMatch(/Jun/)
    setLocale('FR')
    expect(dateAt(2)).toMatch(/juin/)
    setLocale('DE')
    expect(dateAt(2)).toMatch(/Juni/)
  })

  it('pins the Gregorian calendar even for ar-SA (not Hijri)', () => {
    setLocale('SA')
    const date = dateAt(3)
    // Gregorian day 20 (in Latin or Arabic-Indic digits, depending on ICU);
    // a Hijri rendering would show day 5 in Muharram instead.
    expect(date).toMatch(/20|٢٠/)
    expect(date).not.toMatch(/محرم/) // محرم (Muharram)
  })
})

describe('getCondCategory (weather-reactive accent)', () => {
  it('maps OpenWeather condition ids to categories', () => {
    expect(getCondCategory(211)).toBe('thunderstorm')
    expect(getCondCategory(301)).toBe('drizzle')
    expect(getCondCategory(500)).toBe('rain')
    expect(getCondCategory(601)).toBe('snow')
    expect(getCondCategory(741)).toBe('haze')
    expect(getCondCategory(800)).toBe('clear')
    expect(getCondCategory(802)).toBe('clouds')
  })
})
