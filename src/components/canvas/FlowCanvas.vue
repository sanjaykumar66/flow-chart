<script setup lang="ts">
import { markRaw, nextTick, provide, useId, watch } from 'vue'
import {
  Panel,
  VueFlow,
  type Edge,
  type Node,
  type NodeDragEvent,
  type NodeMouseEvent,
  useVueFlow,
} from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { FIT_VIEW_PADDING } from '@/constants/canvas'
import type { XYPosition } from '@/types/flow'
import { motionDuration } from '@/utils/motion'
import { getCenterTarget } from '@/utils/viewport'
import CanvasControls from './CanvasControls.vue'
import { canvasContextKey } from './context'
import LinkEdge from './edges/LinkEdge.vue'
import ActionNode from './nodes/ActionNode.vue'
import ConnectorNode from './nodes/ConnectorNode.vue'

/**
 * The flow canvas. Renders ready-made Vue Flow nodes/edges (see `buildGraph`) and reports what
 * the user does; it owns no flow data.
 */
const props = withDefaults(
  defineProps<{
    nodes: Node[]
    edges: Edge[]
    /**
     * Bring a node into view if it's off screen. `seq` changes on every request so the same
     * node can be requested twice.
     */
    focusRequest?: { id: string; seq: number } | null
    /** Width covered on the right (the open drawer); treated as not visible. */
    rightInset?: number
  }>(),
  { focusRequest: null, rightInset: 0 },
)

const emit = defineEmits<{
  /** A step card was clicked or activated with the keyboard. */
  select: [id: string]
  /** A "+" was clicked. `childId` is set when inserting between two steps. */
  add: [payload: { parentId: string; childId?: string }]
  /** A node was dragged, or moved with the arrow keys, to a new position. */
  move: [id: string, position: XYPosition, source: 'drag' | 'keyboard']
}>()

const nodeTypes = { action: markRaw(ActionNode), connector: markRaw(ConnectorNode) }
const edgeTypes = { link: markRaw(LinkEdge) }

// Created here so the VueFlow below uses this same instance.
const { fitView, findNode, viewport, dimensions, setCenter } = useVueFlow()

const helpId = useId()

provide(canvasContextKey, {
  selectNode: (id) => emit('select', id),
  addNode: (parentId, childId) => emit('add', { parentId, childId }),
  nudgeNode: (id, delta) => {
    const node = findNode(id)
    if (!node) return
    emit('move', id, { x: node.position.x + delta.x, y: node.position.y + delta.y }, 'keyboard')
  },
  helpId,
})

/** Puts keyboard focus on a step's card (e.g. when its details drawer closes). */
function focusStep(id: string): boolean {
  const card = document.querySelector<HTMLElement>(
    `.vue-flow__node[data-id="${CSS.escape(id)}"] [role="button"]`,
  )
  card?.focus()
  return !!card
}

/** Fits the whole flow on screen, once nodes moved by a layout change have re-rendered. */
async function fitFlow() {
  await nextTick()
  fitView({ padding: FIT_VIEW_PADDING, duration: motionDuration(300) })
}

defineExpose({ focusStep, fitFlow })

// Fit the flow once its nodes have been measured, with extra padding so it starts slightly
// zoomed out (Vue Flow's built-in fit-view-on-init uses a tight 10%). Only on first load:
// later changes keep the user's zoom and pan.
let hasFitted = false
function onNodesInitialized() {
  if (hasFitted) return
  hasFitted = true
  fitView({ padding: FIT_VIEW_PADDING })
}

// Pan (keeping the zoom) so the requested node is visible and not under the drawer.
watch(
  () => props.focusRequest,
  async (request) => {
    if (!request) return
    await nextTick() // let moved nodes render at their new position first
    const node = findNode(request.id)
    if (!node || !node.dimensions.width) return
    const target = getCenterTarget(
      { ...node.computedPosition, ...node.dimensions },
      viewport.value,
      dimensions.value,
      props.rightInset,
    )
    if (target)
      setCenter(target.x, target.y, { zoom: viewport.value.zoom, duration: motionDuration(300) })
  },
)

function onNodeClick({ node }: NodeMouseEvent) {
  if (node.type === 'action') emit('select', node.id)
}

function onNodeDragStop({ node }: NodeDragEvent) {
  emit('move', node.id, { x: node.position.x, y: node.position.y }, 'drag')
}
</script>

<template>
  <div class="size-full bg-zinc-50">
    <!-- Section heading for the step cards (h3), so heading levels don't skip from the h1. -->
    <h2 class="sr-only">Flow steps</h2>
    <p :id="helpId" class="sr-only">
      Press Enter or Space to open the step's details. Use the arrow keys to move it, with Shift to
      move further. Press question mark for all keyboard shortcuts.
    </p>
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :nodes-connectable="false"
      :elements-selectable="false"
      :nodes-focusable="false"
      :edges-focusable="false"
      :min-zoom="0.3"
      :max-zoom="1.5"
      @nodes-initialized="onNodesInitialized"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
    >
      <Background :variant="BackgroundVariant.Dots" :gap="16" :size="1.2" pattern-color="#d4d4d8" />
      <Panel position="bottom-left">
        <CanvasControls />
      </Panel>
    </VueFlow>
  </div>
</template>

<style>
/* Handles are only anchors for edges; users can't draw connections. */
.vue-flow__handle.flow-handle {
  width: 1px;
  height: 1px;
  min-width: 0;
  min-height: 0;
  border: none;
  background: transparent;
}
</style>
