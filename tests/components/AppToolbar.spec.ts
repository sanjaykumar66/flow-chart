import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import AppToolbar from '@/components/AppToolbar.vue'

describe('AppToolbar', () => {
  it('shows the default app name', () => {
    render(AppToolbar)
    expect(screen.getByRole('heading', { level: 1, name: 'Flow Builder' })).toBeInTheDocument()
  })

  it('shows a custom app name', () => {
    render(AppToolbar, { props: { title: 'Support Flow' } })
    expect(screen.getByRole('heading', { level: 1, name: 'Support Flow' })).toBeInTheDocument()
  })

  it('emits create from the Create New Node button', async () => {
    const onCreate = vi.fn()
    render(AppToolbar, { props: { onCreate } })

    await fireEvent.click(screen.getByRole('button', { name: 'Create New Node' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('renders extra actions next to the create button', () => {
    render(AppToolbar, { slots: { actions: '<button>Undo</button>' } })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  describe('screen sizes', () => {
    const renderAt = (wide: boolean) => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: wide,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList)
      render(AppToolbar)
      return screen.getByRole('button', { name: 'Create New Node' })
    }

    it('shows the full Create New Node label on wider screens', () => {
      const button = renderAt(true)
      expect(button).toHaveTextContent('Create New Node')
      expect(button).not.toHaveAttribute('aria-label')
      vi.restoreAllMocks()
    })

    it('shows only the "+" on phones, keeping the accessible name', () => {
      const button = renderAt(false)
      expect(button).not.toHaveTextContent('Create New Node')
      expect(button).toHaveAttribute('aria-label', 'Create New Node')
      vi.restoreAllMocks()
    })
  })
})
