import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import AttachmentTile from '@/components/editors/AttachmentTile.vue'

describe('AttachmentTile', () => {
  it('shows the image with its name as alt text', () => {
    render(AttachmentTile, { props: { src: 'data:image/png;base64,AAAA', name: 'Attachment 1' } })
    expect(screen.getByRole('img', { name: 'Attachment 1' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    )
  })

  it('emits remove from its labelled remove button', async () => {
    const onRemove = vi.fn()
    render(AttachmentTile, { props: { src: 'x.png', name: 'Attachment 2', onRemove } })

    await fireEvent.click(screen.getByRole('button', { name: 'Remove Attachment 2' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows a fallback when the image fails to load', async () => {
    render(AttachmentTile, { props: { src: 'broken.png' } })

    await fireEvent.error(screen.getByRole('img'))
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
