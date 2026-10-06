import { describe, expect, it } from 'vitest'
import type { RawFlowNode } from '@/types/flow'
import { buildConnectTree, type ConnectTreeOption } from '@/utils/connectTree'
import { insertNode } from '@/utils/treeOps'
import { loadPayload } from '../fixtures/payload'

/** Compact view of the tree: label (+ "!" when disabled) and children. */
type Shape = string | [string, Shape[]]
function shape(options: ConnectTreeOption[]): Shape[] {
  return options.map((o) => {
    const label = o.disabled ? `${o.label}!` : o.label
    return o.children ? [label, shape(o.children)] : label
  })
}

describe('buildConnectTree', () => {
  it('mirrors the flow, with Success before Failure', () => {
    expect(shape(buildConnectTree(loadPayload()))).toEqual([
      [
        'Trigger',
        [
          [
            'Business Hours!',
            [
              ['Success', ['Welcome Message']],
              ['Failure', [['Away Message', ['Add Comment #1']]]],
            ],
          ],
        ],
      ],
    ])
  })

  it('disables Business Hours, since steps go under one of its branches', () => {
    const [trigger] = buildConnectTree(loadPayload())
    const businessHours = trigger!.children![0]!
    expect(businessHours).toMatchObject({ key: 'd09c08', disabled: true, kind: 'businessHours' })
    expect(businessHours.children!.map((c) => [c.kind, c.disabled])).toEqual([
      ['success', false],
      ['failure', false],
    ])
  })

  it('tells steps with the same title apart by their position', () => {
    const { nodes } = insertNode(
      loadPayload(),
      { title: 'Add Comment #1', description: '', type: 'addComment' },
      { parentId: 'b0653a' },
    )
    const tree = buildConnectTree(nodes)
    const success = tree[0]!.children![0]!.children![0]!
    const failure = tree[0]!.children![0]!.children![1]!
    expect(success.children![0]!.children![0]!.label).toBe('Add Comment #1')
    expect(failure.children![0]!.children![0]!.label).toBe('Add Comment #1')
    expect(success.children![0]!.children![0]!.key).not.toBe(
      failure.children![0]!.children![0]!.key,
    )
  })

  it('uses string ids as keys', () => {
    expect(buildConnectTree(loadPayload())[0]!.key).toBe('1')
  })

  it('lists nodes whose parent is missing as extra roots', () => {
    const nodes = loadPayload()
    ;(nodes.find((n) => n.id === 'e879e4') as RawFlowNode).parentId = 'gone'
    expect(buildConnectTree(nodes).map((o) => o.label)).toEqual(['Trigger', 'Add Comment #1'])
  })
})
