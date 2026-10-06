<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef, watch, type Component } from 'vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { DRAWER_WIDTH } from '@/constants/canvas'
import { isDialogOpen } from '@/utils/keyboard'

/**
 * Side panel for node details, built on Naive UI's NDrawer.
 * Non-modal: no backdrop, no focus trap and clicks outside don't close it,
 * so the canvas behind it stays usable (clicking another node just swaps the content).
 */
withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: Component
    iconColor?: string
    /** Pixels (capped at the screen width on phones) or any CSS width. */
    width?: number | string
    /**
     * Element to open inside (a selector), e.g. the canvas, so the header above stays usable.
     * The element needs `position: relative`. Defaults to the whole page.
     */
    to?: string
  }>(),
  {
    title: '',
    description: '',
    icon: undefined,
    iconColor: undefined,
    width: DRAWER_WIDTH,
    to: undefined,
  },
)

defineSlots<{
  default?: () => unknown
  footer?: () => unknown
}>()

const show = defineModel<boolean>('show', { required: true })

const titleId = useId()
const heading = useTemplateRef<HTMLElement>('heading')

// Naive marks every drawer as a modal dialog (aria-modal="true"), which tells screen readers to
// ignore the rest of the page. This panel is non-modal, so correct that and name it by its title.
watch(
  show,
  async (open) => {
    if (!open) return
    await nextTick()
    const panel = heading.value?.closest('.n-drawer')
    panel?.setAttribute('aria-modal', 'false')
    panel?.setAttribute('aria-labelledby', titleId)
  },
  { immediate: true },
)

/** Moves keyboard focus to the panel's title, so Tab continues into its content. */
async function focus() {
  await nextTick()
  heading.value?.focus()
}

defineExpose({ focus })

// NDrawer's own Esc handling needs focus inside the drawer (focus trap), which a
// non-modal panel doesn't have, so Esc is handled here instead.
// A dialog open on top (delete, discard changes) takes the Esc for itself.
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (isDialogOpen()) return
  show.value = false
}

watch(
  show,
  (open) => {
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <NDrawer
    v-model:show="show"
    :to="to"
    placement="right"
    :width="typeof width === 'number' ? `min(${width}px, 100vw)` : width"
    :show-mask="false"
    :trap-focus="false"
    :block-scroll="false"
    :auto-focus="false"
    :mask-closable="false"
    :close-on-esc="false"
  >
    <NDrawerContent closable :native-scrollbar="false">
      <template #header>
        <div class="flex items-center gap-3">
          <component
            :is="icon"
            v-if="icon"
            class="size-6 shrink-0"
            :style="{ color: iconColor }"
            aria-hidden="true"
          />
          <h2
            :id="titleId"
            ref="heading"
            tabindex="-1"
            class="truncate rounded-sm text-base font-semibold text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            v-text="title"
          />
        </div>
        <p v-if="description" class="mt-2 text-sm font-normal text-zinc-600">{{ description }}</p>
      </template>

      <slot />

      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
