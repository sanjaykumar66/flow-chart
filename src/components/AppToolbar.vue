<script setup lang="ts">
import { NButton } from 'naive-ui'
import { PlusIcon, RectangleGroupIcon } from '@heroicons/vue/24/outline'

/** App header: brand on the left, actions and "Create New Node" on the right. */
withDefaults(defineProps<{ title?: string }>(), { title: 'Flow Builder' })

defineEmits<{ create: [] }>()

defineSlots<{ actions?: () => unknown }>()
</script>

<template>
  <header
    class="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5"
  >
    <div class="flex min-w-0 items-center gap-2.5">
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"
        aria-hidden="true"
      >
        <RectangleGroupIcon class="size-5" />
      </span>
      <h1 class="truncate text-base font-semibold text-zinc-900">{{ title }}</h1>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
      <NButton type="primary" @click="$emit('create')">
        <template #icon>
          <PlusIcon aria-hidden="true" />
        </template>
        Create New Node
      </NButton>
    </div>
  </header>
</template>
