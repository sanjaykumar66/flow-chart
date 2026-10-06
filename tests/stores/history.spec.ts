import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  HISTORY_LIMIT,
  useHistoryStore,
  type HistoryEntry,
  type LayoutEntry,
  type MoveEntry,
} from '@/stores/history'

const idOf = (e?: HistoryEntry | null) => (e && 'nodeId' in e ? e.nodeId : undefined)

const move = (nodeId: string, x = 1): MoveEntry => ({
  kind: 'move',
  nodeId,
  label: `Move ${nodeId}`,
  from: null,
  to: { x, y: 0 },
  at: 0,
  keyboard: false,
})

describe('history store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts empty', () => {
    const history = useHistoryStore()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.takeUndo()).toBeNull()
    expect(history.takeRedo()).toBeNull()
  })

  it('undoes the latest change first and lets it be redone', () => {
    const history = useHistoryStore()
    history.record(move('a'))
    history.record(move('b'))
    expect(idOf(history.nextUndo)).toBe('b')

    expect(idOf(history.takeUndo())).toBe('b')
    expect(idOf(history.nextUndo)).toBe('a')
    expect(idOf(history.nextRedo)).toBe('b')

    expect(idOf(history.takeRedo())).toBe('b')
    expect(history.canRedo).toBe(false)
  })

  it('clears redo when a new change is recorded', () => {
    const history = useHistoryStore()
    history.record(move('a'))
    history.takeUndo()
    history.record(move('b'))
    expect(history.canRedo).toBe(false)
    expect(history.past.map(idOf)).toEqual(['b'])
  })

  it(`keeps only the last ${HISTORY_LIMIT} changes`, () => {
    const history = useHistoryStore()
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) history.record(move(`n${i}`))
    expect(history.past).toHaveLength(HISTORY_LIMIT)
    expect(idOf(history.past[0])).toBe('n5')
  })

  it('forgets entries for nodes that no longer exist', () => {
    const history = useHistoryStore()
    history.record(move('keep'))
    history.record(move('gone'))
    history.takeUndo()
    history.forgetNodes(['keep'])
    expect(history.past.map(idOf)).toEqual(['keep'])
    expect(history.future).toEqual([])
  })

  it('keeps layout resets, without positions of nodes that no longer exist', () => {
    const history = useHistoryStore()
    const reset: LayoutEntry = {
      kind: 'layout',
      label: 'Reset layout',
      before: { keep: { x: 1, y: 1 }, gone: { x: 2, y: 2 } },
    }
    history.record(reset)
    history.forgetNodes(['keep'])
    expect(history.past).toEqual([{ ...reset, before: { keep: { x: 1, y: 1 } } }])
  })

  it('replaces the latest change and clears redo', () => {
    const history = useHistoryStore()
    history.record(move('a'))
    history.record(move('b'))
    history.takeUndo()
    history.amendLast(move('a', 9))
    expect(history.past).toEqual([move('a', 9)])
    expect(history.canRedo).toBe(false)
  })

  it('records when there is nothing to replace', () => {
    const history = useHistoryStore()
    history.amendLast(move('a'))
    expect(history.past).toEqual([move('a')])
  })

  it('clears everything', () => {
    const history = useHistoryStore()
    history.record(move('a'))
    history.clear()
    expect(history.canUndo).toBe(false)
  })
})
