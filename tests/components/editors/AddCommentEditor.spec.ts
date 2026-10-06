import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/vue'
import AddCommentEditor from '@/components/editors/AddCommentEditor.vue'
import { renderInForm } from '../../helpers/renderInForm'

const textarea = () => screen.getByPlaceholderText('Internal note for your team')

describe('AddCommentEditor', () => {
  it('shows the existing comment', () => {
    renderInForm(AddCommentEditor, { comment: 'User message during off hours' })
    expect(textarea()).toHaveValue('User message during off hours')
  })

  it('updates the comment when edited', async () => {
    const { model } = renderInForm(AddCommentEditor, { comment: 'Old' })
    await fireEvent.update(textarea(), 'New comment')
    expect(model.comment).toBe('New comment')
  })

  it('removes the comment', async () => {
    const { model } = renderInForm(AddCommentEditor, { comment: 'Old' })
    await fireEvent.click(screen.getByRole('button', { name: 'Remove comment' }))
    expect(model.comment).toBe('')
  })

  it('disables Remove when there is no comment', () => {
    renderInForm(AddCommentEditor, { comment: '' })
    expect(screen.getByRole('button', { name: 'Remove comment' })).toBeDisabled()
  })

  it('allows an empty comment', async () => {
    const { validate } = renderInForm(AddCommentEditor, { comment: '' })
    await expect(validate()).resolves.toEqual([])
  })
})
