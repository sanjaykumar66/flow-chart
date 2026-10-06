import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { mount } from '@vue/test-utils'
import BaseDrawer from '@/components/BaseDrawer.vue'

function renderDrawer(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const onUpdateShow = vi.fn()
  const utils = render(BaseDrawer, {
    props: { show: true, 'onUpdate:show': onUpdateShow, ...props },
    slots: { default: '<p>Body content</p>', ...slots },
  })
  return { ...utils, onUpdateShow }
}

describe('BaseDrawer', () => {
  it('renders nothing while closed', () => {
    renderDrawer({ show: false })
    expect(screen.queryByText('Body content')).not.toBeInTheDocument()
  })

  it('shows the title, description, icon and content when open', () => {
    renderDrawer({
      title: 'Business Hours',
      description: 'Branch on date and time',
      icon: CalendarDaysIcon,
      iconColor: 'rgb(234, 88, 12)',
    })

    expect(screen.getByRole('heading', { name: 'Business Hours' })).toBeInTheDocument()
    expect(screen.getByText('Branch on date and time')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(document.querySelector('.n-drawer-header svg[aria-hidden="true"]')).toHaveStyle({
      color: 'rgb(234, 88, 12)',
    })
  })

  it('renders the footer slot only when provided', () => {
    renderDrawer({}, { footer: '<button>Save</button>' })
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('has no footer when no footer slot is given', () => {
    renderDrawer()
    expect(document.querySelector('.n-drawer-footer')).not.toBeInTheDocument()
  })

  it('closes from the close button', async () => {
    const { onUpdateShow } = renderDrawer()
    await fireEvent.click(document.querySelector('.n-drawer .n-base-close') as HTMLElement)
    expect(onUpdateShow).toHaveBeenCalledWith(false)
  })

  it('closes on Escape even though focus is outside the drawer', async () => {
    const { onUpdateShow } = renderDrawer()
    await fireEvent.keyDown(document, { key: 'Escape' })
    expect(onUpdateShow).toHaveBeenCalledWith(false)
  })

  it('ignores Escape that something inside already handled', async () => {
    const { onUpdateShow } = renderDrawer()
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(onUpdateShow).not.toHaveBeenCalled()
  })

  it('leaves Escape to a dialog open on top of it', async () => {
    const { onUpdateShow } = renderDrawer()
    const dialog = document.createElement('div')
    dialog.className = 'n-modal-body-wrapper'
    document.body.append(dialog)
    await fireEvent.keyDown(document, { key: 'Escape' })
    expect(onUpdateShow).not.toHaveBeenCalled()
  })

  it('stops listening for Escape once closed', async () => {
    const { onUpdateShow, rerender } = renderDrawer()
    await rerender({ show: false })
    await fireEvent.keyDown(document, { key: 'Escape' })
    expect(onUpdateShow).not.toHaveBeenCalled()
  })

  describe('accessibility', () => {
    it('is a non-modal dialog named by its title', async () => {
      renderDrawer({ title: 'Away Message' })
      const panel = await screen.findByRole('dialog', { name: 'Away Message' })
      expect(panel).toHaveAttribute('aria-modal', 'false')
    })

    it('can move keyboard focus to its title', async () => {
      const wrapper = mount(BaseDrawer, {
        props: { show: true, title: 'Away Message' },
        attachTo: document.body,
      })
      await (wrapper.vm as unknown as { focus: () => Promise<void> }).focus()
      expect(document.activeElement?.tagName).toBe('H2')
      expect(document.activeElement).toHaveTextContent('Away Message')
      wrapper.unmount()
    })
  })
})
