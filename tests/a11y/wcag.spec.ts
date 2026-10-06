import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { expectNoA11yViolations } from '../helpers/axe'
import { drawerTitle, renderAt, revealNodes } from '../helpers/renderApp'

/** WCAG 2.1 A/AA checks (axe-core) on every screen and dialog of the app. */
describe('WCAG 2.1 AA', () => {
  beforeEach(() => {
    const warn = console.warn
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).startsWith('[Vue Flow]')) warn(...args)
    })
  })

  it('canvas', async () => {
    await renderAt('/')
    await revealNodes()
    await screen.findByText('Conversation Opened')
    await expectNoA11yViolations()
  })

  it.each([
    ['Trigger', '/nodes/1', 'Trigger'],
    ['Business Hours', '/nodes/d09c08', 'Business Hours'],
    ['Send Message', '/nodes/b0653a', 'Welcome Message'],
    ['Add Comment', '/nodes/e879e4', 'Add Comment #1'],
  ])('details drawer: %s', async (_, path, title) => {
    await renderAt(path)
    await revealNodes()
    await waitFor(() => expect(drawerTitle()).toBe(title))
    await expectNoA11yViolations()
  })

  it('details drawer with validation errors', async () => {
    await renderAt('/nodes/e879e4')
    await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
    await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), '')
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Title is required')
    await expectNoA11yViolations()
  })

  it('create node dialog', async () => {
    await renderAt('/')
    await revealNodes()
    await fireEvent.click(screen.getByRole('button', { name: 'Create New Node' }))
    await screen.findByPlaceholderText('e.g. Away Message')
    await expectNoA11yViolations()
  })

  it('delete dialog', async () => {
    await renderAt('/nodes/e879e4')
    await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(document.querySelector('.n-dialog')).not.toBeNull())
    await expectNoA11yViolations()
  })

  it('discard changes dialog', async () => {
    await renderAt('/nodes/e879e4')
    await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
    await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Changed')
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByText('Discard unsaved changes?')
    await expectNoA11yViolations()
  })
})
