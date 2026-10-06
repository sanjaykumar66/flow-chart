import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { createAppRouter } from '@/router'

async function setup({ dirty = true, answer = false } = {}) {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/nodes/b6a0c1')
  const state = { dirty }
  const confirm = vi.fn(() => Promise.resolve(answer))
  let api!: ReturnType<typeof useUnsavedChanges>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useUnsavedChanges({ isDirty: () => state.dirty, confirm })
        return () => h('div')
      },
    }),
    { global: { plugins: [router] } },
  )
  const path = () => router.currentRoute.value.fullPath
  return { api, router, confirm, state, wrapper, path }
}

const beforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

enableAutoUnmount(afterEach)

describe('useUnsavedChanges', () => {
  it('lets navigation through without asking when nothing changed', async () => {
    const { router, confirm, path } = await setup({ dirty: false })
    await router.push('/nodes/d09c08')
    expect(path()).toBe('/nodes/d09c08')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('stays on the node when the user keeps editing', async () => {
    const { router, confirm, path } = await setup({ answer: false })
    await router.push('/')
    expect(confirm).toHaveBeenCalledOnce()
    expect(path()).toBe('/nodes/b6a0c1')
  })

  it('switches node when the user discards', async () => {
    const { router, path } = await setup({ answer: true })
    await router.push('/nodes/d09c08')
    expect(path()).toBe('/nodes/d09c08')
  })

  it('does not ask for navigation that keeps the same node open', async () => {
    const { router, confirm } = await setup()
    await router.push('/nodes/b6a0c1?tab=x')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('skips the question for navigation run without the guard', async () => {
    const { api, router, confirm, path } = await setup()
    await api.withoutGuard(() => router.push('/'))
    expect(path()).toBe('/')
    expect(confirm).not.toHaveBeenCalled()
    // and the guard is back afterwards
    await router.push('/nodes/b6a0c1')
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('asks only once while a question is already open', async () => {
    const { api, confirm } = await setup()
    let answer!: (value: boolean) => void
    confirm.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    const first = api.confirmDiscard()
    expect(await api.confirmDiscard()).toBe(false)
    answer(true)
    expect(await first).toBe(true)
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('asks the browser to confirm leaving the page only with unsaved changes', async () => {
    const { state } = await setup()
    expect(beforeUnload().defaultPrevented).toBe(true)
    state.dirty = false
    expect(beforeUnload().defaultPrevented).toBe(false)
  })

  it('stops guarding once unmounted', async () => {
    const { router, wrapper, confirm, path } = await setup()
    wrapper.unmount()
    expect(beforeUnload().defaultPrevented).toBe(false)
    await router.push('/')
    expect(path()).toBe('/')
    expect(confirm).not.toHaveBeenCalled()
  })
})
