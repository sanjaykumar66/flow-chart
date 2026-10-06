import type { XYPosition } from '@/types/flow'

export interface LayoutNode {
  id: string
  /** `null` for a root. Children are laid out in the order they appear in the input. */
  parentId: string | null
  width: number
  height: number
}

export interface LayoutGap {
  horizontal: number
  vertical: number
}

/**
 * Top-down tidy tree layout. Each node is centred above its children, siblings sit side by side,
 * and every subtree gets exactly the width it needs, so branches never overlap.
 * Returns the top-left position of every node. Multiple roots are placed left to right.
 */
export function layoutTree(nodes: LayoutNode[], gap: LayoutGap): Record<string, XYPosition> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<string, LayoutNode[]>()
  const roots: LayoutNode[] = []

  for (const node of nodes) {
    if (node.parentId !== null && byId.has(node.parentId) && node.parentId !== node.id) {
      const siblings = children.get(node.parentId) ?? []
      siblings.push(node)
      children.set(node.parentId, siblings)
    } else {
      roots.push(node)
    }
  }

  const widths = new Map<string, number>()
  const visiting = new Set<string>()

  function subtreeWidth(node: LayoutNode): number {
    const cached = widths.get(node.id)
    if (cached !== undefined) return cached
    if (visiting.has(node.id)) return node.width // cycle guard
    visiting.add(node.id)

    const kids = children.get(node.id) ?? []
    const kidsWidth = kids.reduce((sum, kid) => sum + subtreeWidth(kid), 0)
    const width = Math.max(node.width, kidsWidth + gap.horizontal * Math.max(kids.length - 1, 0))

    visiting.delete(node.id)
    widths.set(node.id, width)
    return width
  }

  const positions: Record<string, XYPosition> = {}

  function place(node: LayoutNode, left: number, top: number) {
    if (positions[node.id]) return // cycle guard
    const width = subtreeWidth(node)
    positions[node.id] = { x: left + (width - node.width) / 2, y: top }

    const kids = children.get(node.id) ?? []
    const kidsWidth =
      kids.reduce((sum, kid) => sum + subtreeWidth(kid), 0) +
      gap.horizontal * Math.max(kids.length - 1, 0)
    let childLeft = left + (width - kidsWidth) / 2
    const childTop = top + node.height + gap.vertical

    for (const kid of kids) {
      place(kid, childLeft, childTop)
      childLeft += subtreeWidth(kid) + gap.horizontal
    }
  }

  let rootLeft = 0
  for (const root of roots) {
    place(root, rootLeft, 0)
    rootLeft += subtreeWidth(root) + gap.horizontal
  }

  return positions
}
