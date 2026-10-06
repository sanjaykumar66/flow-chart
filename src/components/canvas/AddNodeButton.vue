<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'

/** Small round "+": on the line into a step, and below the last step of a branch. */
withDefaults(defineProps<{ color?: string; label?: string }>(), {
  color: '#71717a', // zinc-500: 3:1+ against the canvas for a graphical control (WCAG 1.4.11)
  label: 'Add a step here',
})

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="nodrag nopan grid size-5 place-items-center rounded-full border-[1.5px] bg-white transition-transform duration-150 hover:scale-125 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    :style="{ borderColor: color, color }"
    :aria-label="label"
    :title="label"
    @click.stop="$emit('click')"
  >
    <PlusIcon class="size-3 stroke-[2.5]" aria-hidden="true" />
  </button>
</template>
