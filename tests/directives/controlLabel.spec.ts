/* eslint-disable vue/one-component-per-file -- small host components for the directive */
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref, withDirectives, nextTick } from 'vue'
import { render } from '@testing-library/vue'
import { vControlLabel } from '@/directives/controlLabel'

const Host = defineComponent({
  props: { label: { type: String, required: true }, withInput: Boolean },
  setup(props) {
    return () =>
      withDirectives(
        h('div', [
          h('div', { tabindex: 0, class: 'box' }),
          props.withInput ? h('input', { tabindex: -1 }) : null,
        ]),
        [[vControlLabel, props.label]],
      )
  },
})

describe('vControlLabel', () => {
  it('names the focusable box of a select', () => {
    const { container } = render(Host, { props: { label: 'Type of Node' } })
    expect(container.querySelector('.box')).toHaveAttribute('aria-label', 'Type of Node')
  })

  it('names both the box and the search input of a filterable select', () => {
    const { container } = render(Host, { props: { label: 'Connect after', withInput: true } })
    expect(container.querySelector('.box')).toHaveAttribute('aria-label', 'Connect after')
    expect(container.querySelector('input')).toHaveAttribute('aria-label', 'Connect after')
  })

  it('follows label changes', async () => {
    const label = ref('First')
    const { container } = render(
      defineComponent({ setup: () => () => h(Host, { label: label.value }) }),
    )
    label.value = 'Second'
    await nextTick()
    expect(container.querySelector('.box')).toHaveAttribute('aria-label', 'Second')
  })
})
