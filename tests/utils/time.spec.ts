import { describe, expect, it } from 'vitest'
import { getTimeRangeError, isValidTime, toMinutes } from '@/utils/time'

describe('isValidTime', () => {
  it.each(['00:00', '09:00', '17:30', '23:59'])('accepts %s', (value) => {
    expect(isValidTime(value)).toBe(true)
  })

  it.each(['', '9:00', '24:00', '12:60', '12:5', 'ab:cd', '12:00:00'])('rejects %j', (value) => {
    expect(isValidTime(value)).toBe(false)
  })
})

describe('toMinutes', () => {
  it('converts HH:mm to minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('09:30')).toBe(570)
    expect(toMinutes('23:59')).toBe(1439)
  })
})

describe('getTimeRangeError', () => {
  it('returns null for a valid range', () => {
    expect(getTimeRangeError('09:00', '17:00')).toBeNull()
  })

  it('rejects a closing time that is not after the opening time', () => {
    expect(getTimeRangeError('18:00', '17:00')).toBe('Closing time must be after opening time')
    expect(getTimeRangeError('09:00', '09:00')).toBe('Closing time must be after opening time')
  })

  it('rejects missing or malformed times', () => {
    expect(getTimeRangeError('', '17:00')).toBe('Enter both an opening and closing time')
    expect(getTimeRangeError('09:00', '25:00')).toBe('Enter both an opening and closing time')
  })
})
