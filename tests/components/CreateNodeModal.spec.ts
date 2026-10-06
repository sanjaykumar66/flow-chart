import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { mount } from '@vue/test-utils'
import { NModal, NTreeSelect } from 'naive-ui'
import { nextTick, type VNode } from 'vue'
import CreateNodeModal from '@/components/CreateNodeModal.vue'
import { buildConnectTree } from '@/utils/connectTree'
import { loadPayload } from '../fixtures/payload'

const parentOptions = buildConnectTree(loadPayload())

function renderModal(props: Record<string, unknown> = {}) {
  const onSubmit = vi.fn()
  const onUpdateShow = vi.fn()
  const onUpdateParentId = vi.fn()
  const utils = render(CreateNodeModal, {
    props: {
      show: true,
      parentOptions,
      parentId: 'b0653a',
      onSubmit,
      'onUpdate:show': onUpdateShow,
      'onUpdate:parentId': onUpdateParentId,
      ...props,
    },
  })
  // Naive UI's select placeholder has pointer-events: none; real clicks land on its parent.
  return {
    ...utils,
    onSubmit,
    onUpdateShow,
    onUpdateParentId,
    user: userEvent.setup({ pointerEventsCheck: 0 }),
  }
}

// user-event's typing doesn't reach Naive UI inputs under happy-dom, so set values directly.
const typeInto = (placeholder: string, value: string) =>
  fireEvent.update(screen.getByPlaceholderText(placeholder), value)

async function chooseType(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByText('Select a node type'))
  const option = Array.from(document.querySelectorAll('.n-base-select-option')).find(
    (el) => el.textContent?.trim() === label,
  )
  await user.click(option as HTMLElement)
}

describe('CreateNodeModal', () => {
  it('renders nothing while closed', () => {
    renderModal({ show: false })
    expect(screen.queryByText('Create New Node')).not.toBeInTheDocument()
  })

  it('shows the title, description and node type fields', () => {
    renderModal()
    expect(screen.getByText('Create New Node')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Away Message')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('What does this step do?')).toBeInTheDocument()
    expect(screen.getByText('Select a node type')).toBeInTheDocument()
  })

  it('lists the three creatable node types', async () => {
    const { user } = renderModal()
    await user.click(screen.getByText('Select a node type'))
    const options = Array.from(document.querySelectorAll('.n-base-select-option'))
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'Send Message',
      'Add Comment',
      'Business Hours',
    ])
  })

  it('shows validation errors and does not submit an empty form', async () => {
    const { user, onSubmit } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    // Placeholder + validation message share the same text.
    expect(screen.getAllByText('Select a node type')).toHaveLength(2)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('treats a whitespace-only title as empty', async () => {
    const { user, onSubmit } = renderModal()
    await typeInto('e.g. Away Message', '   ')
    await chooseType(user, 'Add Comment')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values when the form is valid', async () => {
    const { user, onSubmit } = renderModal()
    await typeInto('e.g. Away Message', '  Away Message  ')
    await typeInto('What does this step do?', ' Off hours ')
    await chooseType(user, 'Send Message')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          title: 'Away Message',
          description: 'Off hours',
          type: 'sendMessage',
        },
        'b0653a',
      ),
    )
  })

  it('closes from Cancel', async () => {
    const { user, onUpdateShow } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onUpdateShow).toHaveBeenCalledWith(false)
  })

  it('blocks Cancel while saving', () => {
    renderModal({ loading: true })
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  describe('connect after', () => {
    // Naive's tree dropdown doesn't open without real layout, so these tests talk to the
    // NTreeSelect component directly; the tree itself is tested in connectTree.spec.ts and the
    // dropdown in the browser.
    const mountModal = (props: Record<string, unknown> = {}) => {
      const onUpdateParentId = vi.fn()
      const wrapper = mount(CreateNodeModal, {
        props: {
          show: true,
          parentOptions,
          parentId: null,
          'onUpdate:parentId': onUpdateParentId,
          ...props,
        },
        attachTo: document.body,
      })
      return { wrapper, onUpdateParentId, tree: () => wrapper.findComponent(NTreeSelect) }
    }

    it('shows the pre-filled step', () => {
      renderModal({ parentId: 'b0653a' })
      expect(screen.getByText('Welcome Message')).toBeInTheDocument()
    })

    it('offers the flow as a searchable tree, fully expanded', () => {
      const { tree, wrapper } = mountModal()
      expect(tree().props('options')).toEqual(parentOptions)
      expect(tree().props('filterable')).toBe(true)
      expect(tree().props('defaultExpandAll')).toBe(true)
      wrapper.unmount()
    })

    it('shows steps with their type icon and Success/Failure as pills', () => {
      const { tree, wrapper } = mountModal()
      const renderLabel = tree().props('renderLabel') as (info: {
        option: Record<string, unknown>
      }) => VNode
      const step = mount(() => renderLabel({ option: { kind: 'sendMessage', label: 'Hi' } }))
      expect(step.text()).toBe('Hi')
      expect(step.find('svg[aria-hidden="true"]').exists()).toBe(true)

      const success = mount(() => renderLabel({ option: { kind: 'success', label: 'Success' } }))
      expect(success.text()).toBe('Success')
      expect(success.classes()).toContain('rounded')
      expect(success.find('svg').exists()).toBe(false)
      wrapper.unmount()
    })

    it('clears the form once it has closed', async () => {
      const { wrapper } = mountModal()
      await typeInto('e.g. Away Message', 'Draft title')
      wrapper.findComponent(NModal).vm.$emit('after-leave')
      await nextTick()
      expect(screen.getByPlaceholderText('e.g. Away Message')).toHaveValue('')
      wrapper.unmount()
    })

    it('reports the chosen step', async () => {
      const { tree, onUpdateParentId, wrapper } = mountModal()
      tree().vm.$emit('update:value', 'b6a0c1')
      expect(onUpdateParentId).toHaveBeenCalledWith('b6a0c1')
      wrapper.unmount()
    })

    it('requires a step to be chosen', async () => {
      const { user, onSubmit } = renderModal({ parentId: null })
      await typeInto('e.g. Away Message', 'Follow up')
      await chooseType(user, 'Add Comment')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByText('Choose where to add the step')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
