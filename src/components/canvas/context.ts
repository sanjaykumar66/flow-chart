import { inject, type InjectionKey } from 'vue'

/** What custom nodes and edges can ask the canvas to do (they are rendered by Vue Flow, not by us). */
export interface CanvasContext {
  /** Open the details of a node (keyboard activation; mouse clicks come from Vue Flow). */
  selectNode: (id: string) => void
  /** "+" clicked: add a step after `parentId`, before `childId` when inserting on an edge. */
  addNode: (parentId: string, childId?: string) => void
  /** Arrow keys on a focused step: move it by `delta` (px, in flow coordinates). */
  nudgeNode: (id: string, delta: { x: number; y: number }) => void
  /** id of the hidden text describing the keyboard controls of a step. */
  helpId: string
}

export const canvasContextKey: InjectionKey<CanvasContext> = Symbol('flow-canvas')

export function useCanvasContext(): CanvasContext {
  const context = inject(canvasContextKey)
  if (!context) throw new Error('Canvas nodes and edges must be rendered inside FlowCanvas')
  return context
}
