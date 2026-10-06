<script setup lang="ts">
import { useId } from 'vue'
import { NFormItem, NInput } from 'naive-ui'
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '@/constants/forms'
import { descriptionRules, titleRules } from '@/utils/formRules'

/**
 * Editable title + description shared by every node form.
 * Use inside an NForm whose model has `title` and `description`; the rules live on the items,
 * so the parent's `validate()` picks them up.
 */
withDefaults(defineProps<{ titlePlaceholder?: string }>(), {
  titlePlaceholder: 'e.g. Welcome Message',
})

const title = defineModel<string>('title', { required: true })
const description = defineModel<string>('description', { required: true })

// Naive's labels aren't tied to their inputs; ids connect them for screen readers.
const titleId = useId()
const descriptionId = useId()
</script>

<template>
  <NFormItem label="Title" path="title" :rule="titleRules" :label-props="{ for: titleId }">
    <NInput
      v-model:value="title"
      :input-props="{ id: titleId }"
      :placeholder="titlePlaceholder"
      :maxlength="TITLE_MAX_LENGTH"
      show-count
    />
  </NFormItem>

  <NFormItem
    label="Description"
    path="description"
    :rule="descriptionRules"
    :label-props="{ for: descriptionId }"
  >
    <NInput
      v-model:value="description"
      :input-props="{ id: descriptionId }"
      type="textarea"
      placeholder="What does this step do?"
      :autosize="{ minRows: 2, maxRows: 5 }"
      :maxlength="DESCRIPTION_MAX_LENGTH"
      show-count
    />
  </NFormItem>
</template>
