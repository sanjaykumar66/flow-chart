import { describe, expect, it } from 'vitest'
import { getCenterTarget } from '@/utils/viewport'

const container = { width: 1000, height: 800 }
const card = { x: 100, y: 100, width: 240, height: 100 }

describe('getCenterTarget', () => {
  it('returns null when the node is already fully visible', () => {
    expect(getCenterTarget(card, { x: 0, y: 0, zoom: 1 }, container)).toBeNull()
  })

  it('centres a node that is off screen', () => {
    // panned so the card sits left of the screen
    expect(getCenterTarget(card, { x: -500, y: 0, zoom: 1 }, container)).toEqual({
      x: 220,
      y: 150,
    })
  })

  it('treats the area under the drawer as hidden', () => {
    const underDrawer = { x: 700, y: 100, width: 240, height: 100 }
    expect(getCenterTarget(underDrawer, { x: 0, y: 0, zoom: 1 }, container)).toBeNull()
    // with a 440px drawer, only 560px are visible
    expect(getCenterTarget(underDrawer, { x: 0, y: 0, zoom: 1 }, container, 440)).toEqual({
      x: 820 + 220, // node centre, shifted so it lands in the middle of the visible part
      y: 150,
    })
  })

  it('accounts for zoom', () => {
    const target = getCenterTarget(card, { x: 0, y: 0, zoom: 2 }, container, 400)
    // at 2× the card spans 200..680 on screen, past the visible 600px
    expect(target).toEqual({ x: 220 + 100, y: 150 })
  })

  it('requires a small margin from the edges', () => {
    const nearEdge = { x: 10, y: 100, width: 240, height: 100 }
    expect(getCenterTarget(nearEdge, { x: 0, y: 0, zoom: 1 }, container)).not.toBeNull()
  })
})
