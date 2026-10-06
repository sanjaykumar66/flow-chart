import { afterEach, describe, expect, it } from 'vitest'
import { getTimezoneOptions, getUtcOffset } from '@/utils/timezone'

const JANUARY = new Date('2026-01-15T12:00:00Z')
const JULY = new Date('2026-07-15T12:00:00Z')

describe('getUtcOffset', () => {
  it('formats UTC as GMT+00:00', () => {
    expect(getUtcOffset('UTC', JANUARY)).toBe('GMT+00:00')
  })

  it('handles half-hour offsets', () => {
    expect(getUtcOffset('Asia/Kolkata', JANUARY)).toBe('GMT+05:30')
  })

  it('follows daylight saving time for the given date', () => {
    expect(getUtcOffset('America/New_York', JANUARY)).toBe('GMT-05:00')
    expect(getUtcOffset('America/New_York', JULY)).toBe('GMT-04:00')
  })
})

describe('getTimezoneOptions', () => {
  const originalSupportedValuesOf = Intl.supportedValuesOf

  afterEach(() => {
    Intl.supportedValuesOf = originalSupportedValuesOf
  })

  it('lists UTC first with an offset label', () => {
    const [first] = getTimezoneOptions(JANUARY)
    expect(first).toEqual({ value: 'UTC', label: '(GMT+00:00) UTC' })
  })

  it('labels zones with their offset and readable names', () => {
    const option = getTimezoneOptions(JANUARY).find((o) => o.value === 'America/New_York')
    expect(option?.label).toBe('(GMT-05:00) America/New York')
  })

  it('uses current names for zones the runtime reports under old names', () => {
    Intl.supportedValuesOf = () => ['Asia/Calcutta', 'Europe/Kiev', 'Asia/Kolkata']
    const values = getTimezoneOptions(JANUARY).map((o) => o.value)
    expect(values).toEqual(['UTC', 'Asia/Kolkata', 'Europe/Kyiv'])
  })

  it('falls back to UTC only when the runtime cannot list timezones', () => {
    // @ts-expect-error simulating an older runtime without Intl.supportedValuesOf
    Intl.supportedValuesOf = undefined
    expect(getTimezoneOptions(JANUARY)).toEqual([{ value: 'UTC', label: '(GMT+00:00) UTC' }])
  })
})
