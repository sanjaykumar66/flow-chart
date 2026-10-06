import { expect } from 'vitest'
import { render, waitFor } from '@testing-library/vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import type { FlowApi } from '@/api/flowApi'
import { FLOW_API_KEY } from '@/queries/flow'
import { createAppRouter } from '@/router'
import { createTestQueryClient } from './queryClient'
import { createTestApi } from './testApi'

/** Renders the whole app (Pinia, router, Vue Query) at `path`, backed by an in-memory API. */
export async function renderAt(path: string, api: FlowApi = createTestApi().api) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const queryClient = createTestQueryClient()
  const utils = render(App, {
    global: {
      plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]],
      provide: { [FLOW_API_KEY]: api },
    },
  })
  return { ...utils, router, api }
}

export const drawerTitle = () => document.querySelector('.n-drawer h2')?.textContent

/** Vue Flow hides nodes until measured; reveal them so role queries can see them. */
export async function revealNodes() {
  await waitFor(() =>
    expect(document.querySelectorAll('.vue-flow__node').length).toBeGreaterThan(0),
  )
  document.querySelectorAll<HTMLElement>('.vue-flow__node').forEach((node) => {
    node.style.visibility = 'visible'
  })
}
