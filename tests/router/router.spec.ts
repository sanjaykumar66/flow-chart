import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter, ROUTE_NAMES } from '@/router'

const router = () => createAppRouter(createMemoryHistory())

describe('router', () => {
  it('shows the canvas at /', () => {
    expect(router().resolve('/').name).toBe(ROUTE_NAMES.flow)
  })

  it('opens a node from /nodes/:nodeId', () => {
    const route = router().resolve('/nodes/d09c08')
    expect(route.name).toBe(ROUTE_NAMES.node)
    expect(route.params.nodeId).toBe('d09c08')
  })

  it('renders the same view for both routes so the canvas stays mounted', () => {
    const r = router()
    const flow = r.resolve('/').matched[0]!.components!.default
    const node = r.resolve('/nodes/1').matched[0]!.components!.default
    expect(node).toBe(flow)
  })

  it('redirects unknown paths to the canvas', async () => {
    const r = router()
    await r.push('/does/not/exist')
    expect(r.currentRoute.value.name).toBe(ROUTE_NAMES.flow)
  })
})
