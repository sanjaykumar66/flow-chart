<script setup lang="ts">
import type { Component } from 'vue'
import { NEllipsis } from 'naive-ui'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: Component
    iconColor?: string
    /** Highlights the card, e.g. while its details drawer is open. */
    selected?: boolean
  }>(),
  {
    title: '',
    description: '',
    icon: undefined,
    iconColor: undefined,
    selected: false,
  },
)

defineSlots<{
  header?: () => unknown
  default?: () => unknown
}>()

// NEllipsis only shows the tooltip when the text is actually cut off.
const tooltipProps = { placement: 'top', delay: 250, style: { maxWidth: '320px' } } as const
</script>

<template>
  <!-- Presentational: whoever makes it clickable wraps it (see ActionNode). -->
  <article
    class="w-60 overflow-hidden rounded-lg border bg-white shadow-sm transition-[border-color,box-shadow] duration-150"
    :class="selected ? 'border-blue-500 ring-3 ring-blue-500/20' : 'border-zinc-200'"
  >
    <header class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5">
      <slot name="header">
        <component
          :is="icon"
          v-if="icon"
          class="size-5 shrink-0"
          :style="{ color: iconColor }"
          aria-hidden="true"
        />
        <h3 class="min-w-0 text-sm font-semibold text-zinc-900">
          <NEllipsis :tooltip="tooltipProps">{{ title }}</NEllipsis>
        </h3>
      </slot>
    </header>

    <div class="px-3 py-2.5">
      <slot>
        <p class="text-sm whitespace-pre-line text-zinc-600">
          <NEllipsis :line-clamp="3" :tooltip="tooltipProps">{{ description }}</NEllipsis>
        </p>
      </slot>
    </div>
  </article>
</template>
