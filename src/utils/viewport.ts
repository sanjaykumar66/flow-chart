import type { XYPosition } from '@/types/flow'

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

/**
 * Where to centre the view so a node is visible, or `null` if it already is.
 * `rect` is in flow coordinates; `container` is the canvas size on screen; `rightInset` is the
 * width covered by the drawer, so the node is centred in the part the user can still see.
 */
export function getCenterTarget(
  rect: Rect,
  viewport: Viewport,
  container: { width: number; height: number },
  rightInset = 0,
  margin = 24,
): XYPosition | null {
  const { zoom } = viewport
  const left = rect.x * zoom + viewport.x
  const top = rect.y * zoom + viewport.y
  const right = left + rect.width * zoom
  const bottom = top + rect.height * zoom
  const visibleWidth = Math.max(container.width - rightInset, 0)

  const inView =
    left >= margin &&
    top >= margin &&
    right <= visibleWidth - margin &&
    bottom <= container.height - margin
  if (inView) return null

  // setCenter puts a flow point at the container's centre; shift it so the node lands in the
  // middle of the visible part (left of the drawer).
  return {
    x: rect.x + rect.width / 2 + rightInset / 2 / zoom,
    y: rect.y + rect.height / 2,
  }
}
