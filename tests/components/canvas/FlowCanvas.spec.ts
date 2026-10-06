import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { mount } from '@vue/test-utils'
import { VueFlow } from '@vue-flow/core'
import FlowCanvas from '@/components/canvas/FlowCanvas.vue'
import { buildGraph } from '@/utils/flowGraph'
import { loadPayload } from '../../fixtures/payload'

async function renderCanvas(selectedId: string | null = null) {
  const graph = buildGraph(loadPayload(), { selectedId })
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  const onMove = vi.fn()
  const utils = render(FlowCanvas, {
    props: { nodes: graph.nodes, edges: graph.edges, onSelect, onAdd, onMove },
  })

  // Vue Flow keeps nodes `visibility: hidden` until it has measured them, which never happens
  // without a layout engine. Reveal them so accessibility queries see them like a user would.
  await waitFor(() => expect(utils.container.querySelectorAll('.vue-flow__node')).toHaveLength(7))
  utils.container.querySelectorAll<HTMLElement>('.vue-flow__node').forEach((node) => {
    node.style.visibility = 'visible'
  })

  return { ...utils, graph, onSelect, onAdd, onMove }
}

/** Mounted with Vue Test Utils, to reach the VueFlow component and the exposed methods. */
async function mountCanvas(props: Record<string, unknown> = {}) {
  const graph = buildGraph(loadPayload())
  const wrapper = mount(FlowCanvas, {
    props: { nodes: graph.nodes, edges: graph.edges, ...props },
    attachTo: document.body,
  })
  await waitFor(() => expect(wrapper.findAll('.vue-flow__node')).toHaveLength(7))
  return wrapper
}

const card = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title},`) })

describe('FlowCanvas', () => {
  // Vue Flow warns about missing container size/styles, which a DOM without layout can't provide.
  beforeEach(() => {
    const warn = console.warn
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).startsWith('[Vue Flow]')) warn(...args)
    })
  })

  it('renders every step card and the Success/Failure labels', async () => {
    await renderCanvas()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
    for (const title of ['Trigger', 'Business Hours', 'Welcome Message', 'Away Message']) {
      expect(card(title)).toBeInTheDocument()
    }
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Failure')).toBeInTheDocument()
  })

  it('shows each card’s description and type in its accessible name', async () => {
    await renderCanvas()
    expect(card('Business Hours')).toHaveAccessibleName(
      'Business Hours, Business Hours. Open details',
    )
    expect(screen.getByText('Conversation Opened')).toBeInTheDocument()
  })

  it('opens a step with Enter or Space', async () => {
    const { onSelect } = await renderCanvas()

    await fireEvent.keyDown(card('Away Message'), { key: 'Enter' })
    await fireEvent.keyDown(card('Trigger'), { key: ' ' })
    expect(onSelect.mock.calls).toEqual([['b6a0c1'], ['1']])
  })

  it('marks the selected step', async () => {
    await renderCanvas('d09c08')
    expect(card('Business Hours')).toHaveAttribute('aria-pressed', 'true')
    expect(card('Trigger')).toHaveAttribute('aria-pressed', 'false')
  })

  it('emits add after the last step of a branch', async () => {
    const { onAdd } = await renderCanvas()

    const stubs = screen.getAllByRole('button', { name: 'Add a step after this one' })
    expect(stubs).toHaveLength(2) // Welcome Message and Add Comment #1 end their branches
    await fireEvent.click(stubs[0]!)
    expect(onAdd).toHaveBeenCalledWith({ parentId: 'b0653a', childId: undefined })
  })

  it('emits add with both ends when "+" on an edge is clicked', async () => {
    const { onAdd } = await renderCanvas()
    const buttons = screen.getAllByRole('button', { name: /^Add a step between/ })
    // 6 links, minus the 2 from Business Hours into Success/Failure
    expect(buttons).toHaveLength(4)

    await fireEvent.click(buttons[0]!)
    expect(onAdd).toHaveBeenCalledTimes(1)
    const [{ parentId, childId }] = onAdd.mock.calls[0]!
    expect(parentId).toBeTruthy()
    expect(childId).toBeTruthy()
  })

  it('does not make Success/Failure focusable or clickable', async () => {
    await renderCanvas()
    expect(screen.queryByRole('button', { name: /^(Success|Failure)$/ })).not.toBeInTheDocument()
  })

  it('offers a "+" to add the first step of an empty branch', async () => {
    const nodes = loadPayload().filter((n) => n.id !== 'b0653a')
    const graph = buildGraph(nodes)
    const onAdd = vi.fn()
    const { container } = render(FlowCanvas, {
      props: { nodes: graph.nodes, edges: graph.edges, onAdd },
    })
    await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(6))
    const button = container.querySelector(
      '[aria-label="Add the first step to the Success branch"]',
    ) as HTMLElement
    await fireEvent.click(button)
    expect(onAdd).toHaveBeenCalledWith({ parentId: '161f52', childId: undefined })
  })

  it('names both steps on the "+" between them', async () => {
    await renderCanvas()
    expect(
      screen.getByRole('button', { name: 'Add a step between “Trigger” and “Business Hours”' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Add a step between “Failure” and “Away Message”',
      }),
    ).toBeInTheDocument()
  })

  describe('keyboard', () => {
    it('gives each step a single Tab stop (the card, not Vue Flow’s wrapper)', async () => {
      const { container } = await renderCanvas()
      container.querySelectorAll('.vue-flow__node').forEach((node) => {
        expect(node).not.toHaveAttribute('tabindex', '0')
      })
      expect(
        container.querySelectorAll('.vue-flow__node [role="button"][tabindex="0"]'),
      ).toHaveLength(5)
    })

    it('describes the keyboard controls on every card', async () => {
      await renderCanvas()
      expect(card('Trigger')).toHaveAccessibleDescription(
        /Press Enter or Space to open the step's details. Use the arrow keys to move it/,
      )
    })

    it.each([
      ['ArrowRight', false, { x: 10, y: 0 }],
      ['ArrowLeft', false, { x: -10, y: 0 }],
      ['ArrowDown', true, { x: 0, y: 50 }],
      ['ArrowUp', true, { x: 0, y: -50 }],
    ])('moves the focused step with %s (Shift: %s)', async (key, shiftKey, delta) => {
      const { onMove, graph } = await renderCanvas()
      const start = graph.nodes.find((n) => n.id === '1')!.position
      await fireEvent.keyDown(card('Trigger'), { key, shiftKey })
      expect(onMove).toHaveBeenCalledWith(
        '1',
        { x: start.x + delta.x, y: start.y + delta.y },
        'keyboard',
      )
    })

    it('ignores other keys', async () => {
      const { onMove } = await renderCanvas()
      await fireEvent.keyDown(card('Trigger'), { key: 'a' })
      expect(onMove).not.toHaveBeenCalled()
    })
  })

  describe('Vue Flow events', () => {
    it('opens a step on click, but not a Success/Failure label', async () => {
      const onSelect = vi.fn()
      const wrapper = await mountCanvas({ onSelect })
      const flow = wrapper.findComponent(VueFlow)
      flow.vm.$emit('node-click', { node: { id: 'b6a0c1', type: 'action' } })
      flow.vm.$emit('node-click', { node: { id: '161f52', type: 'connector' } })
      expect(onSelect.mock.calls).toEqual([['b6a0c1']])
      wrapper.unmount()
    })

    it('reports where a dragged step was dropped', async () => {
      const onMove = vi.fn()
      const wrapper = await mountCanvas({ onMove })
      wrapper
        .findComponent(VueFlow)
        .vm.$emit('node-drag-stop', { node: { id: 'b6a0c1', position: { x: 12, y: 34 } } })
      expect(onMove).toHaveBeenCalledWith('b6a0c1', { x: 12, y: 34 }, 'drag')
      wrapper.unmount()
    })
  })

  describe('exposed', () => {
    it('moves keyboard focus to a step, and reports when it is not there', async () => {
      const wrapper = await mountCanvas()
      const canvas = wrapper.vm as unknown as { focusStep: (id: string) => boolean }
      expect(canvas.focusStep('b6a0c1')).toBe(true)
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Away Message,/)
      expect(canvas.focusStep('nope')).toBe(false)
      wrapper.unmount()
    })

    it('ignores a pan request for a step that has not been measured', async () => {
      const wrapper = await mountCanvas()
      await wrapper.setProps({ focusRequest: { id: 'b6a0c1', seq: 1 } })
      await wrapper.setProps({ focusRequest: { id: 'nope', seq: 2 } })
      expect(wrapper.exists()).toBe(true)
      wrapper.unmount()
    })
  })
})
