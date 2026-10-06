import { describe, expect, it } from 'vitest'
import { TITLE_MAX_LENGTH } from '@/constants/forms'
import { descriptionRules, messageTextRules, titleRules } from '@/utils/formRules'

describe('form rules', () => {
  it('requires a non-blank title', () => {
    expect(titleRules[0]).toMatchObject({ required: true, whitespace: true })
  })

  it('caps the title length', () => {
    expect(titleRules[1]).toMatchObject({ max: TITLE_MAX_LENGTH })
  })

  it('keeps the description optional', () => {
    expect(descriptionRules.some((rule) => rule.required)).toBe(false)
  })

  it('rejects blank messages', () => {
    expect(messageTextRules[0]).toMatchObject({ required: true, whitespace: true })
  })
})
