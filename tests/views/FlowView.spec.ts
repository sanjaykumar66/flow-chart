import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { POSITIONS_STORAGE_KEY } from '@/stores/canvas'
import type { FlowApi } from '@/api/flowApi'
import { createTestApi } from '../helpers/testApi'
import { drawerTitle, renderAt, revealNodes } from '../helpers/renderApp'

/** Waits for an element that has no accessible role to query by (e.g. a lazily loaded dialog). */
const findElement = (selector: string) =>
  waitFor(() => {
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) throw new Error(`${selector} not found`)
    return el
  })

const card = (title: string) =>
  screen.findByRole('button', { name: new RegExp(`^${title}(\\s|$)`) })

describe('FlowView', () => {
  beforeEach(() => {
    // Vue Flow warns about container size/styles, which a DOM without layout can't provide.
    const warn = console.warn
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).startsWith('[Vue Flow]')) warn(...args)
    })
  })

  describe('loading', () => {
    it('shows the canvas without a drawer at /', async () => {
      await renderAt('/')
      await screen.findByText('Conversation Opened')
      expect(document.querySelector('.n-drawer')).not.toBeInTheDocument()
    })

    it('shows an error with Retry when the flow fails to load', async () => {
      const { api } = createTestApi()
      await renderAt('/', { ...api, getNodes: () => Promise.reject(new Error('down')) })
      expect(await screen.findByText("Couldn't load the flow")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  describe('routing', () => {
    it('opens the drawer for the node in the URL, filled with its data', async () => {
      await renderAt('/nodes/d09c08')
      await waitFor(() => expect(drawerTitle()).toBe('Business Hours'))
      expect(await screen.findByLabelText('Mon opening time')).toHaveValue('09:00')
    })

    it.each([
      ['an unknown id', '/nodes/nope'],
      ['a Success connector', '/nodes/161f52'],
    ])('sends %s back to the canvas with a warning', async (_, path) => {
      const { router } = await renderAt(path)
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
      expect(await screen.findByText("That node doesn't exist or can't be opened.")).toBeVisible()
    })

    it('changes the URL when a node is opened from the canvas', async () => {
      const { router } = await renderAt('/')
      await revealNodes()
      await fireEvent.keyDown(await card('Away Message'), { key: 'Enter' })
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/nodes/b6a0c1'))
      await waitFor(() => expect(drawerTitle()).toBe('Away Message'))
    })

    it('goes back to / when the drawer is closed', async () => {
      const { router } = await renderAt('/nodes/d09c08')
      await waitFor(() => expect(drawerTitle()).toBe('Business Hours'))
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
    })

    it('switches the drawer when the URL changes', async () => {
      const { router } = await renderAt('/nodes/d09c08')
      await waitFor(() => expect(drawerTitle()).toBe('Business Hours'))
      await router.push('/nodes/b0653a')
      await waitFor(() => expect(drawerTitle()).toBe('Welcome Message'))
    })
  })

  describe('editing', () => {
    it('saves changes and shows them on the canvas card', async () => {
      const { api } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))

      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Flag VIP')
      await fireEvent.update(
        await screen.findByPlaceholderText('Internal note for your team'),
        'Escalate to the VIP team',
      )
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('Changes saved')).toBeInTheDocument()
      await waitFor(() =>
        expect(document.querySelector('.vue-flow__node[data-id="e879e4"]')).toHaveTextContent(
          'Flag VIP',
        ),
      )
      const saved = (await api.getNodes()).find((n) => n.id === 'e879e4')
      expect(saved).toMatchObject({
        name: 'Flag VIP',
        data: { comment: 'Escalate to the VIP team' },
      })
    })

    it('does not save an invalid form', async () => {
      const { api } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), '')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('Title is required')).toBeInTheDocument()
      const saved = (await api.getNodes()).find((n) => n.id === 'e879e4')
      expect(saved?.name).toBe('Add Comment #1')
    })
  })

  describe('deleting', () => {
    it('deletes a step after confirmation and closes the drawer', async () => {
      const { router, api } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))

      await fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await findElement('.n-dialog')
      await fireEvent.click(
        Array.from(dialog.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Delete',
        )!,
      )

      expect(await screen.findByText('“Add Comment #1” deleted')).toBeInTheDocument()
      expect(router.currentRoute.value.fullPath).toBe('/')
      expect((await api.getNodes()).some((n) => n.id === 'e879e4')).toBe(false)
    })

    it('warns that deleting Business Hours removes its branches', async () => {
      await renderAt('/nodes/d09c08')
      await waitFor(() => expect(drawerTitle()).toBe('Business Hours'))
      await fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      expect(
        await screen.findByText(/Success and Failure branches and every step under them/),
      ).toBeInTheDocument()
    })

    it('does not offer Delete for the trigger', async () => {
      await renderAt('/nodes/1')
      await waitFor(() => expect(drawerTitle()).toBe('Trigger'))
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    })
  })

  describe('creating', () => {
    it('adds a step after the last one of a branch and opens it', async () => {
      const { router, api } = await renderAt('/')
      await revealNodes()
      const [afterWelcome] = await screen.findAllByRole('button', {
        name: 'Add a step after this one',
      })
      await fireEvent.click(afterWelcome!)

      await fireEvent.update(await screen.findByPlaceholderText('e.g. Away Message'), 'Follow up')
      await fireEvent.click(screen.getByText('Select a node type'))
      const option = Array.from(document.querySelectorAll('.n-base-select-option')).find(
        (el) => el.textContent?.trim() === 'Add Comment',
      )
      await fireEvent.click(option!)
      await fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByText('“Follow up” added')).toBeInTheDocument()
      const created = (await api.getNodes()).find((n) => n.name === 'Follow up')
      expect(created).toMatchObject({ type: 'addComment', parentId: 'b0653a' })
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe(`/nodes/${created!.id}`))
      await waitFor(() => expect(drawerTitle()).toBe('Follow up'))
    })

    it('pre-fills "Connect after" with the open step from the toolbar', async () => {
      await renderAt('/nodes/b6a0c1')
      await waitFor(() => expect(drawerTitle()).toBe('Away Message'))
      await fireEvent.click(screen.getByRole('button', { name: 'Create New Node' }))
      const field = await findElement('.n-tree-select')
      expect(field).toHaveTextContent('Away Message')
    })

    it('asks where to add when nothing is open', async () => {
      const { api } = await renderAt('/')
      await revealNodes()
      await fireEvent.click(screen.getByRole('button', { name: 'Create New Node' }))

      await fireEvent.update(await screen.findByPlaceholderText('e.g. Away Message'), 'Log visit')
      await fireEvent.click(screen.getByText('Select a node type'))
      await fireEvent.click(
        Array.from(document.querySelectorAll('.n-base-select-option')).find(
          (el) => el.textContent?.trim() === 'Add Comment',
        )!,
      )
      await fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByText('Choose where to add the step')).toBeInTheDocument()
      expect((await api.getNodes()).some((n) => n.name === 'Log visit')).toBe(false)
    })

    it('highlights the step the new one will follow while the form is open', async () => {
      await renderAt('/')
      await revealNodes()
      expect(await card('Welcome Message')).toHaveAttribute('aria-pressed', 'false')

      const [afterWelcome] = await screen.findAllByRole('button', {
        name: 'Add a step after this one',
      })
      await fireEvent.click(afterWelcome!)
      // Re-rendered nodes are hidden again by Vue Flow, so check the attribute directly.
      await waitFor(() =>
        expect(
          document.querySelector('.vue-flow__node[data-id="b0653a"] [role="button"]'),
        ).toHaveAttribute('aria-pressed', 'true'),
      )
    })
  })

  describe('layout', () => {
    it('places nodes where they were dragged before (restored from storage)', async () => {
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({ b6a0c1: { x: 900, y: 50 } }))
      await renderAt('/')
      await waitFor(() =>
        expect(
          (document.querySelector('.vue-flow__node[data-id="b6a0c1"]') as HTMLElement)?.style
            .transform,
        ).toMatch(/translate\(900px,\s*50px\)/),
      )
    })

    it('forgets saved positions of nodes that no longer exist', async () => {
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({ gone: { x: 1, y: 1 } }))
      await renderAt('/')
      await screen.findByText('Conversation Opened')
      await waitFor(() => expect(localStorage.getItem(POSITIONS_STORAGE_KEY)).toBeNull())
    })
  })

  describe('undo / redo', () => {
    it('undoes and redoes a saved edit from the toolbar', async () => {
      const { api } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()

      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Flag VIP')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled())

      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      await waitFor(() =>
        expect(screen.getByPlaceholderText('e.g. Welcome Message')).toHaveValue('Add Comment #1'),
      )
      // says what was undone and highlights the node it changed
      expect(await screen.findByText('Undone: Edit “Flag VIP”')).toBeInTheDocument()
      await waitFor(() =>
        expect(
          document.querySelector('.vue-flow__node[data-id="e879e4"] [data-highlighted]'),
        ).toBeInTheDocument(),
      )
      expect((await api.getNodes()).find((n) => n.id === 'e879e4')?.name).toBe('Add Comment #1')

      await fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
      await waitFor(() =>
        expect(screen.getByPlaceholderText('e.g. Welcome Message')).toHaveValue('Flag VIP'),
      )
      expect(await screen.findByText('Redone: Edit “Flag VIP”')).toBeInTheDocument()
    })

    it('does not record a save that changed nothing', async () => {
      await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    })
  })

  describe('unsaved changes', () => {
    const titleInput = () => screen.getByPlaceholderText('e.g. Welcome Message')
    const discardDialog = () => screen.findByText('Discard unsaved changes?')

    async function editComment() {
      const utils = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(titleInput(), 'Flag VIP')
      return utils
    }

    it('closes without asking when nothing changed', async () => {
      const { router } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
    })

    it('keeps the drawer and the edits when the user keeps editing', async () => {
      const { router } = await editComment()
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(await discardDialog()).toBeInTheDocument()
      expect(screen.getByText("Your changes to “Add Comment #1” haven't been saved.")).toBeVisible()

      await fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      expect(router.currentRoute.value.fullPath).toBe('/nodes/e879e4')
      expect(titleInput()).toHaveValue('Flag VIP')
    })

    it('throws the edits away when the user discards', async () => {
      const { router, api } = await editComment()
      const navigation = router.push('/nodes/b0653a') // e.g. another node clicked
      await fireEvent.click(await screen.findByRole('button', { name: 'Discard' }))
      await navigation
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/nodes/b0653a'))
      await waitFor(() => expect(drawerTitle()).toBe('Welcome Message'))
      expect((await api.getNodes()).find((n) => n.id === 'e879e4')?.name).toBe('Add Comment #1')
    })

    it('asks before Esc closes the drawer, and Esc on the question keeps editing', async () => {
      const { router } = await editComment()
      await fireEvent.keyDown(document, { key: 'Escape' })
      await discardDialog()
      await fireEvent.keyDown(document, { key: 'Escape' })
      expect(router.currentRoute.value.fullPath).toBe('/nodes/e879e4')
      expect(titleInput()).toHaveValue('Flag VIP')
    })

    it('does not ask after the changes were saved', async () => {
      const { router } = await editComment()
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
    })

    it('does not ask when the edited step is deleted', async () => {
      const { router } = await editComment()
      await fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await findElement('.n-dialog')
      await fireEvent.click(
        Array.from(dialog.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Delete',
        )!,
      )
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
      expect(screen.queryByText('Discard unsaved changes?')).toBeNull()
    })

    it('asks before undoing an edit of the step being edited', async () => {
      await editComment()
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      await fireEvent.update(titleInput(), 'Flag VIP again')

      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      await discardDialog()
      await fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      expect(titleInput()).toHaveValue('Flag VIP again')
      expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    })
  })

  describe('keyboard', () => {
    it('moves focus to the drawer title when a step opens', async () => {
      await renderAt('/')
      await revealNodes()
      await fireEvent.keyDown(await card('Away Message'), { key: 'Enter' })
      await waitFor(() => expect(drawerTitle()).toBe('Away Message'))
      await waitFor(() =>
        expect(document.activeElement).toBe(document.querySelector('.n-drawer h2')),
      )
    })

    it('returns focus to the step when the drawer closes', async () => {
      const { router } = await renderAt('/nodes/b6a0c1')
      await revealNodes()
      await waitFor(() => expect(drawerTitle()).toBe('Away Message'))
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
      await waitFor(() =>
        expect(document.activeElement).toBe(
          document.querySelector('.vue-flow__node[data-id="b6a0c1"] [role="button"]'),
        ),
      )
    })

    it('moves a step with the arrow keys and undoes the presses as one move', async () => {
      await renderAt('/')
      await revealNodes()
      const welcome = await card('Welcome Message')
      await fireEvent.keyDown(welcome, { key: 'ArrowRight' })
      await fireEvent.keyDown(welcome, { key: 'ArrowRight', shiftKey: true })
      expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      expect(await screen.findByText('Undone: Move “Welcome Message”')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    })

    it('opens the keyboard shortcuts with "?"', async () => {
      await renderAt('/')
      await revealNodes()
      await fireEvent.keyDown(document.body, { key: '?' })
      expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
    })

    it('opens the keyboard shortcuts from the toolbar button', async () => {
      await renderAt('/')
      await fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
      expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
    })
  })

  describe('resets', () => {
    const menuOption = async (label: string) => {
      await fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
      return (await screen.findByText(label)).closest('.n-dropdown-option-body') as HTMLElement
    }

    it('puts dragged steps back on the auto-layout, undoably', async () => {
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify({ b0653a: { x: 900, y: 40 } }))
      await renderAt('/')
      await revealNodes()
      await fireEvent.click(await menuOption('Reset layout'))
      expect(await screen.findByText(/^Layout reset\. Press (⌘|Ctrl\+)Z to undo\.$/)).toBeVisible()
      expect(localStorage.getItem(POSITIONS_STORAGE_KEY)).toBeNull()

      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      expect(await screen.findByText('Undone: Reset layout')).toBeInTheDocument()
      await waitFor(() =>
        expect(JSON.parse(localStorage.getItem(POSITIONS_STORAGE_KEY) ?? '{}')).toEqual({
          b0653a: { x: 900, y: 40 },
        }),
      )
    })

    it('restores the original flow after confirmation, and clears history', async () => {
      const { api, router } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Flag VIP')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Unsaved')

      await fireEvent.click(await menuOption('Reset demo data…'))
      expect(await screen.findByText('Reset the demo flow?')).toBeInTheDocument()
      await fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

      expect(await screen.findByText('Demo flow restored')).toBeInTheDocument()
      expect(router.currentRoute.value.fullPath).toBe('/') // closed without the discard question
      expect(screen.queryByText('Discard unsaved changes?')).toBeNull()
      expect((await api.getNodes()).find((n) => n.id === 'e879e4')?.name).toBe('Add Comment #1')
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    })

    it('keeps everything when the reset is cancelled', async () => {
      const { api } = await renderAt('/')
      await revealNodes()
      await api.deleteNode('e879e4')
      await fireEvent.click(await menuOption('Reset demo data…'))
      await fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
      expect((await api.getNodes()).some((n) => n.id === 'e879e4')).toBe(false)
    })
  })

  describe('errors and recovery', () => {
    const failing = (overrides: Partial<FlowApi>) => {
      const { api } = createTestApi()
      return { ...api, ...overrides }
    }

    it('loads the flow after Retry', async () => {
      const { api } = createTestApi()
      const getNodes = vi
        .fn<FlowApi['getNodes']>()
        .mockRejectedValueOnce(new Error('down'))
        .mockImplementation(() => api.getNodes())
      await renderAt('/', { ...api, getNodes })
      await fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
      expect(await screen.findByText('Conversation Opened')).toBeInTheDocument()
    })

    it('shows the error and puts the card back when saving fails', async () => {
      await renderAt(
        '/nodes/e879e4',
        failing({ updateNode: () => Promise.reject(new Error('Save failed')) }),
      )
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Flag VIP')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('Save failed')).toBeInTheDocument()
      await waitFor(() =>
        expect(document.querySelector('.vue-flow__node[data-id="e879e4"]')).toHaveTextContent(
          'Add Comment #1',
        ),
      )
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    })

    it('keeps the step when deleting fails', async () => {
      await renderAt(
        '/nodes/e879e4',
        failing({ deleteNode: () => Promise.reject(new Error('Delete failed')) }),
      )
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await findElement('.n-dialog')
      await fireEvent.click(
        Array.from(dialog.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Delete',
        )!,
      )
      expect(await screen.findByText('Delete failed')).toBeInTheDocument()
      await waitFor(() =>
        expect(document.querySelector('.vue-flow__node[data-id="e879e4"]')).toBeInTheDocument(),
      )
    })

    it('keeps the create form open when creating fails', async () => {
      await renderAt('/', failing({ createNode: () => Promise.reject(new Error('Create failed')) }))
      await revealNodes()
      const [afterWelcome] = await screen.findAllByRole('button', {
        name: 'Add a step after this one',
      })
      await fireEvent.click(afterWelcome!)
      await fireEvent.update(await screen.findByPlaceholderText('e.g. Away Message'), 'Follow up')
      await fireEvent.click(screen.getByText('Select a node type'))
      await fireEvent.click(
        Array.from(document.querySelectorAll('.n-base-select-option')).find(
          (el) => el.textContent?.trim() === 'Add Comment',
        )!,
      )
      await fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByText('Create failed')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g. Away Message')).toHaveValue('Follow up')
    })

    it('reports a failed demo reset and keeps the current flow', async () => {
      const { router } = await renderAt(
        '/',
        failing({ reset: () => Promise.reject(new Error('Reset failed')) }),
      )
      await revealNodes()
      await fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
      await fireEvent.click(await screen.findByText('Reset demo data…'))
      await fireEvent.click(await screen.findByRole('button', { name: 'Reset' }))
      expect(await screen.findByText('Reset failed')).toBeInTheDocument()
      expect(screen.queryByText('Demo flow restored')).toBeNull()
      expect(router.currentRoute.value.fullPath).toBe('/')
    })

    it('reports an undo that fails and keeps it available', async () => {
      const { api } = createTestApi()
      const updateNode = vi.fn(api.updateNode)
      await renderAt('/nodes/e879e4', { ...api, updateNode })
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Flag VIP')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')

      updateNode.mockRejectedValueOnce(new Error('Undo failed'))
      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      expect(await screen.findByText('Undo failed')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled())
    })
  })

  describe('drawer', () => {
    it('closes from its ✕ button', async () => {
      const { router } = await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.click(document.querySelector('.n-drawer .n-base-close') as HTMLElement)
      await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
    })

    it('saves Send Message texts', async () => {
      const { api } = await renderAt('/nodes/b6a0c1')
      await waitFor(() => expect(drawerTitle()).toBe('Away Message'))
      await fireEvent.update(await screen.findByPlaceholderText('Type a message'), 'Back soon!')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      const saved = (await api.getNodes()).find((n) => n.id === 'b6a0c1')
      expect(saved).toMatchObject({ data: { payload: [{ type: 'text', text: 'Back soon!' }] } })
    })

    it('keeps Business Hours times and timezone when only the title changes', async () => {
      const { api } = await renderAt('/nodes/d09c08')
      await waitFor(() => expect(drawerTitle()).toBe('Business Hours'))
      await screen.findByLabelText('Mon opening time')
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Opening hours')
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Changes saved')
      const saved = (await api.getNodes()).find((n) => n.id === 'd09c08')
      expect(saved).toMatchObject({
        name: 'Opening hours',
        data: {
          timezone: 'UTC',
          times: expect.arrayContaining([
            expect.objectContaining({ day: 'mon', startTime: '09:00' }),
          ]),
        },
      })
    })

    it('stops highlighting a step a moment after undo/redo', async () => {
      await renderAt('/')
      await revealNodes()
      await fireEvent.keyDown(await card('Welcome Message'), { key: 'ArrowRight' })
      await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
      const highlighted = () =>
        document.querySelector('.vue-flow__node[data-id="b0653a"] [data-highlighted]')
      await waitFor(() => expect(highlighted()).not.toBeNull())
      await waitFor(() => expect(highlighted()).toBeNull(), { timeout: 3000 })
    })
  })

  describe('page structure', () => {
    it('has headings in order: page, steps section, then each step', async () => {
      await renderAt('/')
      await revealNodes()
      expect(screen.getByRole('heading', { level: 1, name: 'Flow Builder' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Flow steps' })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0)
    })

    it('announces toasts through a live region inside a landmark', async () => {
      await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      const toast = await screen.findByText('Changes saved')
      const live = toast.closest('[role="status"]')
      expect(live).toHaveAttribute('aria-live', 'polite')
      expect(live?.closest('section')).toHaveAccessibleName('Notifications')
    })

    it('names the confirmation dialogs by their question', async () => {
      await renderAt('/nodes/e879e4')
      await waitFor(() => expect(drawerTitle()).toBe('Add Comment #1'))
      await fireEvent.update(screen.getByPlaceholderText('e.g. Welcome Message'), 'Changed')
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(
        await screen.findByRole('dialog', { name: 'Discard unsaved changes?' }),
      ).toBeInTheDocument()
    })

    it('keeps the More actions menu inside the header', async () => {
      await renderAt('/')
      await fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
      const option = await screen.findByText('Reset demo data…')
      expect(option.closest('header')).not.toBeNull()
    })
  })
})
