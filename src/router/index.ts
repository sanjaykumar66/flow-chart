import { createRouter, createWebHistory, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import FlowView from '@/views/FlowView.vue'

export const ROUTE_NAMES = {
  flow: 'flow',
  node: 'node',
} as const

/**
 * Both routes render the same view, so the canvas stays mounted (zoom and pan are kept) and only
 * the details drawer follows the URL. Whether a node id is valid is checked in the view once the
 * flow has loaded.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: ROUTE_NAMES.flow, component: FlowView },
  { path: '/nodes/:nodeId', name: ROUTE_NAMES.node, component: FlowView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  return createRouter({ history, routes })
}
