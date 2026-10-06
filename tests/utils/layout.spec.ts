import { describe, expect, it } from 'vitest'
import { layoutTree, type LayoutNode } from '@/utils/layout'

const gap = { horizontal: 40, vertical: 60 }
const node = (id: string, parentId: string | null, width = 100, height = 50): LayoutNode => ({
  id,
  parentId,
  width,
  height,
})

describe('layoutTree', () => {
  it('stacks a chain vertically with the gap between nodes', () => {
    const positions = layoutTree([node('a', null), node('b', 'a'), node('c', 'b')], gap)
    expect(positions).toEqual({ a: { x: 0, y: 0 }, b: { x: 0, y: 110 }, c: { x: 0, y: 220 } })
  })

  it('centres a parent above its children', () => {
    const positions = layoutTree([node('root', null), node('l', 'root'), node('r', 'root')], gap)
    // children: 100 + 40 + 100 = 240 wide → root (100 wide) sits at x = 70
    expect(positions.l).toEqual({ x: 0, y: 110 })
    expect(positions.r).toEqual({ x: 140, y: 110 })
    expect(positions.root).toEqual({ x: 70, y: 0 })
  })

  it('gives each subtree enough room so branches never overlap', () => {
    const positions = layoutTree(
      [
        node('root', null),
        node('l', 'root'),
        node('r', 'root'),
        node('l1', 'l'),
        node('l2', 'l'),
        node('r1', 'r'),
      ],
      gap,
    )
    // left subtree is 240 wide, so the right branch starts after it
    expect(positions.r1!.x).toBeGreaterThanOrEqual(positions.l2!.x + 100 + gap.horizontal)
  })

  it('aligns centres of nodes with different widths', () => {
    const positions = layoutTree([node('card', null, 240, 100), node('pill', 'card', 80, 28)], gap)
    expect(positions.card!.x + 120).toBe(positions.pill!.x + 40)
  })

  it('treats nodes with a missing parent as extra roots, side by side', () => {
    const positions = layoutTree([node('a', null), node('orphan', 'gone')], gap)
    expect(positions.a).toEqual({ x: 0, y: 0 })
    expect(positions.orphan).toEqual({ x: 140, y: 0 })
  })

  it('does not loop forever on a cycle', () => {
    const positions = layoutTree([node('a', 'b'), node('b', 'a'), node('root', null)], gap)
    expect(positions.root).toBeDefined()
  })
})
