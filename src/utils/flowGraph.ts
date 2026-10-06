import type { Edge, Node } from '@vue-flow/core'
import {
  ACTION_NODE_SIZE,
  CONNECTOR_NODE_SIZE,
  DESCRIPTION_CHARS_PER_LINE,
  LAYOUT_GAP,
  ROOT_PARENT_ID,
} from '@/constants/canvas'
import { NODE_TYPES } from '@/constants/nodeTypes'
import type {
  ActionNodeData,
  LinkEdgeData,
  ConnectorNodeData,
  NodeType,
  RawFlowNode,
  RawNodeId,
  XYPosition,
} from '@/types/flow'
import { layoutTree } from './layout'

/** Payload ids mix numbers and strings; the app always uses strings. */
export function normalizeId(id: RawNodeId): string {
  return String(id)
}

/** Parent id as a string, or `null` for the root (`-1`). */
export function normalizeParentId(parentId: RawNodeId): string | null {
  const id = normalizeId(parentId)
  return id === ROOT_PARENT_ID ? null : id
}

export function isConnector(node: RawFlowNode): boolean {
  return node.type === 'dateTimeConnector'
}

/** Maps a payload type to the card type shown on the canvas (`null` for Success/Failure). */
export function toNodeType(node: RawFlowNode): NodeType | null {
  switch (node.type) {
    case 'trigger':
    case 'sendMessage':
    case 'addComment':
      return node.type
    case 'dateTime':
      return 'businessHours'
    case 'dateTimeConnector':
      return null
  }
}

/** `conversationOpened` → `Conversation Opened` */
export function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

/** Last path segment of a URL, without query string: `…/354.jpg?hmac=…` → `354.jpg`. */
export function fileNameFromUrl(url: string): string {
  if (url.startsWith('data:')) return 'Uploaded image'
  const path = url.split(/[?#]/)[0] ?? ''
  return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? url)
}

/** Card title: the node's name, or its type label. */
export function getNodeTitle(node: RawFlowNode): string {
  if (node.name?.trim()) return node.name
  const type = toNodeType(node)
  return type ? NODE_TYPES[type].label : humanize(node.type)
}

/** Card description: the node's own description, or a summary of its content. */
export function getNodeDescription(node: RawFlowNode): string {
  if (node.description?.trim()) return node.description
  switch (node.type) {
    case 'trigger':
      return humanize(node.data.type)
    case 'sendMessage': {
      const text = node.data.payload.find((part) => part.type === 'text')
      if (text?.type === 'text') return text.text
      const attachment = node.data.payload.find((part) => part.type === 'attachment')
      return attachment?.type === 'attachment' ? fileNameFromUrl(attachment.attachment) : ''
    }
    case 'addComment':
      return node.data.comment
    case 'dateTime':
      return `Business Hours - ${node.data.timezone}`
    case 'dateTimeConnector':
      return ''
  }
}

/** Estimated rendered height of a card, so vertical gaps stay even without measuring the DOM. */
export function estimateCardHeight(description: string): number {
  const { baseHeight, lineHeight, maxLines } = ACTION_NODE_SIZE
  const lines = description
    .split('\n')
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / DESCRIPTION_CHARS_PER_LINE)),
      0,
    )
  return baseHeight + lineHeight * Math.min(Math.max(lines, 1), maxLines)
}

/**
 * Orders nodes so each parent's children follow a stable order: Business Hours branches follow
 * its `connectors` list (Success before Failure); everything else keeps payload order.
 */
function orderNodes(nodes: RawFlowNode[]): RawFlowNode[] {
  const connectorOrder = new Map<string, number>()
  for (const node of nodes) {
    if (node.type === 'dateTime') {
      node.data.connectors.forEach((id, index) => connectorOrder.set(normalizeId(id), index))
    }
  }
  return nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => {
      const ai = connectorOrder.get(normalizeId(a.node.id))
      const bi = connectorOrder.get(normalizeId(b.node.id))
      return ai !== undefined && bi !== undefined ? ai - bi : a.index - b.index
    })
    .map(({ node }) => node)
}

/** Depth-first (parent, then each child's branch in turn), for a reading order that follows the flow. */
function treeOrder(nodes: RawFlowNode[]): RawFlowNode[] {
  const ids = new Set(nodes.map((node) => normalizeId(node.id)))
  const children = new Map<string | null, RawFlowNode[]>()
  for (const node of nodes) {
    const parentId = normalizeParentId(node.parentId)
    const key = parentId && ids.has(parentId) ? parentId : null
    children.set(key, [...(children.get(key) ?? []), node])
  }
  const result: RawFlowNode[] = []
  const visit = (parentId: string | null) => {
    for (const node of children.get(parentId) ?? []) {
      result.push(node)
      visit(normalizeId(node.id))
    }
  }
  visit(null)
  return result
}

/** A node's name as shown on the canvas (Success/Failure for connectors). */
function labelOf(node: RawFlowNode): string {
  if (node.type === 'dateTimeConnector') return humanize(node.data.connectorType)
  return getNodeTitle(node)
}

export interface BuildGraphOptions {
  /** Positions the user dragged nodes to; they override the auto-layout. */
  positions?: Record<string, XYPosition>
  /** Id of the node to highlight: the one whose details are open, or the chosen insert point. */
  selectedId?: string | null
  /** Id of a node to emphasise briefly (after undo/redo). */
  highlightedId?: string | null
}

export interface FlowGraph {
  nodes: Node<ActionNodeData | ConnectorNodeData>[]
  edges: Edge<LinkEdgeData>[]
}

/** Turns payload nodes into positioned Vue Flow nodes and edges. */
export function buildGraph(rawNodes: RawFlowNode[], options: BuildGraphOptions = {}): FlowGraph {
  const { positions = {}, selectedId = null, highlightedId = null } = options
  const ordered = orderNodes(rawNodes)
  const ids = new Set(ordered.map((node) => normalizeId(node.id)))
  const byId = new Map(ordered.map((node) => [normalizeId(node.id), node]))
  const parentIds = new Set(
    ordered.map((node) => normalizeParentId(node.parentId)).filter((id): id is string => !!id),
  )

  const layout = layoutTree(
    ordered.map((node) => ({
      id: normalizeId(node.id),
      parentId: normalizeParentId(node.parentId),
      ...(isConnector(node)
        ? CONNECTOR_NODE_SIZE
        : { width: ACTION_NODE_SIZE.width, height: estimateCardHeight(getNodeDescription(node)) }),
    })),
    LAYOUT_GAP,
  )

  // Edge colour follows the step it leaves; Success/Failure branches keep Business Hours' colour.
  function edgeColor(node: RawFlowNode | undefined): string {
    if (!node) return '#71717a'
    if (node.type === 'dateTimeConnector') {
      const parent = byId.get(normalizeParentId(node.parentId) ?? '')
      return parent ? edgeColor(parent) : NODE_TYPES.businessHours.color
    }
    const type = toNodeType(node)
    return type ? NODE_TYPES[type].color : '#71717a'
  }

  // Steps are listed top-down, branch by branch, so keyboard Tab order follows the flow.
  const nodes: FlowGraph['nodes'] = treeOrder(ordered).map((node) => {
    const id = normalizeId(node.id)
    const position = positions[id] ?? layout[id] ?? { x: 0, y: 0 }

    if (node.type === 'dateTimeConnector') {
      return {
        id,
        type: 'connector',
        position,
        selectable: false,
        focusable: false,
        data: {
          connectorType: node.data.connectorType,
          isLeaf: !parentIds.has(id),
          selected: id === selectedId,
          highlighted: id === highlightedId,
        },
      }
    }

    const nodeType = toNodeType(node) as NodeType
    const parentId = normalizeParentId(node.parentId)
    const parent = parentId ? byId.get(parentId) : undefined
    return {
      id,
      type: 'action',
      position,
      selectable: false,
      focusable: false,
      data: {
        nodeType,
        title: getNodeTitle(node),
        description: getNodeDescription(node),
        color: NODE_TYPES[nodeType].color,
        selected: id === selectedId,
        highlighted: id === highlightedId,
        isLeaf: !parentIds.has(id),
        // Business Hours always branches into Success/Failure, so nothing can go in between.
        insertAfter:
          parent && parent.type !== 'dateTime'
            ? { id: normalizeId(parent.id), title: labelOf(parent), color: edgeColor(parent) }
            : null,
      },
    }
  })

  const edges: FlowGraph['edges'] = ordered.flatMap((node) => {
    const source = normalizeParentId(node.parentId)
    if (!source || !ids.has(source)) return []
    const target = normalizeId(node.id)
    const parent = byId.get(source)
    return [
      {
        id: `e-${source}-${target}`,
        source,
        target,
        type: 'link',
        // Read out by screen readers instead of Vue Flow's "Edge from <id> to <id>".
        ariaLabel: `${parent ? labelOf(parent) : source} to ${labelOf(node)}`,
        data: { color: edgeColor(parent) },
      },
    ]
  })

  return { nodes, edges }
}

/**
 * The nearest step above `id` whose details can be opened (skipping Success/Failure labels),
 * e.g. where keyboard focus goes after `id` is deleted. `undefined` at the top of the flow.
 */
export function findSelectableAncestor(nodes: RawFlowNode[], id: string): string | undefined {
  const byId = new Map(nodes.map((node) => [normalizeId(node.id), node]))
  const seen = new Set<string>()
  let parentId = normalizeParentId(byId.get(id)?.parentId ?? -1)
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) return undefined
    if (!isConnector(parent)) return parentId
    parentId = normalizeParentId(parent.parentId)
  }
  return undefined
}

/**
 * The node with this id if its details can be opened, otherwise `undefined`
 * (unknown ids and Success/Failure connectors are not openable).
 */
export function findSelectableNode(
  nodes: RawFlowNode[],
  id: string | null | undefined,
): RawFlowNode | undefined {
  if (!id) return undefined
  const node = nodes.find((n) => normalizeId(n.id) === id)
  return node && !isConnector(node) ? node : undefined
}
