import { onBeforeUnmount, onMounted } from 'vue'
import { isDialogOpen, isEditableTarget } from '@/utils/keyboard'

/**
 * Runs `handler` when `matches` accepts a keydown anywhere on the page, except while typing in
 * a field or while a dialog is open.
 */
export function useHotkey(matches: (event: KeyboardEvent) => boolean, handler: () => void) {
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || isEditableTarget(event.target) || isDialogOpen()) return
    if (!matches(event)) return
    event.preventDefault()
    handler()
  }
  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
