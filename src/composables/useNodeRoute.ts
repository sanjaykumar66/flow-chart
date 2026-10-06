import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROUTE_NAMES } from '@/router'

/** The node whose details are open comes from the URL (`/nodes/:nodeId`). */
export function useNodeRoute() {
  const route = useRoute()
  const router = useRouter()

  const selectedId = computed(() =>
    route.name === ROUTE_NAMES.node ? String(route.params.nodeId) : null,
  )

  function openNode(id: string) {
    return router.push({ name: ROUTE_NAMES.node, params: { nodeId: id } })
  }

  function closeNode() {
    return router.push({ name: ROUTE_NAMES.flow })
  }

  /** Clicking the open node again closes its details. */
  function toggleNode(id: string) {
    return selectedId.value === id ? closeNode() : openNode(id)
  }

  /** Leave an invalid node URL without adding a history entry. */
  function replaceWithFlow() {
    return router.replace({ name: ROUTE_NAMES.flow })
  }

  return { selectedId, openNode, closeNode, toggleNode, replaceWithFlow }
}
