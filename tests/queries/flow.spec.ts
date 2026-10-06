import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import type { FlowApi } from '@/api/flowApi'
import { queryClientConfig } from '@/queries/client'
import { createTestQueryClient } from '../helpers/queryClient'
import {
  FLOW_API_KEY,
  flowKeys,
  useCreateNode,
  useDeleteNode,
  useFlowQuery,
  useResetFlow,
  useUpdateNode,
} from '@/queries/flow'
import type { RawFlowNode } from '@/types/flow'
import { emptyNodeForm } from '@/utils/nodeForm'
import { createTestApi } from '../helpers/testApi'

function setup(api: FlowApi = createTestApi().api) {
  const queryClient = createTestQueryClient()
  let hooks!: {
    query: ReturnType<typeof useFlowQuery>
    update: ReturnType<typeof useUpdateNode>
    remove: ReturnType<typeof useDeleteNode>
    create: ReturnType<typeof useCreateNode>
    reset: ReturnType<typeof useResetFlow>
  }
  mount(
    defineComponent({
      setup() {
        hooks = {
          query: useFlowQuery(),
          update: useUpdateNode(),
          remove: useDeleteNode(),
          create: useCreateNode(),
          reset: useResetFlow(),
        }
        return () => h('div')
      },
    }),
    {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]],
        provide: { [FLOW_API_KEY]: api },
      },
    },
  )
  const cached = () => queryClient.getQueryData<RawFlowNode[]>(flowKeys.nodes())
  return { hooks, queryClient, cached }
}

const titleOf = (nodes: RawFlowNode[] | undefined, id: string) =>
  nodes?.find((n) => String(n.id) === id)?.name

describe('flow queries', () => {
  it('uses the brief’s query settings', () => {
    expect(queryClientConfig.defaultOptions?.queries).toEqual({
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 3_600_000,
    })
  })

  it('loads the flow', async () => {
    const { hooks } = setup()
    await until(() => hooks.query.isSuccess.value)
    expect(hooks.query.data.value).toHaveLength(7)
  })

  it('updates the cache optimistically, then with the saved result', async () => {
    const { hooks, cached } = setup()
    await until(() => hooks.query.isSuccess.value)

    hooks.update.mutate({ id: 'e879e4', values: { ...emptyNodeForm(), title: 'Renamed' } })
    await until(() => titleOf(cached(), 'e879e4') === 'Renamed')
    await until(() => hooks.update.isSuccess.value)
    expect(titleOf(cached(), 'e879e4')).toBe('Renamed')
  })

  it('rolls the cache back when saving fails', async () => {
    const { api } = createTestApi()
    const failing: FlowApi = {
      ...api,
      updateNode: () => Promise.reject(new Error('Server down')),
    }
    const { hooks, cached } = setup(failing)
    await until(() => hooks.query.isSuccess.value)

    hooks.update.mutate({ id: 'e879e4', values: { ...emptyNodeForm(), title: 'Renamed' } })
    await until(() => hooks.update.isError.value)
    expect(titleOf(cached(), 'e879e4')).toBe('Add Comment #1')
    expect(hooks.update.error.value?.message).toBe('Server down')
  })

  it('removes a deleted node from the cache', async () => {
    const { hooks, cached } = setup()
    await until(() => hooks.query.isSuccess.value)
    hooks.remove.mutate('e879e4')
    await until(() => hooks.remove.isSuccess.value)
    expect(cached()?.some((n) => n.id === 'e879e4')).toBe(false)
  })

  it('restores the original flow on reset', async () => {
    const { hooks, cached } = setup()
    await vi.waitFor(() => expect(cached()).toHaveLength(7))
    await hooks.remove.mutateAsync('e879e4')
    expect(cached()).toHaveLength(6)
    await hooks.reset.mutateAsync()
    expect(cached()).toHaveLength(7)
    expect(titleOf(cached(), 'e879e4')).toBe('Add Comment #1')
  })

  it('adds a created node to the cache and returns its id', async () => {
    const { hooks, cached } = setup()
    await until(() => hooks.query.isSuccess.value)
    hooks.create.mutate({
      values: { title: 'Follow up', description: '', type: 'sendMessage' },
      target: { parentId: 'b0653a' },
    })
    await until(() => hooks.create.isSuccess.value)
    const id = hooks.create.data.value!.id
    expect(titleOf(cached(), id)).toBe('Follow up')
  })
})

function until(check: () => boolean) {
  return vi.waitFor(() => {
    if (!check()) throw new Error('Condition not met yet')
  })
}
