import { afterEach, describe, expect, it, vi } from 'vitest'
import { readJson, removeKey, writeJson } from '@/utils/storage'

describe('storage helpers', () => {
  afterEach(() => localStorage.clear())

  it('writes and reads JSON', () => {
    writeJson('k', { a: 1 })
    expect(readJson('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for missing or corrupted values', () => {
    expect(readJson('missing', 'fallback')).toBe('fallback')
    localStorage.setItem('bad', '{nope')
    expect(readJson('bad', 'fallback')).toBe('fallback')
  })

  it('removes a key', () => {
    writeJson('k', 1)
    removeKey('k')
    expect(localStorage.getItem('k')).toBeNull()
  })

  it('never throws when storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeJson('k', 1)).not.toThrow()
  })
})
