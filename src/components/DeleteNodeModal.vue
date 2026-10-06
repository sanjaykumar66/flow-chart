<script setup lang="ts">
import { NModal } from 'naive-ui'

/** Confirmation before deleting a node. Emits `confirm`; the caller does the delete. */
withDefaults(
  defineProps<{
    nodeTitle?: string
    /** Extra consequences to spell out, e.g. branches removed with the node. */
    details?: string
    loading?: boolean
  }>(),
  { nodeTitle: '', details: '', loading: false },
)

const emit = defineEmits<{
  confirm: []
  /** The dialog has finished closing (a good moment to move keyboard focus). */
  closed: []
}>()

const show = defineModel<boolean>('show', { required: true })

// Returning false keeps the dialog open; the caller closes it once the delete has finished.
function onConfirm() {
  emit('confirm')
  return false
}
</script>

<template>
  <NModal
    v-model:show="show"
    preset="dialog"
    type="error"
    title="Delete node?"
    aria-label="Delete node?"
    positive-text="Delete"
    negative-text="Cancel"
    :positive-button-props="{ type: 'error', loading }"
    :negative-button-props="{ disabled: loading }"
    :mask-closable="!loading"
    :close-on-esc="!loading"
    :closable="!loading"
    @positive-click="onConfirm"
    @negative-click="show = false"
    @after-leave="emit('closed')"
  >
    <p class="text-sm text-zinc-600">
      <template v-if="nodeTitle">
        <span class="font-semibold text-zinc-900">“{{ nodeTitle }}”</span> will be removed from the
        flow.
      </template>
      <template v-else>This node will be removed from the flow.</template>
      This can't be undone.
    </p>
    <p v-if="details" class="mt-2 text-sm font-medium text-red-600">{{ details }}</p>
  </NModal>
</template>
