import { describe, expect, it, vi } from 'vitest'
import { formatBytes, readFileAsDataUrl } from '@/utils/file'

describe('readFileAsDataUrl', () => {
  it('reads a file into a base64 data URL', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    await expect(readFileAsDataUrl(file)).resolves.toBe('data:text/plain;base64,aGVsbG8=')
  })

  it("rejects when the file can't be read", async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>)
    })
    await expect(readFileAsDataUrl(new File(['x'], 'broken.png'))).rejects.toThrow(
      'Could not read broken.png',
    )
    vi.restoreAllMocks()
  })
})

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [2048, '2 KB'],
    [2 * 1024 * 1024, '2 MB'],
    [1.5 * 1024 * 1024, '1.5 MB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})
