<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, type Component } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MinusIcon,
  PlusIcon,
  ViewfinderCircleIcon,
} from '@heroicons/vue/24/outline'
import { useFullscreen } from '@/composables/useFullscreen'
import { FIT_VIEW_PADDING } from '@/constants/canvas'
import { motionDuration } from '@/utils/motion'
import BaseTooltip from '../BaseTooltip.vue'

/** Zoom in / out, fit the flow to the screen, and toggle fullscreen. Render inside VueFlow. */
const { zoomIn, zoomOut, fitView, viewport, minZoom, maxZoom } = useVueFlow()
const fullscreen = useFullscreen()

/** Short zoom animations, skipped when the user prefers reduced motion. */
const animation = () => ({ duration: motionDuration(200) })

interface Control {
  key: string
  label: string
  /** Tooltip text; defaults to the label. */
  tooltip?: string
  icon: Component
  disabled?: boolean
  action: () => unknown
}

const controls = computed<Control[]>(() => {
  const zoom = viewport.value.zoom
  const items: Control[] = [
    {
      key: 'zoom-in',
      label: 'Zoom in',
      icon: PlusIcon,
      disabled: zoom >= maxZoom.value,
      tooltip: zoom >= maxZoom.value ? 'Maximum zoom reached' : undefined,
      action: () => zoomIn(animation()),
    },
    {
      key: 'zoom-out',
      label: 'Zoom out',
      icon: MinusIcon,
      disabled: zoom <= minZoom.value,
      tooltip: zoom <= minZoom.value ? 'Minimum zoom reached' : undefined,
      action: () => zoomOut(animation()),
    },
    {
      key: 'fit-view',
      label: 'Fit flow to screen',
      icon: ViewfinderCircleIcon,
      action: () => fitView({ ...animation(), padding: FIT_VIEW_PADDING }),
    },
  ]
  if (fullscreen.isSupported) {
    items.push({
      key: 'fullscreen',
      label: fullscreen.isFullscreen.value ? 'Exit fullscreen' : 'Enter fullscreen',
      icon: fullscreen.isFullscreen.value ? ArrowsPointingInIcon : ArrowsPointingOutIcon,
      action: fullscreen.toggle,
    })
  }
  return items
})

// ARIA toolbar pattern: one Tab stop for the whole toolbar; ↑/↓ (and Home/End) move between
// buttons. Disabled buttons are skipped.
const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')
const activeKey = ref<string | null>(null)
const tabStopKey = computed(() => {
  const enabled = controls.value.filter((c) => !c.disabled)
  return (enabled.find((c) => c.key === activeKey.value) ?? enabled[0])?.key ?? null
})

async function onToolbarKeydown(event: KeyboardEvent) {
  const enabled = controls.value.filter((c) => !c.disabled)
  const current = enabled.findIndex((c) => c.key === tabStopKey.value)
  const next = {
    ArrowDown: (current + 1) % enabled.length,
    ArrowUp: (current - 1 + enabled.length) % enabled.length,
    Home: 0,
    End: enabled.length - 1,
  }[event.key]
  if (next === undefined || enabled.length === 0) return
  event.preventDefault()
  activeKey.value = enabled[next].key
  await nextTick()
  buttons.value?.find((b) => b.dataset.key === activeKey.value)?.focus()
}
</script>

<template>
  <!-- role="toolbar" is a composite widget; the plugin doesn't count it as interactive. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    class="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
    role="toolbar"
    aria-label="Canvas controls"
    aria-orientation="vertical"
    @keydown="onToolbarKeydown"
  >
    <BaseTooltip
      v-for="control in controls"
      :key="control.key"
      :text="control.tooltip ?? control.label"
      placement="right"
      trigger-class="block not-last:border-b not-last:border-zinc-200"
    >
      <button
        ref="buttons"
        type="button"
        class="grid size-8 place-items-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-white"
        :data-key="control.key"
        :tabindex="control.key === tabStopKey ? 0 : -1"
        :aria-label="control.label"
        :disabled="control.disabled"
        @click="control.action()"
        @focus="activeKey = control.key"
      >
        <component :is="control.icon" class="size-4" aria-hidden="true" />
      </button>
    </BaseTooltip>
  </div>
</template>
