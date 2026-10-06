<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import type { ConnectorNodeData } from '@/types/flow'
import AddNodeButton from '../AddNodeButton.vue'
import { useCanvasContext } from '../context'

/** Vue Flow node (`type: 'connector'`): display-only Success / Failure label. */
const props = defineProps<NodeProps<ConnectorNodeData>>()

const canvas = useCanvasContext()

const LABELS = { success: 'Success', failure: 'Failure' } as const
</script>

<template>
  <div
    class="relative flex h-7 w-20 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-600 transition-shadow select-none"
    :class="{ 'ring-2 ring-blue-500': data.selected, 'ring-4 ring-amber-400/70': data.highlighted }"
    :data-highlighted="data.highlighted || undefined"
  >
    <Handle type="target" :position="Position.Top" :connectable="false" class="flow-handle" />
    {{ LABELS[data.connectorType] }}
    <Handle type="source" :position="Position.Bottom" :connectable="false" class="flow-handle" />

    <!-- Empty branch: dashed stub with a "+" to add its first step. -->
    <div
      v-if="data.isLeaf"
      class="absolute top-full left-1/2 flex -translate-x-1/2 flex-col items-center"
    >
      <span class="h-6 border-l-[1.5px] border-dashed border-zinc-300" aria-hidden="true" />
      <AddNodeButton
        :label="`Add the first step to the ${LABELS[data.connectorType]} branch`"
        @click="canvas.addNode(props.id)"
      />
    </div>
  </div>
</template>
