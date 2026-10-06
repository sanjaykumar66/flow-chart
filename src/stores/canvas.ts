import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { XYPosition } from '@/types/flow'
import { readJson, removeKey, writeJson } from '@/utils/storage'

export const POSITIONS_STORAGE_KEY = 'flow-chart:positions'

function isPosition(value: unknown): value is XYPosition {
  const p = value as XYPosition
  return typeof p?.x === 'number' && typeof p?.y === 'number'
}

/**
 * Canvas view state that isn't part of the flow payload: where the user dragged nodes.
 * Nodes without a saved position use the auto-layout. Saved to localStorage so the layout
 * survives a reload.
 */
export const useCanvasStore = defineStore('canvas', () => {
  const saved = readJson<Record<string, unknown>>(POSITIONS_STORAGE_KEY, {})
  const positions = ref<Record<string, XYPosition>>(
    Object.fromEntries(Object.entries(saved ?? {}).filter(([, p]) => isPosition(p))) as Record<
      string,
      XYPosition
    >,
  )

  const hasCustomLayout = computed(() => Object.keys(positions.value).length > 0)

  function moveNode(id: string, position: XYPosition) {
    positions.value = { ...positions.value, [id]: { x: position.x, y: position.y } }
  }

  /** Set or clear (back to the auto-layout) one node's position; used by undo/redo. */
  function setPosition(id: string, position: XYPosition | null) {
    if (position) {
      moveNode(id, position)
    } else if (id in positions.value) {
      const rest = { ...positions.value }
      delete rest[id]
      positions.value = rest
    }
  }

  /** Drop positions of nodes that no longer exist (e.g. after a delete). */
  function prune(existingIds: Iterable<string>) {
    const keep = new Set(existingIds)
    const next = Object.fromEntries(Object.entries(positions.value).filter(([id]) => keep.has(id)))
    if (Object.keys(next).length !== Object.keys(positions.value).length) positions.value = next
  }

  /** Back to the auto-layout for every node. */
  function resetLayout() {
    positions.value = {}
  }

  /** Put back a whole set of positions, e.g. when a layout reset is undone. */
  function restorePositions(snapshot: Record<string, XYPosition>) {
    positions.value = Object.fromEntries(
      Object.entries(snapshot).map(([id, p]) => [id, { x: p.x, y: p.y }]),
    )
  }

  watch(positions, (value) => {
    if (Object.keys(value).length) writeJson(POSITIONS_STORAGE_KEY, value)
    else removeKey(POSITIONS_STORAGE_KEY)
  })

  return {
    positions,
    hasCustomLayout,
    moveNode,
    setPosition,
    prune,
    resetLayout,
    restorePositions,
  }
})
