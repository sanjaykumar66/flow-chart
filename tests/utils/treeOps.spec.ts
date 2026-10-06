import { describe, expect, it } from 'vitest'
import type { RawFlowNode } from '@/types/flow'
import { normalizeId, normalizeParentId } from '@/utils/flowGraph'
import { emptyNodeForm, toNodeForm } from '@/utils/nodeForm'
import {
  deleteNode,
  FlowOperationError,
  generateNodeId,
  insertNode,
  updateNode,
} from '@/utils/treeOps'
import { loadPayload } from '../fixtures/payload'

const find = (nodes: RawFlowNode[], id: string) => nodes.find((n) => normalizeId(n.id) === id)
const parentOf = (nodes: RawFlowNode[], id: string) => normalizeParentId(find(nodes, id)!.parentId)
const comment = { title: 'Note', description: '', type: 'addComment' as const }

describe('generateNodeId', () => {
  it('creates 6-character hex ids that are not taken', () => {
    const id = generateNodeId(['b6a0c1'])
    expect(id).toMatch(/^[0-9a-f]{6}$/)
    expect(id).not.toBe('b6a0c1')
  })
})

describe('insertNode', () => {
  it('appends after a leaf', () => {
    const before = loadPayload()
    const { nodes, id } = insertNode(before, comment, { parentId: 'e879e4' })
    expect(nodes).toHaveLength(before.length + 1)
    expect(parentOf(nodes, id)).toBe('e879e4')
    expect(find(nodes, id)).toMatchObject({ type: 'addComment', name: 'Note' })
  })

  it('inserts between a parent and a child on an edge', () => {
    const { nodes, id } = insertNode(loadPayload(), comment, {
      parentId: 'b6a0c1',
      childId: 'e879e4',
    })
    expect(parentOf(nodes, id)).toBe('b6a0c1')
    expect(parentOf(nodes, 'e879e4')).toBe(id)
  })

  it('pushes existing children down when inserting after a step', () => {
    const { nodes, id } = insertNode(loadPayload(), comment, { parentId: '1' })
    expect(parentOf(nodes, id)).toBe('1')
    expect(parentOf(nodes, 'd09c08')).toBe(id)
  })

  it('creates Success and Failure branches for a new Business Hours step', () => {
    const { nodes, id } = insertNode(
      loadPayload(),
      { title: 'Weekend hours', description: 'Sat-Sun', type: 'businessHours' },
      { parentId: 'e879e4' },
    )
    const bh = find(nodes, id)!
    expect(bh.type).toBe('dateTime')
    expect(bh.description).toBe('Sat-Sun')
    const branches = nodes.filter((n) => normalizeParentId(n.parentId) === id)
    expect(branches.map((n) => n.type === 'dateTimeConnector' && n.data.connectorType)).toEqual([
      'success',
      'failure',
    ])
    expect(bh.type === 'dateTime' && bh.data.connectors.map(String)).toEqual(
      branches.map((n) => normalizeId(n.id)),
    )
    expect(bh.type === 'dateTime' && bh.data.times).toHaveLength(7)
  })

  it('moves pushed-down steps under the new Business Hours Success branch', () => {
    const { nodes, id } = insertNode(
      loadPayload(),
      { title: 'Hours', description: '', type: 'businessHours' },
      { parentId: 'b6a0c1', childId: 'e879e4' },
    )
    const bh = find(nodes, id)!
    const successId = bh.type === 'dateTime' ? normalizeId(bh.data.connectors[0]!) : ''
    expect(parentOf(nodes, 'e879e4')).toBe(successId)
  })

  it('refuses to insert directly after Business Hours', () => {
    expect(() => insertNode(loadPayload(), comment, { parentId: 'd09c08' })).toThrow(
      FlowOperationError,
    )
  })

  it('refuses a child that does not belong to the parent', () => {
    expect(() => insertNode(loadPayload(), comment, { parentId: '1', childId: 'e879e4' })).toThrow(
      FlowOperationError,
    )
  })

  it('does not mutate the input', () => {
    const before = loadPayload()
    const snapshot = structuredClone(before)
    insertNode(before, comment, { parentId: '1' })
    expect(before).toEqual(snapshot)
  })
})

describe('deleteNode', () => {
  it('reconnects children to the deleted step’s parent', () => {
    const nodes = deleteNode(loadPayload(), 'b6a0c1')
    expect(find(nodes, 'b6a0c1')).toBeUndefined()
    expect(parentOf(nodes, 'e879e4')).toBe('28c4b9')
  })

  it('removes Business Hours with its branches and everything under them', () => {
    const nodes = deleteNode(loadPayload(), 'd09c08')
    expect(nodes.map((n) => normalizeId(n.id))).toEqual(['1'])
  })

  it.each([
    ['the trigger', '1'],
    ['a Success branch', '161f52'],
    ['an unknown node', 'nope'],
  ])('refuses to delete %s', (_, id) => {
    expect(() => deleteNode(loadPayload(), id)).toThrow(FlowOperationError)
  })
})

describe('updateNode', () => {
  it('saves title, description, texts and attachments of a message', () => {
    const before = loadPayload()
    const form = {
      ...toNodeForm(find(before, 'b0653a')!),
      title: 'Hi',
      description: 'Greeting',
      texts: ['One', 'Two'],
      attachments: ['data:image/png;base64,AA'],
    }
    const node = find(updateNode(before, 'b0653a', form), 'b0653a')!
    expect(node).toMatchObject({ name: 'Hi', description: 'Greeting' })
    expect(node.type === 'sendMessage' && node.data.payload).toEqual([
      { type: 'text', text: 'One' },
      { type: 'text', text: 'Two' },
      { type: 'attachment', attachment: 'data:image/png;base64,AA' },
    ])
  })

  it('saves a comment and drops an empty description', () => {
    const before = loadPayload()
    const form = { ...emptyNodeForm(), title: 'Note', description: '  ', comment: 'Updated' }
    const node = find(updateNode(before, 'e879e4', form), 'e879e4')!
    expect(node.type === 'addComment' && node.data.comment).toBe('Updated')
    expect(node).not.toHaveProperty('description')
  })

  it('saves business hours and timezone, keeping its branches', () => {
    const before = loadPayload()
    const form = toNodeForm(find(before, 'd09c08')!)
    form.times[0]!.endTime = '18:00'
    form.timezone = 'Asia/Kolkata'
    const node = find(updateNode(before, 'd09c08', form), 'd09c08')!
    expect(node.type === 'dateTime' && node.data).toMatchObject({
      timezone: 'Asia/Kolkata',
      connectors: ['161f52', '28c4b9'],
    })
    expect(node.type === 'dateTime' && node.data.times[0]!.endTime).toBe('18:00')
  })

  it('refuses to edit a Success/Failure branch', () => {
    expect(() => updateNode(loadPayload(), '161f52', emptyNodeForm())).toThrow(
      "Success and Failure branches can't be edited",
    )
  })

  it('reports an unknown step', () => {
    expect(() => updateNode(loadPayload(), 'nope', emptyNodeForm())).toThrow('Node nope not found')
  })

  it('lets the trigger be renamed without touching its event', () => {
    const node = find(updateNode(loadPayload(), '1', { ...emptyNodeForm(), title: 'Start' }), '1')!
    expect(node).toMatchObject({ name: 'Start', data: { type: 'conversationOpened' } })
  })
})
