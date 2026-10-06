import { describe, expect, it } from 'vitest'
import { getRevealViewport } from '@/utils/viewport'

const container = { width: 1000, height: 800 }
const card = { x: 100, y: 100, width: 240, height: 100 }
const at = (x: number, y: number, zoom = 1) => ({ x, y, zoom })

describe('getRevealViewport', () => {
  it('returns null when the node is already fully visible', () => {
    expect(getRevealViewport(card, at(0, 0), container)).toBeNull()
  })

  it('pans only as far as needed, not to the centre', () => {
    // panned so the card (100..340) sits at -400..-160 on screen: bring it to the 24px margin
    expect(getRevealViewport(card, at(-500, 0), container)).toEqual(at(-76, 0))
  })

  it('moves along one axis only when the node is out of view on that axis', () => {
    const low = { x: 100, y: 750, width: 240, height: 100 } // bottom at 850 > 800 - 24
    expect(getRevealViewport(low, at(0, 0), container)).toEqual(at(0, -74))
  })

  it('treats the area under the drawer as hidden', () => {
    const underDrawer = { x: 500, y: 100, width: 240, height: 100 } // right edge at 740
    expect(getRevealViewport(underDrawer, at(0, 0), container)).toBeNull()
    // with a 440px drawer only 560px are visible: shift left so the right edge lands at 536
    expect(getRevealViewport(underDrawer, at(0, 0), container, 440)).toEqual(at(-204, 0))
  })

  it('accounts for zoom', () => {
    // at 2× the card spans 200..680 on screen, past the 576px usable with a 400px drawer
    expect(getRevealViewport(card, at(0, 0, 2), container, 400)).toEqual(at(-104, 0, 2))
  })

  it('shows the start of a node wider than the visible area', () => {
    const wide = { x: 100, y: 100, width: 900, height: 100 }
    expect(getRevealViewport(wide, at(0, 0), container, 440)).toEqual(at(-76, 0))
  })

  it('keeps a small margin from the edges', () => {
    const nearEdge = { x: 10, y: 100, width: 240, height: 100 }
    expect(getRevealViewport(nearEdge, at(0, 0), container)).toEqual(at(14, 0))
  })
})
