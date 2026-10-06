import { isMac } from '@/utils/keyboard'

export interface Shortcut {
  /** Key combinations; any one of them works. */
  keys: string[][]
  description: string
}

/** Everything the app does from the keyboard, shown in the Keyboard shortcuts dialog. */
export function getShortcuts(mac = isMac()): { title: string; items: Shortcut[] }[] {
  const mod = mac ? '⌘' : 'Ctrl'
  return [
    {
      title: 'Canvas',
      items: [
        { keys: [['Tab'], ['Shift', 'Tab']], description: 'Move between steps and buttons' },
        { keys: [['Enter'], ['Space']], description: 'Open or close the focused step' },
        { keys: [['←', '↑', '→', '↓']], description: 'Move the focused step' },
        { keys: [['Shift', 'Arrow key']], description: 'Move the focused step further' },
        { keys: [['↑'], ['↓']], description: 'Move between the zoom controls' },
      ],
    },
    {
      title: 'Editing',
      items: [
        { keys: [[mod, 'Z']], description: 'Undo the last move or saved edit' },
        {
          keys: mac
            ? [['⇧', '⌘', 'Z']]
            : [
                ['Ctrl', 'Shift', 'Z'],
                ['Ctrl', 'Y'],
              ],
          description: 'Redo',
        },
        { keys: [['Esc']], description: 'Close the details panel or a dialog' },
      ],
    },
    {
      title: 'Help',
      items: [{ keys: [['?']], description: 'Show these shortcuts' }],
    },
  ]
}
