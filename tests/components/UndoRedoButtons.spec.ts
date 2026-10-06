import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import UndoRedoButtons from '@/components/UndoRedoButtons.vue'

describe('UndoRedoButtons', () => {
  it('disables both buttons when there is no history', () => {
    render(UndoRedoButtons, { props: { canUndo: false, canRedo: false } })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('emits undo and redo', async () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    render(UndoRedoButtons, { props: { canUndo: true, canRedo: true, onUndo, onRedo } })
    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
  })

  it('names the change and the shortcut in the tooltip', async () => {
    render(UndoRedoButtons, {
      props: { canUndo: true, canRedo: false, undoLabel: 'Edit “Away Message”' },
    })
    await fireEvent.mouseEnter(screen.getByRole('button', { name: 'Undo' }).parentElement!)
    await waitFor(() =>
      expect(document.querySelector('.n-tooltip')).toHaveTextContent(
        /Undo: Edit “Away Message” \((⌘|Ctrl\+)Z\)/,
      ),
    )
  })

  it('explains when there is nothing to redo', async () => {
    render(UndoRedoButtons, { props: { canUndo: false, canRedo: false } })
    await fireEvent.mouseEnter(screen.getByRole('button', { name: 'Redo' }).parentElement!)
    await waitFor(() =>
      expect(document.querySelector('.n-tooltip')).toHaveTextContent('Nothing to redo'),
    )
  })

  describe('shortcuts per platform', () => {
    const renderOn = (platform: string) => {
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
      render(UndoRedoButtons, { props: { canUndo: true, canRedo: true } })
    }

    it('uses ⌘ on Mac', () => {
      renderOn('MacIntel')
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute(
        'aria-keyshortcuts',
        'Meta+Z',
      )
      expect(screen.getByRole('button', { name: 'Redo' })).toHaveAttribute(
        'aria-keyshortcuts',
        'Meta+Shift+Z',
      )
      vi.restoreAllMocks()
    })

    it('uses Ctrl elsewhere, with Ctrl+Y for redo', async () => {
      renderOn('Win32')
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+Z',
      )
      expect(screen.getByRole('button', { name: 'Redo' })).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+Y Control+Shift+Z',
      )
      await fireEvent.mouseEnter(screen.getByRole('button', { name: 'Redo' }).parentElement!)
      await waitFor(() =>
        expect(document.querySelector('.n-tooltip')).toHaveTextContent('(Ctrl+Y)'),
      )
      vi.restoreAllMocks()
    })
  })
})
