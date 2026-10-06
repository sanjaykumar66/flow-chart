<script setup lang="ts">
import { computed, h, ref, type Component } from 'vue'
import { NButton, NDropdown, type DropdownOption } from 'naive-ui'
import { ArrowPathIcon, EllipsisVerticalIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import BaseTooltip from './BaseTooltip.vue'

/** Toolbar "More actions" menu: layout and demo resets. */
const props = withDefaults(defineProps<{ canResetLayout?: boolean }>(), {
  canResetLayout: false,
})

const emit = defineEmits<{ resetLayout: []; resetDemo: [] }>()

const icon = (component: Component) => () =>
  h(component, { class: 'size-4', 'aria-hidden': 'true' })

const options = computed<DropdownOption[]>(() => [
  {
    key: 'reset-layout',
    label: 'Reset layout',
    icon: icon(Squares2X2Icon),
    disabled: !props.canResetLayout,
  },
  { type: 'divider', key: 'divider' },
  { key: 'reset-demo', label: 'Reset demo data…', icon: icon(ArrowPathIcon) },
])

const menuOpen = ref(false)

function onSelect(key: string) {
  if (key === 'reset-layout') emit('resetLayout')
  else if (key === 'reset-demo') emit('resetDemo')
}
</script>

<template>
  <!-- Rendered in place (not in <body>) so the menu stays inside the header landmark. -->
  <NDropdown
    v-model:show="menuOpen"
    :to="false"
    trigger="click"
    placement="bottom-end"
    :options="options"
    @select="onSelect"
  >
    <span>
      <BaseTooltip text="More actions" :disabled="menuOpen">
        <NButton quaternary circle aria-label="More actions" aria-haspopup="menu">
          <template #icon><EllipsisVerticalIcon aria-hidden="true" /></template>
        </NButton>
      </BaseTooltip>
    </span>
  </NDropdown>
</template>
