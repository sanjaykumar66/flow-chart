import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { mount } from '@vue/test-utils'
import { NModal } from 'naive-ui'
import DeleteNodeModal from '@/components/DeleteNodeModal.vue'

function renderModal(props: Record<string, unknown> = {}) {
  const onConfirm = vi.fn()
  const onUpdateShow = vi.fn()
  const utils = render(DeleteNodeModal, {
    props: { show: true, onConfirm, 'onUpdate:show': onUpdateShow, ...props },
  })
  return { ...utils, onConfirm, onUpdateShow, user: userEvent.setup() }
}

describe('DeleteNodeModal', () => {
  it('renders nothing while closed', () => {
    renderModal({ show: false })
    expect(screen.queryByText('Delete node?')).not.toBeInTheDocument()
  })

  it('is a dialog named by its question', () => {
    renderModal()
    expect(screen.getByRole('dialog', { name: 'Delete node?' })).toBeInTheDocument()
  })

  it('names the node being deleted', () => {
    renderModal({ nodeTitle: 'Welcome Message' })
    expect(screen.getByText('Delete node?')).toBeInTheDocument()
    expect(screen.getByText('“Welcome Message”')).toBeInTheDocument()
  })

  it('falls back to a generic message without a title', () => {
    renderModal()
    expect(screen.getByText(/This node will be removed from the flow/)).toBeInTheDocument()
  })

  it('emits confirm and stays open for the caller to close', async () => {
    const { user, onConfirm, onUpdateShow } = renderModal({ nodeTitle: 'Welcome Message' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onUpdateShow).not.toHaveBeenCalled()
  })

  it('closes from Cancel without confirming', async () => {
    const { user, onConfirm, onUpdateShow } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onUpdateShow).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('blocks Cancel while deleting', () => {
    renderModal({ loading: true })
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('reports when it has finished closing', () => {
    const wrapper = mount(DeleteNodeModal, { props: { show: true } })
    wrapper.findComponent(NModal).vm.$emit('after-leave')
    expect(wrapper.emitted('closed')).toHaveLength(1)
    wrapper.unmount()
  })
})
