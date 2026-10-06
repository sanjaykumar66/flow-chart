import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useNodeRoute } from '@/composables/useNodeRoute'
import { createAppRouter } from '@/router'

async function setup(path = '/') {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  let api!: ReturnType<typeof useNodeRoute>
  mount(
    defineComponent({
      setup() {
        api = useNodeRoute()
        return () => h('div')
      },
    }),
    { global: { plugins: [router] } },
  )
  return { api, router }
}

describe('useNodeRoute', () => {
  it('has no selection on the canvas route', async () => {
    const { api } = await setup('/')
    expect(api.selectedId.value).toBeNull()
  })

  it('reads the selected node from the URL', async () => {
    const { api } = await setup('/nodes/b6a0c1')
    expect(api.selectedId.value).toBe('b6a0c1')
  })

  it('opens and closes a node by changing the URL', async () => {
    const { api, router } = await setup('/')
    await api.openNode('d09c08')
    expect(router.currentRoute.value.fullPath).toBe('/nodes/d09c08')
    await api.closeNode()
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('toggles: opening the open node closes it, another node switches to it', async () => {
    const { api, router } = await setup('/nodes/d09c08')
    await api.toggleNode('b6a0c1')
    expect(router.currentRoute.value.fullPath).toBe('/nodes/b6a0c1')
    await api.toggleNode('b6a0c1')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('adds history entries, so Back returns to the previous node', async () => {
    const { api, router } = await setup('/')
    await api.openNode('d09c08')
    await api.openNode('b6a0c1')
    router.back()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.fullPath).toBe('/nodes/d09c08')
  })

  it('replaces an invalid node URL without adding history', async () => {
    const { api, router } = await setup('/nodes/nope')
    await api.replaceWithFlow()
    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})
