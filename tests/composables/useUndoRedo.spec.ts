import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import type { FlowApi } from '@/api/flowApi'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { FLOW_API_KEY, flowKeys } from '@/queries/flow'
import { useCanvasStore } from '@/stores/canvas'
import { useHistoryStore } from '@/stores/history'
import type { RawFlowNode } from '@/types/flow'
import { emptyNodeForm, toNodeForm } from '@/utils/nodeForm'
import { createTestQueryClient } from '../helpers/queryClient'
import { createTestApi } from '../helpers/testApi'

async function setup(
  api: FlowApi = createTestApi().api,
  onError = vi.fn(),
  onApplied = vi.fn(),
  beforeApply?: NonNullable<Parameters<typeof useUndoRedo>[0]>['beforeApply'],
) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(flowKeys.nodes(), await api.getNodes())
  const pinia = createPinia()
  let undoRedo!: ReturnType<typeof useUndoRedo>
  const wrapper = mount(
    defineComponent({
      setup() {
        undoRedo = useUndoRedo({ onError, onApplied, beforeApply })
        return () => h('div')
      },
    }),
    {
      attachTo: document.body,
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        provide: { [FLOW_API_KEY]: api },
      },
    },
  )
  const canvas = useCanvasStore(pinia)
  const nodes = () => queryClient.getQueryData<RawFlowNode[]>(flowKeys.nodes())!
  return { undoRedo, canvas, api, nodes, wrapper, onError, onApplied }
}

const titleOf = (nodes: RawFlowNode[], id: string) => nodes.find((n) => n.id === id)?.name

describe('useUndoRedo', () => {
  describe('moves', () => {
    it('undoes a first move back to the auto-layout and redoes it', async () => {
      const { undoRedo, canvas } = await setup()
      undoRedo.recordMove('b6a0c1', 'Move', null, { x: 500, y: 100 })
      canvas.moveNode('b6a0c1', { x: 500, y: 100 })

      await undoRedo.undo()
      expect(canvas.positions.b6a0c1).toBeUndefined()
      await undoRedo.redo()
      expect(canvas.positions.b6a0c1).toEqual({ x: 500, y: 100 })
    })

    it('undoes a later move back to the previous dragged position', async () => {
      const { undoRedo, canvas } = await setup()
      canvas.moveNode('1', { x: 10, y: 10 })
      undoRedo.recordMove('1', 'Move', { x: 10, y: 10 }, { x: 99, y: 99 })
      canvas.moveNode('1', { x: 99, y: 99 })

      await undoRedo.undo()
      expect(canvas.positions['1']).toEqual({ x: 10, y: 10 })
    })

    it('undoes quick arrow-key moves of a step as one move', async () => {
      const { undoRedo, canvas } = await setup()
      undoRedo.recordMove('1', 'Move', null, { x: 10, y: 0 }, { keyboard: true })
      canvas.moveNode('1', { x: 10, y: 0 })
      undoRedo.recordMove('1', 'Move', { x: 10, y: 0 }, { x: 20, y: 0 }, { keyboard: true })
      canvas.moveNode('1', { x: 20, y: 0 })

      await undoRedo.undo()
      expect(canvas.positions['1']).toBeUndefined()
      expect(undoRedo.canUndo.value).toBe(false)
      await undoRedo.redo()
      expect(canvas.positions['1']).toEqual({ x: 20, y: 0 })
    })

    it('keeps arrow-key moves apart after a pause, or for another step', async () => {
      const { undoRedo } = await setup()
      vi.useFakeTimers({ toFake: ['Date'] })
      undoRedo.recordMove('1', 'Move', null, { x: 10, y: 0 }, { keyboard: true })
      vi.setSystemTime(Date.now() + 1500)
      undoRedo.recordMove('1', 'Move', { x: 10, y: 0 }, { x: 20, y: 0 }, { keyboard: true })
      undoRedo.recordMove('b6a0c1', 'Move', null, { x: 5, y: 5 }, { keyboard: true })
      undoRedo.recordMove('b6a0c1', 'Move', { x: 5, y: 5 }, { x: 9, y: 9 }) // a drag
      vi.useRealTimers()
      const history = useHistoryStore()
      expect(history.past).toHaveLength(4)
    })

    it('resets the layout as one undoable change', async () => {
      const { undoRedo, canvas, onApplied } = await setup()
      canvas.moveNode('1', { x: 10, y: 10 })
      canvas.moveNode('b6a0c1', { x: 20, y: 20 })
      undoRedo.resetLayout()
      expect(canvas.positions).toEqual({})
      expect(undoRedo.nextUndo.value?.label).toBe('Reset layout')

      await undoRedo.undo()
      expect(canvas.positions).toEqual({ '1': { x: 10, y: 10 }, b6a0c1: { x: 20, y: 20 } })
      expect(onApplied).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'layout' }),
        'undo',
      )
      await undoRedo.redo()
      expect(canvas.positions).toEqual({})
    })

    it('records nothing when the layout is already automatic', async () => {
      const { undoRedo } = await setup()
      undoRedo.resetLayout()
      expect(undoRedo.canUndo.value).toBe(false)
    })

    it('ignores a "move" that ends where it started', async () => {
      const { undoRedo } = await setup()
      undoRedo.recordMove('1', 'Move', { x: 5, y: 5 }, { x: 5, y: 5 })
      expect(undoRedo.canUndo.value).toBe(false)
    })
  })

  describe('edits', () => {
    it('restores the previous details, saved through the API, and redoes them', async () => {
      const { undoRedo, api, nodes } = await setup()
      const before = toNodeForm(nodes().find((n) => n.id === 'e879e4')!)
      const after = { ...before, title: 'Flag VIP' }
      await api.updateNode('e879e4', after)
      undoRedo.recordEdit('e879e4', 'Edit', before, after)

      await undoRedo.undo()
      expect(titleOf(nodes(), 'e879e4')).toBe('Add Comment #1')
      expect(titleOf(await api.getNodes(), 'e879e4')).toBe('Add Comment #1')

      await undoRedo.redo()
      expect(titleOf(nodes(), 'e879e4')).toBe('Flag VIP')
      expect(titleOf(await api.getNodes(), 'e879e4')).toBe('Flag VIP')
    })

    it('keeps the entry and reports the error when saving fails', async () => {
      const { api } = createTestApi()
      const failing = { ...api, updateNode: () => Promise.reject(new Error('Server down')) }
      const { undoRedo, onError } = await setup(failing)
      undoRedo.recordEdit('e879e4', 'Edit', emptyNodeForm(), { ...emptyNodeForm(), title: 'x' })

      await undoRedo.undo()
      expect(onError).toHaveBeenCalledWith('Server down')
      expect(undoRedo.canUndo.value).toBe(true)
      expect(undoRedo.canRedo.value).toBe(false)
    })
  })

  describe('feedback', () => {
    it('leaves the history alone when beforeApply says no', async () => {
      const beforeApply = vi.fn().mockResolvedValue(false)
      const { undoRedo, canvas } = await setup(undefined, undefined, undefined, beforeApply)
      undoRedo.recordMove('1', 'Move', null, { x: 5, y: 5 })
      canvas.moveNode('1', { x: 5, y: 5 })

      await undoRedo.undo()
      expect(beforeApply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'move' }), 'undo')
      expect(canvas.positions['1']).toEqual({ x: 5, y: 5 })
      expect(undoRedo.canUndo.value).toBe(true)

      beforeApply.mockResolvedValue(true)
      await undoRedo.undo()
      expect(canvas.positions['1']).toBeUndefined()
    })

    it('asks beforeApply for a redo too', async () => {
      const beforeApply = vi.fn().mockResolvedValue(true)
      const { undoRedo, canvas } = await setup(undefined, undefined, undefined, beforeApply)
      undoRedo.recordMove('1', 'Move', null, { x: 5, y: 5 })
      canvas.moveNode('1', { x: 5, y: 5 })
      await undoRedo.undo()
      beforeApply.mockResolvedValue(false)
      await undoRedo.redo()
      expect(beforeApply).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'move' }),
        'redo',
      )
      expect(canvas.positions['1']).toBeUndefined() // the redo didn't happen
      expect(undoRedo.canRedo.value).toBe(true)
    })

    it('does nothing when there is nothing to undo or redo', async () => {
      const beforeApply = vi.fn()
      const { undoRedo, onApplied } = await setup(undefined, undefined, undefined, beforeApply)
      await undoRedo.undo()
      await undoRedo.redo()
      expect(beforeApply).not.toHaveBeenCalled()
      expect(onApplied).not.toHaveBeenCalled()
    })

    it('reports each applied change with its direction', async () => {
      const { undoRedo, onApplied } = await setup()
      undoRedo.recordMove('1', 'Move “Trigger”', null, { x: 1, y: 2 })
      await undoRedo.undo()
      await undoRedo.redo()
      expect(onApplied.mock.calls.map(([entry, direction]) => [entry.label, direction])).toEqual([
        ['Move “Trigger”', 'undo'],
        ['Move “Trigger”', 'redo'],
      ])
    })

    it('does not report a change that failed to apply', async () => {
      const { api } = createTestApi()
      const failing = { ...api, updateNode: () => Promise.reject(new Error('down')) }
      const { undoRedo, onApplied } = await setup(failing)
      undoRedo.recordEdit('e879e4', 'Edit', emptyNodeForm(), { ...emptyNodeForm(), title: 'x' })
      await undoRedo.undo()
      expect(onApplied).not.toHaveBeenCalled()
    })
  })

  describe('keyboard', () => {
    const press = (init: KeyboardEventInit, target: EventTarget = document.body) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
      )

    it('undoes with Ctrl+Z and redoes with Ctrl+Y / Ctrl+Shift+Z', async () => {
      const { undoRedo, canvas } = await setup()
      undoRedo.recordMove('1', 'Move', null, { x: 1, y: 2 })
      canvas.moveNode('1', { x: 1, y: 2 })

      press({ key: 'z', ctrlKey: true })
      await vi.waitFor(() => expect(canvas.positions['1']).toBeUndefined())
      press({ key: 'y', ctrlKey: true })
      await vi.waitFor(() => expect(canvas.positions['1']).toEqual({ x: 1, y: 2 }))
      press({ key: 'z', ctrlKey: true })
      press({ key: 'Z', ctrlKey: true, shiftKey: true })
      await vi.waitFor(() => expect(canvas.positions['1']).toEqual({ x: 1, y: 2 }))
    })

    it('leaves text undo alone while typing in a field', async () => {
      const { undoRedo, canvas } = await setup()
      undoRedo.recordMove('1', 'Move', null, { x: 1, y: 2 })
      canvas.moveNode('1', { x: 1, y: 2 })
      const input = document.body.appendChild(document.createElement('input'))

      press({ key: 'z', ctrlKey: true }, input)
      expect(canvas.positions['1']).toEqual({ x: 1, y: 2 })
    })

    it('stops listening when unmounted', async () => {
      const { undoRedo, canvas, wrapper } = await setup()
      undoRedo.recordMove('1', 'Move', null, { x: 1, y: 2 })
      canvas.moveNode('1', { x: 1, y: 2 })
      wrapper.unmount()
      press({ key: 'z', ctrlKey: true })
      expect(canvas.positions['1']).toEqual({ x: 1, y: 2 })
    })
  })
})
