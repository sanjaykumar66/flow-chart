<script setup lang="ts">
import { ref } from 'vue'
import { NTooltip } from 'naive-ui'

/**
 * Tooltip that shows on hover and on keyboard focus, and closes with Esc (WCAG 1.4.13).
 * Naive's hover trigger ignores focus, so the trigger is driven by hand. The wrapper also
 * receives hover while the control inside is disabled.
 */
withDefaults(
  defineProps<{
    text: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    /** Classes for the wrapper around the control. */
    triggerClass?: string
    /** Keep it hidden, e.g. while the control's own menu is open. */
    disabled?: boolean
  }>(),
  { placement: 'bottom', triggerClass: 'inline-flex', disabled: false },
)

defineSlots<{ default: () => unknown }>()

const show = ref(false)

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !show.value) return
  show.value = false
  event.preventDefault() // Esc only dismisses the tooltip, not the panel around it
}
</script>

<template>
  <NTooltip :placement="placement" trigger="manual" :show="show && !disabled">
    <template #trigger>
      <!-- Only shows the tooltip; the control inside is what users interact with. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <span
        :class="triggerClass"
        @mouseenter="show = true"
        @mouseleave="show = false"
        @focusin="show = true"
        @focusout="show = false"
        @keydown="onKeydown"
      >
        <slot />
      </span>
    </template>
    {{ text }}
  </NTooltip>
</template>
