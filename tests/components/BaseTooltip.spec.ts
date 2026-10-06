import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import BaseTooltip from '@/components/BaseTooltip.vue'

const tooltip = () => document.querySelector('.n-tooltip')

function renderTooltip(props: Record<string, unknown> = {}) {
  render(BaseTooltip, {
    props: { text: 'Zoom in (+)', ...props },
    slots: { default: '<button>Zoom in</button>' },
  })
  return screen.getByRole('button', { name: 'Zoom in' })
}

describe('BaseTooltip', () => {
  it('shows on hover and hides when the pointer leaves', async () => {
    const button = renderTooltip()
    await fireEvent.mouseEnter(button.parentElement!)
    await waitFor(() => expect(tooltip()).toHaveTextContent('Zoom in (+)'))
    await fireEvent.mouseLeave(button.parentElement!)
    await waitFor(() => expect(tooltip()).not.toBeVisible())
  })

  it('shows on keyboard focus and hides on blur', async () => {
    const button = renderTooltip()
    await fireEvent.focusIn(button)
    await waitFor(() => expect(tooltip()).toBeVisible())
    await fireEvent.focusOut(button)
    await waitFor(() => expect(tooltip()).not.toBeVisible())
  })

  it('closes with Esc without letting the Esc reach the page (WCAG 1.4.13)', async () => {
    const button = renderTooltip()
    await fireEvent.focusIn(button)
    await waitFor(() => expect(tooltip()).toBeVisible())

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    button.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => expect(tooltip()).not.toBeVisible())
  })

  it('leaves Esc alone while it is hidden', () => {
    const button = renderTooltip()
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    button.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('stays hidden while disabled', async () => {
    const button = renderTooltip({ disabled: true })
    await fireEvent.mouseEnter(button.parentElement!)
    expect(tooltip()).toBeNull()
  })
})
