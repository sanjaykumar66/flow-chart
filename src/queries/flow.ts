import { inject } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { flowApi as defaultFlowApi, type FlowApi } from '@/api/flowApi'
import type { CreateNodeValues, RawFlowNode } from '@/types/flow'
import type { NodeFormValues } from '@/utils/nodeForm'
import { deleteNode, updateNode, type InsertTarget } from '@/utils/treeOps'

export const flowKeys = {
  all: ['flow'] as const,
  nodes: () => [...flowKeys.all, 'nodes'] as const,
}

/** Lets tests provide a fake API; the app uses the localStorage one. */
export const FLOW_API_KEY = Symbol('flow-api')
const useFlowApi = () => inject<FlowApi>(FLOW_API_KEY, defaultFlowApi)

export function useFlowQuery() {
  const api = useFlowApi()
  return useQuery({ queryKey: flowKeys.nodes(), queryFn: () => api.getNodes() })
}

/**
 * Shared optimistic-update plumbing: apply the change to the cache immediately, roll back if
 * the API fails, and store what the API returned when it succeeds.
 */
function useOptimisticFlowMutation<TVars, TResult>(options: {
  mutationFn: (vars: TVars) => Promise<TResult>
  optimistic?: (nodes: RawFlowNode[], vars: TVars) => RawFlowNode[]
  toNodes: (result: TResult) => RawFlowNode[]
}) {
  const queryClient = useQueryClient()
  const key = flowKeys.nodes()

  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<RawFlowNode[]>(key)
      if (previous && options.optimistic) {
        try {
          queryClient.setQueryData(key, options.optimistic(previous, vars))
        } catch {
          // invalid change: let the API call report the error
        }
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (result) => {
      queryClient.setQueryData(key, options.toNodes(result))
    },
  })
}

export function useUpdateNode() {
  const api = useFlowApi()
  return useOptimisticFlowMutation({
    mutationFn: ({ id, values }: { id: string; values: NodeFormValues }) =>
      api.updateNode(id, values),
    optimistic: (nodes, { id, values }) => updateNode(nodes, id, values),
    toNodes: (nodes) => nodes,
  })
}

export function useDeleteNode() {
  const api = useFlowApi()
  return useOptimisticFlowMutation({
    mutationFn: (id: string) => api.deleteNode(id),
    optimistic: (nodes, id) => deleteNode(nodes, id),
    toNodes: (nodes) => nodes,
  })
}

/** Throws away every change and loads the original payload again (for demos and reviews). */
export function useResetFlow() {
  const api = useFlowApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.reset(),
    onSuccess: (nodes) => queryClient.setQueryData(flowKeys.nodes(), nodes),
  })
}

/** Not optimistic: the new node's id comes from the API, and we navigate to it afterwards. */
export function useCreateNode() {
  const api = useFlowApi()
  return useOptimisticFlowMutation({
    mutationFn: ({ values, target }: { values: CreateNodeValues; target: InsertTarget }) =>
      api.createNode(values, target),
    toNodes: (result) => result.nodes,
  })
}
