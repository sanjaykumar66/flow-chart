import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUpdateNode } from '@/queries/flow'
import { useCanvasStore } from '@/stores/canvas'
import { useHistoryStore, type HistoryEntry } from '@/stores/history'
import type { XYPosition } from '@/types/flow'
import { NUDGE_MERGE_WINDOW } from '@/constants/canvas'
import { isEditableTarget, isMac } from '@/utils/keyboard'
import { cloneNodeForm, type NodeFormValues } from '@/utils/nodeForm'

export { isMac }

/**
 * Undo/redo for node moves and edits.
 * Moves restore the previous position (or the auto-layout spot); edits save the previous
 * details back through the same mutation as the Save button, so storage stays in sync.
 * Keyboard: ⌘Z / Ctrl+Z to undo, ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y to redo.
 */
export function useUndoRedo(
  options: {
    onError?: (message: string) => void
    /** Called after an entry was applied, to tell the user what changed and where. */
    onApplied?: (entry: HistoryEntry, direction: 'undo' | 'redo') => void
    /** Called before an entry is applied; resolve false to leave the history untouched. */
    beforeApply?: (entry: HistoryEntry, direction: 'undo' | 'redo') => boolean | Promise<boolean>
  } = {},
) {
  const history = useHistoryStore()
  const canvas = useCanvasStore()
  const updateMutation = useUpdateNode()
  const { canUndo, canRedo, nextUndo, nextRedo } = storeToRefs(history)

  /**
   * `keyboard`: arrow-key moves of the same step in quick succession become one entry, so a
   * single undo puts the step back where the key presses started.
   */
  function recordMove(
    nodeId: string,
    label: string,
    from: XYPosition | null,
    to: XYPosition,
    { keyboard = false } = {},
  ) {
    if (from && from.x === to.x && from.y === to.y) return // a click, not a move
    const at = Date.now()
    const last = history.nextUndo
    if (
      keyboard &&
      last?.kind === 'move' &&
      last.keyboard &&
      last.nodeId === nodeId &&
      at - last.at < NUDGE_MERGE_WINDOW
    ) {
      history.amendLast({ ...last, to: { ...to }, at })
      return
    }
    history.record({
      kind: 'move',
      nodeId,
      label,
      from: from && { ...from },
      to: { ...to },
      at,
      keyboard,
    })
  }

  function recordEdit(
    nodeId: string,
    label: string,
    before: NodeFormValues,
    after: NodeFormValues,
  ) {
    history.record({
      kind: 'edit',
      nodeId,
      label,
      before: cloneNodeForm(before),
      after: cloneNodeForm(after),
    })
  }

  /** Every dragged node goes back to the auto-layout, as one undoable change. */
  function resetLayout() {
    if (!canvas.hasCustomLayout) return
    history.record({ kind: 'layout', label: 'Reset layout', before: { ...canvas.positions } })
    canvas.resetLayout()
  }

  async function apply(entry: HistoryEntry, direction: 'undo' | 'redo') {
    if (entry.kind === 'layout') {
      if (direction === 'undo') canvas.restorePositions(entry.before)
      else canvas.resetLayout()
      options.onApplied?.(entry, direction)
      return
    }
    if (entry.kind === 'move') {
      canvas.setPosition(entry.nodeId, direction === 'undo' ? entry.from : entry.to)
      options.onApplied?.(entry, direction)
      return
    }
    const values = direction === 'undo' ? entry.before : entry.after
    try {
      await updateMutation.mutateAsync({ id: entry.nodeId, values: cloneNodeForm(values) })
      options.onApplied?.(entry, direction)
    } catch (error) {
      // Couldn't apply: put the entry back where it was.
      if (direction === 'undo') history.takeRedo()
      else history.takeUndo()
      options.onError?.((error as Error).message)
    }
  }

  async function undo() {
    const next = history.nextUndo
    if (!next || (options.beforeApply && !(await options.beforeApply(next, 'undo')))) return
    const entry = history.takeUndo()
    if (entry) return apply(entry, 'undo')
  }

  async function redo() {
    const next = history.nextRedo
    if (!next || (options.beforeApply && !(await options.beforeApply(next, 'redo')))) return
    const entry = history.takeRedo()
    if (entry) return apply(entry, 'redo')
  }

  function onKeydown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return
    const mod = isMac() ? event.metaKey : event.ctrlKey
    if (!mod) return
    const key = event.key.toLowerCase()
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault()
      undo()
    } else if ((key === 'z' && event.shiftKey) || (key === 'y' && !isMac())) {
      event.preventDefault()
      redo()
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

  return {
    canUndo,
    canRedo,
    nextUndo,
    nextRedo,
    recordMove,
    recordEdit,
    resetLayout,
    undo,
    redo,
  }
}
