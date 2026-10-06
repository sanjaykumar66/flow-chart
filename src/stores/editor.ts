import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { InsertTarget } from '@/utils/treeOps'

/**
 * Editor UI state: the Create and Delete dialogs. (Which node is open lives in the URL,
 * the flow itself in the TanStack Query cache.)
 */
export const useEditorStore = defineStore('editor', () => {
  const createOpen = ref(false)
  /** The step the new one is added after ("Connect after"); highlighted on the canvas. */
  const createParentId = ref<string | null>(null)
  /** Set when started from a "+" on an edge: insert before this child if the parent is kept. */
  const createFromEdge = ref<InsertTarget | null>(null)

  const deleteOpen = ref(false)

  function startCreate(parentId: string | null, fromEdge: InsertTarget | null = null) {
    createParentId.value = parentId
    createFromEdge.value = fromEdge?.childId ? fromEdge : null
    createOpen.value = true
  }

  function closeCreate() {
    createOpen.value = false
  }

  /**
   * Where to insert for the chosen parent: between the edge's two steps if the user kept the
   * "+"'s parent, otherwise right after the chosen step.
   */
  function insertTargetFor(parentId: string): InsertTarget {
    const edge = createFromEdge.value
    return edge && edge.parentId === parentId ? edge : { parentId }
  }

  function openDelete() {
    deleteOpen.value = true
  }

  function closeDelete() {
    deleteOpen.value = false
  }

  return {
    createOpen,
    createParentId,
    createFromEdge,
    deleteOpen,
    startCreate,
    closeCreate,
    insertTargetFor,
    openDelete,
    closeDelete,
  }
})
