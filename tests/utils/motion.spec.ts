import { afterEach, describe, expect, it, vi } from 'vitest'
import { motionDuration, prefersReducedMotion } from '@/utils/motion'

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)

describe('motion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps animations by default', () => {
    mockReducedMotion(false)
    expect(prefersReducedMotion()).toBe(false)
    expect(motionDuration(300)).toBe(300)
  })

  it('skips animations when the user prefers reduced motion', () => {
    mockReducedMotion(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(motionDuration(300)).toBe(0)
  })
})
