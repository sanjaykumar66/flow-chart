<script setup lang="ts">
import { NButton } from 'naive-ui'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { SMALL_SCREEN_QUERY, useMediaQuery } from '@/composables/useMediaQuery'
import AppLogo from './AppLogo.vue'

/** App header: brand on the left, actions and "Create New Node" on the right. */
withDefaults(defineProps<{ title?: string }>(), { title: 'Flow Builder' })

defineEmits<{ create: [] }>()

defineSlots<{ actions?: () => unknown }>()

const isWide = useMediaQuery(SMALL_SCREEN_QUERY)
</script>

<template>
  <header
    class="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 sm:gap-4 sm:px-5"
  >
    <div class="flex min-w-0 items-center gap-2.5">
      <AppLogo class="size-8 shrink-0" />
      <h1 class="truncate text-base font-semibold text-zinc-900">{{ title }}</h1>
    </div>

    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      <slot name="actions" />
      <!-- On phones only the "+" shows; the accessible name stays "Create New Node". -->
      <NButton
        type="primary"
        :aria-label="isWide ? undefined : 'Create New Node'"
        @click="$emit('create')"
      >
        <template #icon>
          <PlusIcon aria-hidden="true" />
        </template>
        <template v-if="isWide">Create New Node</template>
      </NButton>
    </div>
  </header>
</template>
