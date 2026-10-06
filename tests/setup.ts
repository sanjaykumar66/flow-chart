import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterEach } from 'vitest'

// Naive UI teleports modals, drawers and popovers to <body>, so clear it between tests.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  localStorage.clear() // stores persist to localStorage
})
