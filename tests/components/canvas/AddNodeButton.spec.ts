import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import AddNodeButton from '@/components/canvas/AddNodeButton.vue'

describe('AddNodeButton', () => {
  it('is a labelled button in the given colour', () => {
    render(AddNodeButton, { props: { color: 'rgb(234, 88, 12)', label: 'Add a step' } })
    const button = screen.getByRole('button', { name: 'Add a step' })
    expect(button).toHaveStyle({ color: 'rgb(234, 88, 12)' })
  })

  it('emits click without bubbling to the canvas', async () => {
    const onClick = vi.fn()
    const onParentClick = vi.fn()
    const { container } = render({
      components: { AddNodeButton },
      template: '<div @click="onParentClick"><AddNodeButton @click="onClick" /></div>',
      setup: () => ({ onClick, onParentClick }),
    })

    await fireEvent.click(container.querySelector('button') as HTMLElement)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onParentClick).not.toHaveBeenCalled()
  })
})
