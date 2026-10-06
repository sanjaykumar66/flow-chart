import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useHotkey } from '@/composables/useHotkey'

function setup() {
  const handler = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        useHotkey((event) => event.key === '?', handler)
        return () => h('input')
      },
    }),
    { attachTo: document.body },
  )
  return { handler, wrapper }
}

const press = (target: EventTarget, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('useHotkey', () => {
  it('runs on the matching key and claims it', () => {
    const { handler } = setup()
    expect(press(document.body, '?').defaultPrevented).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ignores other keys', () => {
    const { handler } = setup()
    press(document.body, 'a')
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keys typed into a field', () => {
    const { handler, wrapper } = setup()
    press(wrapper.find('input').element, '?')
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keys while a dialog is open', () => {
    const { handler } = setup()
    const dialog = document.createElement('div')
    dialog.className = 'n-modal-body-wrapper'
    document.body.append(dialog)
    press(document.body, '?')
    expect(handler).not.toHaveBeenCalled()
  })

  it('stops listening when unmounted', () => {
    const { handler, wrapper } = setup()
    wrapper.unmount()
    press(document.body, '?')
    expect(handler).not.toHaveBeenCalled()
  })
})
