<script setup lang="ts">
import { ref } from 'vue'
import { NImage } from 'naive-ui'
import { PhotoIcon, XMarkIcon } from '@heroicons/vue/24/outline'

/** Square image preview (click to enlarge) with a remove button. */
withDefaults(defineProps<{ src: string; name?: string }>(), { name: 'Attachment' })

defineEmits<{ remove: [] }>()

const failed = ref(false)
</script>

<template>
  <div
    class="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
  >
    <NImage
      v-if="!failed"
      :src="src"
      :alt="name"
      object-fit="cover"
      class="size-full"
      :img-props="{ class: 'size-full object-cover' }"
      @error="failed = true"
    />
    <div
      v-else
      class="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-zinc-500"
    >
      <PhotoIcon class="size-6" aria-hidden="true" />
      Preview unavailable
    </div>

    <button
      type="button"
      class="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      :aria-label="`Remove ${name}`"
      @click="$emit('remove')"
    >
      <XMarkIcon class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
