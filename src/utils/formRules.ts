import type { FormItemRule } from 'naive-ui'
import {
  COMMENT_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MESSAGE_TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '@/constants/forms'

const maxLength = (max: number, field: string): FormItemRule => ({
  max,
  message: `${field} must be ${max} characters or less`,
  trigger: 'input',
})

export const titleRules: FormItemRule[] = [
  { required: true, whitespace: true, message: 'Title is required', trigger: ['input', 'blur'] },
  maxLength(TITLE_MAX_LENGTH, 'Title'),
]

export const descriptionRules: FormItemRule[] = [maxLength(DESCRIPTION_MAX_LENGTH, 'Description')]

export const messageTextRules: FormItemRule[] = [
  {
    required: true,
    whitespace: true,
    message: 'Message cannot be empty. Remove it instead.',
    trigger: ['input', 'blur'],
  },
  maxLength(MESSAGE_TEXT_MAX_LENGTH, 'Message'),
]

export const commentRules: FormItemRule[] = [maxLength(COMMENT_MAX_LENGTH, 'Comment')]
