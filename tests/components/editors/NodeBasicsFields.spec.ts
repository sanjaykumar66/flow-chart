import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/vue'
import NodeBasicsFields from '@/components/editors/NodeBasicsFields.vue'
import { renderInForm } from '../../helpers/renderInForm'

const setup = (title = 'Welcome Message', description = 'Greets new contacts') =>
  renderInForm(NodeBasicsFields, { title, description })

describe('NodeBasicsFields', () => {
  it('shows the current title and description', () => {
    setup()
    expect(screen.getByPlaceholderText('e.g. Welcome Message')).toHaveValue('Welcome Message')
    expect(screen.getByPlaceholderText('What does this step do?')).toHaveValue(
      'Greets new contacts',
    )
  })

  it('updates the model when edited', async () => {
    const { model } = setup()
    await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Away Message')
    await fireEvent.update(screen.getByPlaceholderText('What does this step do?'), 'Off hours')

    expect(model.title).toBe('Away Message')
    expect(model.description).toBe('Off hours')
  })

  it('marks the title as required', () => {
    setup()
    expect(screen.getByText('Title').closest('.n-form-item-label')).toHaveTextContent('*')
  })

  it('passes validation with a title and no description', async () => {
    const { validate } = setup('Welcome Message', '')
    await expect(validate()).resolves.toEqual([])
  })

  it.each(['', '   '])('rejects a title of %j', async (title) => {
    const { validate } = setup(title)
    await expect(validate()).resolves.toEqual(['Title is required'])
  })

  it('accepts a custom title placeholder', () => {
    renderInForm(NodeBasicsFields, { title: '', description: '' }, { titlePlaceholder: 'Name it' })
    expect(screen.getByPlaceholderText('Name it')).toBeInTheDocument()
  })
})
