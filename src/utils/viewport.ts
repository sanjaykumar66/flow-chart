export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** Shift along one axis that brings [start, end] inside [min, max], or 0 if it already is. */
function shiftInto(start: number, end: number, min: number, max: number): number {
  if (end - start > max - min) return min - start // larger than the space: show its start
  if (start < min) return min - start
  if (end > max) return max - end
  return 0
}

/**
 * The viewport that makes a node fully visible with the smallest pan, keeping the zoom, or
 * `null` if it is already visible. `rect` is in flow coordinates; `container` is the canvas size
 * on screen; `rightInset` is the width covered by the drawer, treated as hidden.
 *
 * It pans only as far as needed (like scrolling an element into view) rather than centring the
 * node, so opening a step that's just under the drawer nudges the canvas instead of jumping.
 */
export function getRevealViewport(
  rect: Rect,
  viewport: Viewport,
  container: { width: number; height: number },
  rightInset = 0,
  margin = 24,
): Viewport | null {
  const { zoom } = viewport
  const left = rect.x * zoom + viewport.x
  const top = rect.y * zoom + viewport.y
  const right = left + rect.width * zoom
  const bottom = top + rect.height * zoom
  const visibleWidth = Math.max(container.width - rightInset, 0)

  const dx = shiftInto(left, right, margin, visibleWidth - margin)
  const dy = shiftInto(top, bottom, margin, container.height - margin)
  if (dx === 0 && dy === 0) return null
  return { x: viewport.x + dx, y: viewport.y + dy, zoom }
}
