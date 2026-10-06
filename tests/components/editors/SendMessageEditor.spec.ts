import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import SendMessageEditor from '@/components/editors/SendMessageEditor.vue'
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from '@/constants/forms'
import { imageFile, selectFiles } from '../../helpers/files'
import { renderInForm } from '../../helpers/renderInForm'

const setup = (texts: string[] = ['Hello there'], attachments: string[] = ['data:image/png;a']) =>
  renderInForm(SendMessageEditor, { texts, attachments })

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement

describe('SendMessageEditor', () => {
  describe('attachments', () => {
    it('shows existing attachments as tiles', () => {
      setup(['Hi'], ['data:image/png;a', 'data:image/png;b'])
      expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
        'Attachment 1',
        'Attachment 2',
      ])
    })

    it('only accepts images in the file picker', () => {
      setup()
      expect(fileInput()).toHaveAttribute('accept', 'image/*')
    })

    it('adds uploaded images as data URLs', async () => {
      const { model } = setup(['Hi'], [])
      await selectFiles(fileInput(), [imageFile('logo.png')])

      await waitFor(() => expect(model.attachments).toHaveLength(1))
      expect(model.attachments[0]).toMatch(/^data:image\/png;base64,/)
    })

    it('rejects files that are not images', async () => {
      const { model } = setup(['Hi'], [])
      await selectFiles(fileInput(), [new File(['hi'], 'notes.txt', { type: 'text/plain' })])

      expect(await screen.findByText('notes.txt is not an image')).toBeInTheDocument()
      expect(model.attachments).toEqual([])
    })

    it('rejects images over the size limit', async () => {
      const { model } = setup(['Hi'], [])
      await selectFiles(fileInput(), [imageFile('huge.png', ATTACHMENT_MAX_BYTES + 1)])

      expect(await screen.findByText('huge.png is larger than 2 MB')).toBeInTheDocument()
      expect(model.attachments).toEqual([])
    })

    it('stops at the attachment limit and hides the upload tile', async () => {
      const existing = Array.from({ length: ATTACHMENT_MAX_COUNT - 1 }, (_, i) => `data:,${i}`)
      const { model } = setup(['Hi'], existing)
      await selectFiles(fileInput(), [imageFile('a.png'), imageFile('b.png')])

      expect(
        await screen.findByText(`You can add up to ${ATTACHMENT_MAX_COUNT} attachments`),
      ).toBeInTheDocument()
      expect(model.attachments).toHaveLength(ATTACHMENT_MAX_COUNT)
      expect(screen.queryByRole('button', { name: /Upload/ })).not.toBeInTheDocument()
    })

    it('names the upload button for screen readers', () => {
      setup()
      expect(screen.getByRole('button', { name: 'Upload attachment' })).toBeInTheDocument()
    })

    it('reports an image that cannot be read', async () => {
      vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
        this: FileReader,
      ) {
        this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>)
      })
      const { model } = setup(['Hi'], [])
      await selectFiles(fileInput(), [imageFile('broken.png')])
      expect(await screen.findByText('Could not read broken.png')).toBeInTheDocument()
      expect(model.attachments).toEqual([])
      vi.restoreAllMocks()
    })

    it('removes an attachment and clears the upload error', async () => {
      const { model } = setup(['Hi'], ['data:image/png;a', 'data:image/png;b'])
      await selectFiles(fileInput(), [new File(['x'], 'bad.txt', { type: 'text/plain' })])
      await screen.findByText('bad.txt is not an image')

      await fireEvent.click(screen.getByRole('button', { name: 'Remove Attachment 1' }))

      expect(model.attachments).toEqual(['data:image/png;b'])
      expect(screen.queryByText('bad.txt is not an image')).not.toBeInTheDocument()
    })
  })

  describe('messages', () => {
    it('shows each message in its own field', () => {
      setup(['First', 'Second'])
      expect(
        screen
          .getAllByPlaceholderText('Type a message')
          .map((el) => (el as HTMLTextAreaElement).value),
      ).toEqual(['First', 'Second'])
    })

    it('edits a message', async () => {
      const { model } = setup(['First', 'Second'])
      await fireEvent.update(screen.getAllByPlaceholderText('Type a message')[1]!, 'Updated')
      expect(model.texts).toEqual(['First', 'Updated'])
    })

    it('removes a message', async () => {
      const { model } = setup(['First', 'Second'])
      await fireEvent.click(screen.getByRole('button', { name: 'Remove message 1' }))
      expect(model.texts).toEqual(['Second'])
    })

    it('adds an empty message', async () => {
      const { model } = setup(['First'])
      await fireEvent.click(screen.getByRole('button', { name: 'Add message' }))
      expect(model.texts).toEqual(['First', ''])
    })
  })

  describe('validation', () => {
    it('passes with a message and an attachment', async () => {
      const { validate } = setup()
      await expect(validate()).resolves.toEqual([])
    })

    it('passes with only an attachment', async () => {
      const { validate } = setup([], ['data:image/png;a'])
      await expect(validate()).resolves.toEqual([])
    })

    it('rejects a blank message', async () => {
      const { validate } = setup(['   '])
      await expect(validate()).resolves.toEqual(['Message cannot be empty. Remove it instead.'])
    })

    it('requires at least one message or attachment', async () => {
      const { validate } = setup([], [])
      await expect(validate()).resolves.toEqual(['Add at least one message or attachment'])
    })
  })
})
