<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import BaseCard from '@/components/BaseCard.vue'
import { NUDGE_STEP, NUDGE_STEP_LARGE } from '@/constants/canvas'
import { NODE_TYPES } from '@/constants/nodeTypes'
import type { ActionNodeData } from '@/types/flow'
import { getNudge } from '@/utils/keyboard'
import AddNodeButton from '../AddNodeButton.vue'
import { useCanvasContext } from '../context'

/** Vue Flow node (`type: 'action'`) for Trigger, Business Hours, Send Message and Add Comment. */
const props = defineProps<NodeProps<ActionNodeData>>()

const canvas = useCanvasContext()

// Mouse clicks are handled by Vue Flow (it ignores the click that ends a drag);
// this covers keyboard users.
function onKeyActivate() {
  canvas.selectNode(props.id)
}

function onArrowKey(event: KeyboardEvent) {
  const delta = getNudge(event, NUDGE_STEP, NUDGE_STEP_LARGE)
  if (!delta) return
  event.preventDefault() // don't scroll the page
  canvas.nudgeNode(props.id, delta)
}
</script>

<template>
  <div class="relative">
    <!-- "+" on the incoming line: insert a step between the one above and this one. Rendered
         here (not by the edge) so it comes right before this card in the Tab order. -->
    <div v-if="data.insertAfter" class="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2">
      <AddNodeButton
        :color="data.insertAfter.color"
        :label="`Add a step between “${data.insertAfter.title}” and “${data.title}”`"
        @click="canvas.addNode(data.insertAfter.id, id)"
      />
    </div>

    <Handle
      v-if="data.nodeType !== 'trigger'"
      type="target"
      :position="Position.Top"
      :connectable="false"
      class="flow-handle"
    />

    <div
      class="rounded-lg transition-shadow duration-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 focus-visible:duration-100"
      :class="{ 'ring-4 ring-amber-400/70': data.highlighted }"
      :data-highlighted="data.highlighted || undefined"
      role="button"
      tabindex="0"
      :aria-pressed="data.selected"
      :aria-label="`${data.title}, ${NODE_TYPES[data.nodeType].label}. Open details`"
      :aria-describedby="canvas.helpId"
      @keydown.enter.prevent="onKeyActivate"
      @keydown.space.prevent="onKeyActivate"
      @keydown.up="onArrowKey"
      @keydown.down="onArrowKey"
      @keydown.left="onArrowKey"
      @keydown.right="onArrowKey"
    >
      <BaseCard
        :title="data.title"
        :description="data.description"
        :icon="NODE_TYPES[data.nodeType].icon"
        :icon-color="data.color"
        :selected="data.selected"
        class="cursor-pointer hover:shadow-md"
      />
    </div>

    <Handle type="source" :position="Position.Bottom" :connectable="false" class="flow-handle" />

    <!-- End of a branch: dashed stub with a "+" to append the next step. -->
    <div
      v-if="data.isLeaf"
      class="absolute top-full left-1/2 flex -translate-x-1/2 flex-col items-center"
    >
      <span class="h-6 border-l-[1.5px] border-dashed border-zinc-300" aria-hidden="true" />
      <AddNodeButton label="Add a step after this one" @click="canvas.addNode(id)" />
    </div>
  </div>
</template>
