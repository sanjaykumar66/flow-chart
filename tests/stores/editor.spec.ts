import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'

describe('editor store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens Create with a pre-filled parent', () => {
    const editor = useEditorStore()
    editor.startCreate('b6a0c1')
    expect(editor.createOpen).toBe(true)
    expect(editor.createParentId).toBe('b6a0c1')
    expect(editor.createFromEdge).toBeNull()
  })

  it('opens Create with nothing pre-filled', () => {
    const editor = useEditorStore()
    editor.startCreate(null)
    expect(editor.createParentId).toBeNull()
  })

  it('inserts between the edge’s steps when its parent is kept', () => {
    const editor = useEditorStore()
    editor.startCreate('b6a0c1', { parentId: 'b6a0c1', childId: 'e879e4' })
    expect(editor.insertTargetFor('b6a0c1')).toEqual({ parentId: 'b6a0c1', childId: 'e879e4' })
  })

  it('inserts right after a different chosen step', () => {
    const editor = useEditorStore()
    editor.startCreate('b6a0c1', { parentId: 'b6a0c1', childId: 'e879e4' })
    expect(editor.insertTargetFor('1')).toEqual({ parentId: '1' })
  })

  it('treats a "+" at the end of a branch as a plain parent', () => {
    const editor = useEditorStore()
    editor.startCreate('b0653a', { parentId: 'b0653a' })
    expect(editor.createFromEdge).toBeNull()
    expect(editor.insertTargetFor('b0653a')).toEqual({ parentId: 'b0653a' })
  })

  it('closes Create and opens/closes Delete', () => {
    const editor = useEditorStore()
    editor.startCreate(null)
    editor.closeCreate()
    expect(editor.createOpen).toBe(false)

    editor.openDelete()
    expect(editor.deleteOpen).toBe(true)
    editor.closeDelete()
    expect(editor.deleteOpen).toBe(false)
  })
})
