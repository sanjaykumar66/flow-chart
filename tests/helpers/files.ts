import { fireEvent } from '@testing-library/vue'

/** Simulates choosing files in a (possibly hidden) file input. */
export async function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  await fireEvent.change(input)
}

export function imageFile(name = 'photo.png', bytes = 16): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}
