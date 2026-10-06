import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Protects unsaved drawer edits.
 * - In-app navigation that switches or closes the open node (clicking another node, Cancel,
 *   Esc, back/forward, a typed URL) asks first and is cancelled if the user keeps editing.
 * - Reloading or closing the tab shows the browser's own "Leave site?" prompt.
 */
export function useUnsavedChanges(options: {
  isDirty: () => boolean
  /** Ask the user; resolves true to discard the changes. */
  confirm: () => Promise<boolean>
}) {
  const router = useRouter()
  let pending: Promise<boolean> | null = null
  let bypass = false

  /** Resolves true when there's nothing to lose or the user chose to discard. */
  async function confirmDiscard(): Promise<boolean> {
    if (!options.isDirty()) return true
    if (pending) return false // a prompt is already open: this attempt is dropped
    pending = options.confirm()
    try {
      return await pending
    } finally {
      pending = null
    }
  }

  /** Runs a navigation that must not ask, e.g. leaving a node that's being deleted. */
  async function withoutGuard<T>(navigate: () => Promise<T>): Promise<T> {
    bypass = true
    try {
      return await navigate()
    } finally {
      bypass = false
    }
  }

  const removeGuard = router.beforeEach((to, from) => {
    if (bypass || to.params.nodeId === from.params.nodeId) return true
    return confirmDiscard()
  })

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!options.isDirty()) return
    event.preventDefault()
    event.returnValue = '' // still required by some browsers to show the prompt
  }
  window.addEventListener('beforeunload', onBeforeUnload)

  onBeforeUnmount(() => {
    removeGuard()
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  return { confirmDiscard, withoutGuard }
}
