import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { XYPosition } from '@/types/flow'
import type { NodeFormValues } from '@/utils/nodeForm'

/** A node dragged from `from` (null = auto-layout spot) to `to`. */
export interface MoveEntry {
  kind: 'move'
  nodeId: string
  label: string
  from: XYPosition | null
  to: XYPosition
  /** When it was recorded (ms), to merge quick arrow-key moves. */
  at: number
  /** Moved with the arrow keys rather than dragged. */
  keyboard: boolean
}

/** A node's details saved from `before` to `after`. */
export interface EditEntry {
  kind: 'edit'
  nodeId: string
  label: string
  before: NodeFormValues
  after: NodeFormValues
}

/** Every dragged node put back at its auto-layout spot; `before` holds where they were. */
export interface LayoutEntry {
  kind: 'layout'
  label: string
  before: Record<string, XYPosition>
}

/** Entries about a single node (everything except a layout reset). */
export type NodeEntry = MoveEntry | EditEntry

export type HistoryEntry = NodeEntry | LayoutEntry

export const HISTORY_LIMIT = 50

/**
 * Undo/redo stacks for node moves and edits (session only). Recording a new change clears
 * the redo stack, like any editor. Applying an entry is done by `useUndoRedo`.
 */
export const useHistoryStore = defineStore('history', () => {
  const past = ref<HistoryEntry[]>([])
  const future = ref<HistoryEntry[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const nextUndo = computed(() => past.value.at(-1) ?? null)
  const nextRedo = computed(() => future.value.at(-1) ?? null)

  function record(entry: HistoryEntry) {
    past.value = [...past.value, entry].slice(-HISTORY_LIMIT)
    future.value = []
  }

  /** Replaces the latest change, e.g. extending an arrow-key move. Clears redo like `record`. */
  function amendLast(entry: HistoryEntry) {
    if (past.value.length === 0) return record(entry)
    past.value = [...past.value.slice(0, -1), entry]
    future.value = []
  }

  /** Moves the latest change to the redo stack and returns it (to be reverted). */
  function takeUndo(): HistoryEntry | null {
    const entry = past.value.at(-1)
    if (!entry) return null
    past.value = past.value.slice(0, -1)
    future.value = [...future.value, entry]
    return entry
  }

  /** Moves the latest undone change back and returns it (to be re-applied). */
  function takeRedo(): HistoryEntry | null {
    const entry = future.value.at(-1)
    if (!entry) return null
    future.value = future.value.slice(0, -1)
    past.value = [...past.value, entry]
    return entry
  }

  /** Forget entries for nodes that no longer exist (they can't be applied any more). */
  function forgetNodes(existingIds: Iterable<string>) {
    const keep = new Set(existingIds)
    const forget = (entries: HistoryEntry[]) =>
      entries.flatMap((e): HistoryEntry[] => {
        if (e.kind !== 'layout') return keep.has(e.nodeId) ? [e] : []
        const before = Object.fromEntries(Object.entries(e.before).filter(([id]) => keep.has(id)))
        return [{ ...e, before }]
      })
    past.value = forget(past.value)
    future.value = forget(future.value)
  }

  function clear() {
    past.value = []
    future.value = []
  }

  return {
    past,
    future,
    canUndo,
    canRedo,
    nextUndo,
    nextRedo,
    record,
    amendLast,
    takeUndo,
    takeRedo,
    forgetNodes,
    clear,
  }
})
