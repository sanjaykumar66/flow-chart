<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from '@heroicons/vue/24/outline'
import { isMac } from '@/utils/keyboard'
import BaseTooltip from './BaseTooltip.vue'

/** Undo / Redo buttons for the toolbar. Tooltips name the change and the shortcut. */
const props = withDefaults(
  defineProps<{
    canUndo: boolean
    canRedo: boolean
    undoLabel?: string
    redoLabel?: string
  }>(),
  { undoLabel: '', redoLabel: '' },
)

defineEmits<{ undo: []; redo: [] }>()

const mod = isMac() ? '⌘' : 'Ctrl+'
const undoShortcut = `${mod}Z`
const redoShortcut = isMac() ? '⇧⌘Z' : 'Ctrl+Y'
// For assistive tech (aria-keyshortcuts uses key names, not symbols).
const undoKeys = isMac() ? 'Meta+Z' : 'Control+Z'
const redoKeys = isMac() ? 'Meta+Shift+Z' : 'Control+Y Control+Shift+Z'

const undoTip = computed(() =>
  props.canUndo ? `Undo: ${props.undoLabel} (${undoShortcut})` : 'Nothing to undo',
)
const redoTip = computed(() =>
  props.canRedo ? `Redo: ${props.redoLabel} (${redoShortcut})` : 'Nothing to redo',
)
</script>

<template>
  <div class="flex items-center gap-1" role="group" aria-label="History">
    <BaseTooltip :text="undoTip">
      <NButton
        quaternary
        circle
        aria-label="Undo"
        :aria-keyshortcuts="undoKeys"
        :disabled="!canUndo"
        @click="$emit('undo')"
      >
        <template #icon><ArrowUturnLeftIcon aria-hidden="true" /></template>
      </NButton>
    </BaseTooltip>
    <BaseTooltip :text="redoTip">
      <NButton
        quaternary
        circle
        aria-label="Redo"
        :aria-keyshortcuts="redoKeys"
        :disabled="!canRedo"
        @click="$emit('redo')"
      >
        <template #icon><ArrowUturnRightIcon aria-hidden="true" /></template>
      </NButton>
    </BaseTooltip>
  </div>
</template>
