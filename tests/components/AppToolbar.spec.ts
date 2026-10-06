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
})
