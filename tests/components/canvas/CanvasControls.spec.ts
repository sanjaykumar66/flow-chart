import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { ref } from 'vue'
import CanvasControls from '@/components/canvas/CanvasControls.vue'
import { FIT_VIEW_PADDING } from '@/constants/canvas'

// Stand-in for Vue Flow's store; the real one needs a measured canvas.
const flow = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  fitView: vi.fn(),
  viewport: undefined as unknown as { value: { x: number; y: number; zoom: number } },
  minZoom: undefined as unknown as { value: number },
  maxZoom: undefined as unknown as { value: number },
}))

vi.mock('@vue-flow/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vue-flow/core')>()),
  useVueFlow: () => flow,
}))

function setFullscreenSupport(enabled: boolean) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: enabled, configurable: true })
}

describe('CanvasControls', () => {
  beforeEach(() => {
    flow.viewport = ref({ x: 0, y: 0, zoom: 1 })
    flow.minZoom = ref(0.3)
    flow.maxZoom = ref(1.5)
    setFullscreenSupport(true)
  })

  afterEach(() => setFullscreenSupport(false))

  it('renders zoom in, zoom out, fit view and fullscreen in a labelled toolbar', () => {
    render(CanvasControls)
    expect(screen.getByRole('toolbar', { name: 'Canvas controls' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Zoom in',
      'Zoom out',
      'Fit flow to screen',
      'Enter fullscreen',
    ])
  })

  it('zooms in and out with a short animation', async () => {
    render(CanvasControls)
    await fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(flow.zoomIn).toHaveBeenCalledWith({ duration: 200 })
    expect(flow.zoomOut).toHaveBeenCalledWith({ duration: 200 })
  })

  it('fits the whole flow on screen', async () => {
    render(CanvasControls)
    await fireEvent.click(screen.getByRole('button', { name: 'Fit flow to screen' }))
    expect(flow.fitView).toHaveBeenCalledWith({ duration: 200, padding: FIT_VIEW_PADDING })
  })

  it('disables zoom in at the maximum zoom', () => {
    flow.viewport.value.zoom = 1.5
    render(CanvasControls)
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
  })

  it('disables zoom out at the minimum zoom', () => {
    flow.viewport.value.zoom = 0.3
    render(CanvasControls)
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
  })

  it('requests fullscreen for the whole page', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = request
    render(CanvasControls)

    await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }))
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('offers to exit fullscreen while in fullscreen', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const exit = vi.fn().mockResolvedValue(undefined)
    document.exitFullscreen = exit
    render(CanvasControls)
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
    })
    document.dispatchEvent(new Event('fullscreenchange'))
    const button = await screen.findByRole('button', { name: 'Exit fullscreen' })
    await fireEvent.click(button)
    expect(exit).toHaveBeenCalledOnce()
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
  })

  it('hides the fullscreen button when the browser does not support it', () => {
    setFullscreenSupport(false)
    render(CanvasControls)
    expect(screen.queryByRole('button', { name: /fullscreen/ })).not.toBeInTheDocument()
  })

  describe('tooltips', () => {
    // Naive keeps the tooltip element after first show and hides it with display: none.
    const tooltip = () => document.querySelector('.n-tooltip')

    it.each([
      ['Zoom in', 'Zoom in'],
      ['Zoom out', 'Zoom out'],
      ['Fit flow to screen', 'Fit flow to screen'],
      ['Enter fullscreen', 'Enter fullscreen'],
    ])('shows "%s" on hover', async (name, text) => {
      render(CanvasControls)
      await fireEvent.mouseEnter(screen.getByRole('button', { name }).parentElement!)
      await waitFor(() => expect(tooltip()).toHaveTextContent(text))
    })

    it('hides the tooltip when the pointer leaves', async () => {
      render(CanvasControls)
      const wrapper = screen.getByRole('button', { name: 'Zoom in' }).parentElement!
      await fireEvent.mouseEnter(wrapper)
      await waitFor(() => expect(tooltip()).toBeVisible())
      await fireEvent.mouseLeave(wrapper)
      await waitFor(() => expect(tooltip()).not.toBeVisible())
    })

    it('shows the tooltip on keyboard focus', async () => {
      render(CanvasControls)
      await fireEvent.focusIn(screen.getByRole('button', { name: 'Fit flow to screen' }))
      await waitFor(() => expect(tooltip()).toHaveTextContent('Fit flow to screen'))
    })

    it('explains why a zoom button is disabled', async () => {
      flow.viewport.value.zoom = 1.5
      render(CanvasControls)
      await fireEvent.mouseEnter(screen.getByRole('button', { name: 'Zoom in' }).parentElement!)
      await waitFor(() => expect(tooltip()).toHaveTextContent('Maximum zoom reached'))
    })
  })

  describe('keyboard (ARIA toolbar)', () => {
    const button = (name: string | RegExp) => screen.getByRole('button', { name })

    it('is a single Tab stop', () => {
      render(CanvasControls)
      expect(button('Zoom in')).toHaveAttribute('tabindex', '0')
      for (const name of ['Zoom out', 'Fit flow to screen', 'Enter fullscreen']) {
        expect(button(name)).toHaveAttribute('tabindex', '-1')
      }
    })

    it('moves with ↑/↓, wraps around, and jumps with Home/End', async () => {
      render(CanvasControls)
      button('Zoom in').focus()
      await fireEvent.keyDown(button('Zoom in'), { key: 'ArrowDown' })
      expect(button('Zoom out')).toHaveFocus()
      expect(button('Zoom out')).toHaveAttribute('tabindex', '0')
      await fireEvent.keyDown(button('Zoom out'), { key: 'End' })
      expect(button('Enter fullscreen')).toHaveFocus()
      await fireEvent.keyDown(button('Enter fullscreen'), { key: 'ArrowDown' })
      expect(button('Zoom in')).toHaveFocus()
      await fireEvent.keyDown(button('Zoom in'), { key: 'ArrowUp' })
      expect(button('Enter fullscreen')).toHaveFocus()
      await fireEvent.keyDown(button('Enter fullscreen'), { key: 'Home' })
      expect(button('Zoom in')).toHaveFocus()
    })

    it('skips disabled buttons', async () => {
      flow.viewport.value.zoom = 1.5 // zoom in disabled
      render(CanvasControls)
      expect(button('Zoom out')).toHaveAttribute('tabindex', '0')
      button('Zoom out').focus()
      await fireEvent.keyDown(button('Zoom out'), { key: 'ArrowUp' })
      expect(button('Enter fullscreen')).toHaveFocus()
    })

    it('zooms without animation when reduced motion is preferred', async () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
      render(CanvasControls)
      await fireEvent.click(button('Zoom in'))
      expect(flow.zoomIn).toHaveBeenLastCalledWith({ duration: 0 })
      vi.restoreAllMocks()
    })
  })
})
