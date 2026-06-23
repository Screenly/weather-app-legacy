import { describe, expect, it } from 'bun:test'

// Unit tests for the client-side locale logic in assets/static/js/main.js.
// main.js is a browser IIFE that exposes its pure helpers via module.exports
// (and skips its browser-only init when there is no document), so a default
// import here resolves to that exports object.
import main from '../assets/static/js/main.js'

const {
  resolveLocale,
  usesFahrenheit,
  setLocale,
  formatTime,
  formatDate,
  getTimeByOffset,
  getCondCategory
} = main

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
