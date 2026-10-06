<script setup lang="ts">
import { NModal } from 'naive-ui'
import { getShortcuts } from '@/constants/shortcuts'

/** Lists every keyboard shortcut. Opened with "?" or the toolbar button. */
const show = defineModel<boolean>('show', { required: true })

const groups = getShortcuts()
</script>

<template>
  <NModal
    v-model:show="show"
    preset="dialog"
    title="Keyboard shortcuts"
    aria-label="Keyboard shortcuts"
    :show-icon="false"
    class="w-120! max-w-[calc(100vw-2rem)]"
  >
    <section v-for="group in groups" :key="group.title" class="mt-4 first:mt-2">
      <h3 class="mb-2 text-xs font-semibold tracking-wide text-zinc-600 uppercase">
        {{ group.title }}
      </h3>
      <dl class="divide-y divide-zinc-100">
        <div
          v-for="item in group.items"
          :key="item.description"
          class="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <dt class="text-sm text-zinc-700">{{ item.description }}</dt>
          <dd class="flex shrink-0 flex-wrap items-center gap-1.5 text-xs text-zinc-600">
            <template v-for="(combo, i) in item.keys" :key="i">
              <span v-if="i > 0">or</span>
              <span class="flex gap-1">
                <kbd
                  v-for="key in combo"
                  :key="key"
                  class="min-w-6 rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-center font-sans text-zinc-800"
                  >{{ key }}</kbd
                >
              </span>
            </template>
          </dd>
        </div>
      </dl>
    </section>
  </NModal>
</template>
