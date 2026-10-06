import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { POSITIONS_STORAGE_KEY, useCanvasStore } from '@/stores/canvas'

const saved = () => JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) ?? 'null')

describe('canvas store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with the auto-layout (no saved positions)', () => {
    const canvas = useCanvasStore()
    expect(canvas.positions).toEqual({})
    expect(canvas.hasCustomLayout).toBe(false)
  })

  it('remembers where a node was dragged and saves it', async () => {
    const canvas = useCanvasStore()
    canvas.moveNode('b6a0c1', { x: 120, y: 340 })
    expect(canvas.positions.b6a0c1).toEqual({ x: 120, y: 340 })
    expect(canvas.hasCustomLayout).toBe(true)
    await nextTick()
    expect(saved()).toEqual({ b6a0c1: { x: 120, y: 340 } })
  })

  it('restores saved positions on load', () => {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({ '1': { x: 5, y: 6 } }))
    expect(useCanvasStore().positions).toEqual({ '1': { x: 5, y: 6 } })
  })

  it('ignores corrupted or invalid saved data', () => {
    localStorage.setItem(POSITIONS_STORAGE_KEY, '{oops')
    expect(useCanvasStore().positions).toEqual({})

    setActivePinia(createPinia())
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({ a: { x: 1 }, b: { x: 1, y: 2 } }))
    expect(useCanvasStore().positions).toEqual({ b: { x: 1, y: 2 } })
  })

  it('forgets positions of deleted nodes', async () => {
    const canvas = useCanvasStore()
    canvas.moveNode('keep', { x: 1, y: 1 })
    canvas.moveNode('gone', { x: 2, y: 2 })
    canvas.prune(['keep', 'other'])
    expect(Object.keys(canvas.positions)).toEqual(['keep'])
    await nextTick()
    expect(saved()).toEqual({ keep: { x: 1, y: 1 } })
  })

  it('puts back a saved set of positions', async () => {
    const canvas = useCanvasStore()
    canvas.restorePositions({ a: { x: 1, y: 2 }, b: { x: 3, y: 4 } })
    await nextTick()
    expect(canvas.positions).toEqual({ a: { x: 1, y: 2 }, b: { x: 3, y: 4 } })
    expect(canvas.hasCustomLayout).toBe(true)
  })

  it('resets to the auto-layout and clears storage', async () => {
    const canvas = useCanvasStore()
    canvas.moveNode('1', { x: 1, y: 1 })
    await nextTick()
    canvas.resetLayout()
    await nextTick()
    expect(canvas.positions).toEqual({})
    expect(localStorage.getItem(POSITIONS_STORAGE_KEY)).toBeNull()
  })

  it('keeps working when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const canvas = useCanvasStore()
    canvas.moveNode('1', { x: 1, y: 1 })
    await nextTick()
    expect(canvas.positions['1']).toEqual({ x: 1, y: 1 })
  })
})
