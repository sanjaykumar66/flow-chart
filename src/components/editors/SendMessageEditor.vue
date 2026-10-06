<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import { NButton, NFormItem, NInput, type FormItemRule } from 'naive-ui'
import { PhotoIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  MESSAGE_TEXT_MAX_LENGTH,
} from '@/constants/forms'
import { formatBytes, readFileAsDataUrl } from '@/utils/file'
import { messageTextRules } from '@/utils/formRules'
import AttachmentTile from './AttachmentTile.vue'

/**
 * Send Message fields: attachment tiles with upload, and a list of text messages.
 * Use inside an NForm whose model has `texts` and `attachments`.
 */
const texts = defineModel<string[]>('texts', { required: true })
const attachments = defineModel<string[]>('attachments', { required: true })

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const uploadError = ref('')
const messageId = useId()

// A message must send something.
const contentRule: FormItemRule = {
  validator: () =>
    texts.value.some((text) => text.trim()) || attachments.value.length > 0
      ? true
      : new Error('Add at least one message or attachment'),
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  uploadError.value = ''

  const errors: string[] = []
  const added: string[] = []

  for (const file of files) {
    if (attachments.value.length + added.length >= ATTACHMENT_MAX_COUNT) {
      errors.push(`You can add up to ${ATTACHMENT_MAX_COUNT} attachments`)
      break
    }
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name} is not an image`)
      continue
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      errors.push(`${file.name} is larger than ${formatBytes(ATTACHMENT_MAX_BYTES)}`)
      continue
    }
    try {
      added.push(await readFileAsDataUrl(file))
    } catch {
      errors.push(`Could not read ${file.name}`)
    }
  }

  if (added.length) attachments.value = [...attachments.value, ...added]
  uploadError.value = errors.join('. ')
}

function removeAttachment(index: number) {
  attachments.value = attachments.value.filter((_, i) => i !== index)
  uploadError.value = ''
}

function updateText(index: number, value: string) {
  texts.value = texts.value.map((text, i) => (i === index ? value : text))
}

function removeText(index: number) {
  texts.value = texts.value.filter((_, i) => i !== index)
}

function addText() {
  texts.value = [...texts.value, '']
}
</script>

<template>
  <NFormItem
    label="Attachments"
    path="attachments"
    :validation-status="uploadError ? 'error' : undefined"
    :feedback="uploadError || undefined"
  >
    <div class="grid w-full grid-cols-3 gap-2.5">
      <AttachmentTile
        v-for="(src, index) in attachments"
        :key="src"
        :src="src"
        :name="`Attachment ${index + 1}`"
        @remove="removeAttachment(index)"
      />
      <button
        v-if="attachments.length < ATTACHMENT_MAX_COUNT"
        type="button"
        class="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-500 transition-colors hover:border-blue-500 hover:text-blue-600"
        @click="fileInput?.click()"
      >
        <PhotoIcon class="size-6" aria-hidden="true" />
        Upload
        <span class="sr-only">attachment</span>
      </button>
    </div>
    <input
      ref="fileInput"
      type="file"
      hidden
      aria-label="Attachment files"
      multiple
      :accept="ATTACHMENT_ACCEPT"
      @change="onFilesSelected"
    />
  </NFormItem>

  <NFormItem
    v-for="(text, index) in texts"
    :key="index"
    :label="`Message ${index + 1}`"
    :path="`texts[${index}]`"
    :rule="messageTextRules"
    :label-props="{ for: `${messageId}-${index}` }"
  >
    <div class="flex w-full items-start gap-1">
      <NInput
        :value="text"
        :input-props="{ id: `${messageId}-${index}` }"
        type="textarea"
        placeholder="Type a message"
        :autosize="{ minRows: 2, maxRows: 6 }"
        :maxlength="MESSAGE_TEXT_MAX_LENGTH"
        @update:value="updateText(index, $event)"
      />
      <NButton
        quaternary
        circle
        :aria-label="`Remove message ${index + 1}`"
        @click="removeText(index)"
      >
        <template #icon>
          <TrashIcon aria-hidden="true" />
        </template>
      </NButton>
    </div>
  </NFormItem>

  <NFormItem path="texts" :rule="contentRule" :show-label="false">
    <NButton dashed block @click="addText">
      <template #icon>
        <PlusIcon aria-hidden="true" />
      </template>
      Add message
    </NButton>
  </NFormItem>
</template>
