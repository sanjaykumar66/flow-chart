import { describe, expect, it } from 'vitest'
import { NODE_TYPES } from '@/constants/nodeTypes'
import type { ActionNodeData, ConnectorNodeData, RawFlowNode } from '@/types/flow'
import {
  buildGraph,
  estimateCardHeight,
  findSelectableAncestor,
  findSelectableNode,
  fileNameFromUrl,
  getNodeDescription,
  getNodeTitle,
  humanize,
  normalizeId,
  normalizeParentId,
  toNodeType,
} from '@/utils/flowGraph'
import { loadPayload } from '../fixtures/payload'

const byId = (nodes: RawFlowNode[], id: string) =>
  nodes.find((node) => String(node.id) === id) as RawFlowNode

describe('ids', () => {
  it('normalises numeric ids to strings', () => {
    expect(normalizeId(1)).toBe('1')
    expect(normalizeId('b6a0c1')).toBe('b6a0c1')
  })

  it('treats -1 as "no parent"', () => {
    expect(normalizeParentId(-1)).toBeNull()
    expect(normalizeParentId(1)).toBe('1')
  })
})

describe('node helpers', () => {
  const nodes = loadPayload()

  it('maps payload types to card types', () => {
    expect(toNodeType(byId(nodes, '1'))).toBe('trigger')
    expect(toNodeType(byId(nodes, 'd09c08'))).toBe('businessHours')
    expect(toNodeType(byId(nodes, 'b6a0c1'))).toBe('sendMessage')
    expect(toNodeType(byId(nodes, 'e879e4'))).toBe('addComment')
    expect(toNodeType(byId(nodes, '161f52'))).toBeNull()
  })

  it('humanizes camelCase identifiers', () => {
    expect(humanize('conversationOpened')).toBe('Conversation Opened')
    expect(humanize('business_hours')).toBe('Business Hours')
  })

  it('extracts a file name from a URL', () => {
    expect(fileNameFromUrl('https://x.test/id/396/536/354.jpg?hmac=abc')).toBe('354.jpg')
    expect(fileNameFromUrl('data:image/png;base64,AAAA')).toBe('Uploaded image')
  })

  it('uses the name as title, falling back to the type label', () => {
    expect(getNodeTitle(byId(nodes, 'b6a0c1'))).toBe('Away Message')
    expect(getNodeTitle(byId(nodes, '1'))).toBe('Trigger')
  })

  it('summarises each node type as its description', () => {
    expect(getNodeDescription(byId(nodes, '1'))).toBe('Conversation Opened')
    expect(getNodeDescription(byId(nodes, 'd09c08'))).toBe('Business Hours - UTC')
    expect(getNodeDescription(byId(nodes, 'b0653a'))).toBe('Hello there\n\nwelcome to the chat!')
    expect(getNodeDescription(byId(nodes, 'e879e4'))).toBe('User message during off hours')
  })

  it('falls back to the attachment name for a message without text', () => {
    const node: RawFlowNode = {
      id: 'x',
      parentId: '1',
      type: 'sendMessage',
      data: { payload: [{ type: 'attachment', attachment: 'https://x.test/a/photo.png' }] },
    }
    expect(getNodeDescription(node)).toBe('photo.png')
  })

  it('prefers a description the user wrote', () => {
    const node = { ...byId(nodes, 'e879e4'), description: 'Flag for follow-up' }
    expect(getNodeDescription(node)).toBe('Flag for follow-up')
  })

  it('estimates card height from the description, up to three lines', () => {
    expect(estimateCardHeight('Short')).toBe(88)
    expect(estimateCardHeight('a\nb')).toBe(108)
    expect(estimateCardHeight('x'.repeat(500))).toBe(128)
  })
})

describe('buildGraph', () => {
  it('creates a node for every payload entry and an edge for every parent link', () => {
    const { nodes, edges } = buildGraph(loadPayload())
    expect(nodes).toHaveLength(7)
    expect(edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(
      [
        '1->d09c08',
        'd09c08->161f52',
        'd09c08->28c4b9',
        '161f52->b0653a',
        '28c4b9->b6a0c1',
        'b6a0c1->e879e4',
      ].sort(),
    )
  })

  it('renders Success/Failure as display-only connector nodes', () => {
    const { nodes } = buildGraph(loadPayload())
    const success = nodes.find((n) => n.id === '161f52')!
    expect(success.type).toBe('connector')
    expect(success.selectable).toBe(false)
    expect((success.data as ConnectorNodeData).connectorType).toBe('success')
  })

  it('fills card data for action nodes', () => {
    const { nodes } = buildGraph(loadPayload())
    const away = nodes.find((n) => n.id === 'b6a0c1')!
    expect(away.type).toBe('action')
    expect(away.data).toMatchObject({
      nodeType: 'sendMessage',
      title: 'Away Message',
      color: NODE_TYPES.sendMessage.color,
      selected: false,
      isLeaf: false,
    })
  })

  it('marks leaves and the selected node', () => {
    const { nodes } = buildGraph(loadPayload(), { selectedId: 'e879e4' })
    const data = (id: string) => nodes.find((n) => n.id === id)!.data as ActionNodeData
    expect(data('e879e4')).toMatchObject({ isLeaf: true, selected: true })
    expect(data('b0653a').isLeaf).toBe(true)
    expect(data('1')).toMatchObject({ isLeaf: false, selected: false })
  })

  it('offers a "+" above each step that can have one inserted before it', () => {
    const { nodes } = buildGraph(loadPayload())
    const insertAfter = (id: string) =>
      (nodes.find((n) => n.id === id)!.data as ActionNodeData).insertAfter
    expect(insertAfter('1')).toBeNull() // the trigger has nothing above it
    expect(insertAfter('d09c08')).toEqual({
      id: '1',
      title: 'Trigger',
      color: NODE_TYPES.trigger.color,
    })
    expect(insertAfter('b0653a')).toEqual({
      id: '161f52',
      title: 'Success',
      color: NODE_TYPES.businessHours.color,
    })
  })

  it('lists steps top-down, branch by branch (keyboard reading order)', () => {
    const { nodes } = buildGraph(loadPayload())
    expect(nodes.map((n) => n.id)).toEqual([
      '1',
      'd09c08',
      '161f52',
      'b0653a',
      '28c4b9',
      'b6a0c1',
      'e879e4',
    ])
  })

  it('names edges by the steps they join, for screen readers', () => {
    const { edges } = buildGraph(loadPayload())
    const label = (id: string) => edges.find((e) => e.id === id)!.ariaLabel
    expect(label('e-1-d09c08')).toBe('Trigger to Business Hours')
    expect(label('e-d09c08-28c4b9')).toBe('Business Hours to Failure')
  })

  it('colours edges by the step they leave, branches keep Business Hours colour', () => {
    const { edges } = buildGraph(loadPayload())
    const color = (id: string) => edges.find((e) => e.id === id)!.data!.color
    expect(color('e-1-d09c08')).toBe(NODE_TYPES.trigger.color)
    expect(color('e-161f52-b0653a')).toBe(NODE_TYPES.businessHours.color)
    expect(color('e-b6a0c1-e879e4')).toBe(NODE_TYPES.sendMessage.color)
  })

  it('lays out Success left of Failure, centred under Business Hours', () => {
    const { nodes } = buildGraph(loadPayload())
    const pos = (id: string) => nodes.find((n) => n.id === id)!.position
    expect(pos('161f52').x).toBeLessThan(pos('28c4b9').x)
    expect(pos('d09c08').y).toBeGreaterThan(pos('1').y)
    // Business Hours (240 wide) centred between the two pills (80 wide)
    expect(pos('d09c08').x + 120).toBe((pos('161f52').x + 40 + pos('28c4b9').x + 40) / 2)
  })

  it('keeps positions the user dragged nodes to', () => {
    const { nodes } = buildGraph(loadPayload(), { positions: { b6a0c1: { x: 999, y: 42 } } })
    expect(nodes.find((n) => n.id === 'b6a0c1')!.position).toEqual({ x: 999, y: 42 })
  })

  it('skips edges whose parent does not exist', () => {
    const nodes = loadPayload()
    byId(nodes, 'e879e4').parentId = 'missing'
    expect(buildGraph(nodes).edges.some((e) => e.target === 'e879e4')).toBe(false)
  })
})

describe('findSelectableAncestor', () => {
  const nodes = loadPayload()

  it('finds the step directly above', () => {
    expect(findSelectableAncestor(nodes, 'e879e4')).toBe('b6a0c1')
    expect(findSelectableAncestor(nodes, 'd09c08')).toBe('1')
  })

  it('skips Success/Failure labels to reach the step that branches', () => {
    expect(findSelectableAncestor(nodes, 'b0653a')).toBe('d09c08')
  })

  it('has nothing above the trigger or an unknown step', () => {
    expect(findSelectableAncestor(nodes, '1')).toBeUndefined()
    expect(findSelectableAncestor(nodes, 'nope')).toBeUndefined()
  })

  it('stops on a missing parent or a cycle', () => {
    const orphan = nodes.map((n) => (n.id === 'b6a0c1' ? { ...n, parentId: 'gone' } : n))
    expect(findSelectableAncestor(orphan, 'b6a0c1')).toBeUndefined()
    const loop = nodes.map((n) =>
      n.id === '161f52'
        ? { ...n, parentId: '28c4b9' }
        : n.id === '28c4b9'
          ? { ...n, parentId: '161f52' }
          : n,
    )
    expect(findSelectableAncestor(loop, 'b0653a')).toBeUndefined()
  })
})

describe('findSelectableNode', () => {
  const nodes = loadPayload()

  it('finds action nodes by id', () => {
    expect(findSelectableNode(nodes, 'd09c08')?.name).toBe('Business Hours')
    expect(findSelectableNode(nodes, '1')?.type).toBe('trigger')
  })

  it('refuses Success/Failure connectors, unknown ids and empty ids', () => {
    expect(findSelectableNode(nodes, '161f52')).toBeUndefined()
    expect(findSelectableNode(nodes, 'nope')).toBeUndefined()
    expect(findSelectableNode(nodes, null)).toBeUndefined()
  })
})

describe('empty branches', () => {
  it('marks a Success/Failure label with no steps under it as a leaf', () => {
    const nodes = loadPayload().filter((n) => n.id !== 'b0653a') // empty the Success branch
    const graph = buildGraph(nodes)
    const data = (id: string) => graph.nodes.find((n) => n.id === id)!.data as ConnectorNodeData
    expect(data('161f52').isLeaf).toBe(true)
    expect(data('28c4b9').isLeaf).toBe(false)
  })
})

describe('highlighting', () => {
  it('marks only the highlighted node, card or branch label', () => {
    const graph = buildGraph(loadPayload(), { highlightedId: '28c4b9' })
    const highlighted = graph.nodes.filter((n) => (n.data as { highlighted: boolean }).highlighted)
    expect(highlighted.map((n) => n.id)).toEqual(['28c4b9'])
  })
})
