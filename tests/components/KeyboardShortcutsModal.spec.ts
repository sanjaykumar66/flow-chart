import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue'
import { getShortcuts } from '@/constants/shortcuts'

describe('KeyboardShortcutsModal', () => {
  it('lists every shortcut in a named dialog', async () => {
    render(KeyboardShortcutsModal, { props: { show: true } })
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
    for (const description of [
      'Move the focused step',
      'Undo the last move or saved edit',
      'Close the details panel or a dialog',
      'Show these shortcuts',
    ]) {
      expect(screen.getByText(description)).toBeInTheDocument()
    }
  })
})

describe('getShortcuts', () => {
  const keysFor = (mac: boolean, description: string) =>
    getShortcuts(mac)
      .flatMap((group) => group.items)
      .find((item) => item.description === description)?.keys

  it('uses ⌘ on Mac and Ctrl elsewhere', () => {
    expect(keysFor(true, 'Undo the last move or saved edit')).toEqual([['⌘', 'Z']])
    expect(keysFor(false, 'Undo the last move or saved edit')).toEqual([['Ctrl', 'Z']])
  })

  it('offers Ctrl+Y as well for redo outside Mac', () => {
    expect(keysFor(false, 'Redo')).toEqual([
      ['Ctrl', 'Shift', 'Z'],
      ['Ctrl', 'Y'],
    ])
    expect(keysFor(true, 'Redo')).toEqual([['⇧', '⌘', 'Z']])
  })
})
