<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@vue-flow/core'
import type { LinkEdgeData } from '@/types/flow'

/**
 * Vue Flow edge (`type: 'link'`): rounded elbow line between two steps. The "+" to insert a
 * step in between is rendered by the lower step (ActionNode), so it follows the step in the
 * keyboard Tab order instead of sitting in a separate layer.
 */
const props = defineProps<EdgeProps<LinkEdgeData>>()

const path = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 12,
  }),
)
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :style="{ stroke: data?.color ?? '#71717a', strokeWidth: 1.5 }"
  />
</template>
