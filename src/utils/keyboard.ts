export const isMac = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Typing in a field keeps the browser's own keys (text undo, "?" as a character, arrows). */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** How far an arrow key moves a step on the canvas: 10px, or 50px with Shift. */
export function getNudge(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>, step = 10, large = 50) {
  const distance = event.shiftKey ? large : step
  switch (event.key) {
    case 'ArrowUp':
      return { x: 0, y: -distance }
    case 'ArrowDown':
      return { x: 0, y: distance }
    case 'ArrowLeft':
      return { x: -distance, y: 0 }
    case 'ArrowRight':
      return { x: distance, y: 0 }
    default:
      return null
  }
}

/** A Naive modal or dialog is on screen (it owns Esc and the keyboard while open). */
export const isDialogOpen = () => document.querySelector('.n-modal-body-wrapper') !== null
