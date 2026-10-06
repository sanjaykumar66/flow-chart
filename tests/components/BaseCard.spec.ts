import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { BoltIcon } from '@heroicons/vue/24/outline'
import BaseCard from '@/components/BaseCard.vue'

describe('BaseCard', () => {
  it('renders the title and description', () => {
    render(BaseCard, { props: { title: 'Trigger', description: 'Conversation Opened' } })

    expect(screen.getByRole('heading', { name: 'Trigger' })).toBeInTheDocument()
    expect(screen.getByText('Conversation Opened')).toBeInTheDocument()
  })

  it('renders the icon in the given colour', () => {
    const { container } = render(BaseCard, {
      props: { title: 'Trigger', icon: BoltIcon, iconColor: 'rgb(219, 39, 119)' },
    })

    const icon = container.querySelector('header svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveStyle({ color: 'rgb(219, 39, 119)' })
  })

  it('renders no icon when none is given', () => {
    const { container } = render(BaseCard, { props: { title: 'Trigger' } })
    expect(container.querySelector('header svg')).not.toBeInTheDocument()
  })

  it('lets slots replace the header and body', () => {
    render(BaseCard, {
      props: { title: 'Ignored title', description: 'Ignored description' },
      slots: {
        header: '<h3>Custom header</h3>',
        default: '<p>Custom body</p>',
      },
    })

    expect(screen.getByText('Custom header')).toBeInTheDocument()
    expect(screen.getByText('Custom body')).toBeInTheDocument()
    expect(screen.queryByText('Ignored title')).not.toBeInTheDocument()
    expect(screen.queryByText('Ignored description')).not.toBeInTheDocument()
  })

  it('clamps the description to three lines', () => {
    const { container } = render(BaseCard, {
      props: { title: 'Away Message', description: 'A long description' },
    })
    expect(container.querySelector('.n-ellipsis--line-clamp')).toHaveStyle({
      '-webkit-line-clamp': '3',
    })
  })

  describe('selection', () => {
    it('is presentational: not focusable and no role', () => {
      const { container } = render(BaseCard, { props: { title: 'Trigger' } })
      const card = container.querySelector('article') as HTMLElement
      expect(card).not.toHaveAttribute('tabindex')
      expect(card).not.toHaveAttribute('role')
      expect(card).not.toHaveClass('border-blue-500')
    })

    it('can be shown as selected', () => {
      const { container } = render(BaseCard, { props: { title: 'Trigger', selected: true } })
      expect(container.querySelector('article')).toHaveClass('border-blue-500')
    })
  })
})
