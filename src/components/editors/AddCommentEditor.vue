<script setup lang="ts">
import { useId } from 'vue'
import { NButton, NFormItem, NInput } from 'naive-ui'
import { COMMENT_MAX_LENGTH } from '@/constants/forms'
import { commentRules } from '@/utils/formRules'

/** Add Comment field. Use inside an NForm whose model has `comment`. */
const comment = defineModel<string>('comment', { required: true })
const commentId = useId()
</script>

<template>
  <NFormItem label="Comment" path="comment" :rule="commentRules" :label-props="{ for: commentId }">
    <div class="flex w-full flex-col items-start gap-2">
      <NInput
        v-model:value="comment"
        :input-props="{ id: commentId }"
        type="textarea"
        placeholder="Internal note for your team"
        :autosize="{ minRows: 3, maxRows: 8 }"
        :maxlength="COMMENT_MAX_LENGTH"
        show-count
      />
      <NButton text type="error" :disabled="!comment" @click="comment = ''">
        Remove comment
      </NButton>
    </div>
  </NFormItem>
</template>
