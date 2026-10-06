import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import MoreActionsMenu from '@/components/MoreActionsMenu.vue'

async function openMenu(props: Record<string, unknown> = {}) {
  const onResetLayout = vi.fn()
  const onResetDemo = vi.fn()
  render(MoreActionsMenu, { props: { onResetLayout, onResetDemo, ...props } })
  const button = screen.getByRole('button', { name: 'More actions' })
  expect(button).toHaveAttribute('aria-haspopup', 'menu')
  await fireEvent.click(button)
  const option = async (label: string) =>
    (await screen.findByText(label)).closest('.n-dropdown-option-body') as HTMLElement
  return { onResetLayout, onResetDemo, option }
}

describe('MoreActionsMenu', () => {
  it('resets the layout when steps were moved', async () => {
    const { onResetLayout, option } = await openMenu({ canResetLayout: true })
    await fireEvent.click(await option('Reset layout'))
    expect(onResetLayout).toHaveBeenCalledOnce()
  })

  it('disables Reset layout while the layout is automatic', async () => {
    const { onResetLayout, option } = await openMenu({ canResetLayout: false })
    const item = await option('Reset layout')
    expect(item).toHaveClass('n-dropdown-option-body--disabled')
    await fireEvent.click(item)
    expect(onResetLayout).not.toHaveBeenCalled()
  })

  it('asks for a demo reset', async () => {
    const { onResetDemo, option } = await openMenu()
    await fireEvent.click(await option('Reset demo data…'))
    expect(onResetDemo).toHaveBeenCalledOnce()
  })
})
