import { describe, expect, it, vi } from 'vitest'
import { createFlowApi, FlowApiError, STORAGE_KEY } from '@/api/flowApi'
import { emptyNodeForm } from '@/utils/nodeForm'
import { loadPayload } from '../fixtures/payload'
import { memoryStorage } from '../helpers/memoryStorage'
import { createTestApi } from '../helpers/testApi'

describe('flowApi', () => {
  it('starts from payload.json', async () => {
    const { api, fetcher } = createTestApi()
    await expect(api.getNodes()).resolves.toHaveLength(7)
    expect(fetcher).toHaveBeenCalledWith('/payload.json')
  })

  it('saves changes and reads them back instead of the payload', async () => {
    const { api, storage, fetcher } = createTestApi()
    await api.updateNode('e879e4', { ...emptyNodeForm(), title: 'Renamed', comment: 'x' })

    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toHaveLength(7)
    fetcher.mockClear()
    const nodes = await api.getNodes()
    expect(nodes.find((n) => n.id === 'e879e4')?.name).toBe('Renamed')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('creates a node and returns its id', async () => {
    const { api } = createTestApi()
    const { nodes, id } = await api.createNode(
      { title: 'Follow up', description: '', type: 'sendMessage' },
      { parentId: 'b0653a' },
    )
    expect(nodes.find((n) => n.id === id)).toMatchObject({ name: 'Follow up', parentId: 'b0653a' })
  })

  it('deletes a node', async () => {
    const { api } = createTestApi()
    const nodes = await api.deleteNode('e879e4')
    expect(nodes.some((n) => n.id === 'e879e4')).toBe(false)
  })

  it('rejects invalid changes without saving', async () => {
    const { api, storage } = createTestApi()
    await expect(api.deleteNode('1')).rejects.toThrow("The trigger can't be deleted")
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('resets to the original payload', async () => {
    const { api, storage } = createTestApi()
    await api.deleteNode('e879e4')
    await expect(api.reset()).resolves.toHaveLength(7)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to the payload when saved data is corrupted', async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' })
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => loadPayload() }) as Response)
    const api = createFlowApi({ storage, fetcher, latency: 0 })
    await expect(api.getNodes()).resolves.toHaveLength(7)
  })

  it('reports a failed payload request', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    const api = createFlowApi({ storage: memoryStorage(), fetcher, latency: 0 })
    await expect(api.getNodes()).rejects.toThrow(FlowApiError)
  })

  it('reports when browser storage is full', async () => {
    const { api, storage } = createTestApi()
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    await expect(api.deleteNode('e879e4')).rejects.toThrow('Not enough browser storage')
  })

  it('waits for the configured latency', async () => {
    vi.useFakeTimers()
    const { storage } = createTestApi()
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => loadPayload() }) as Response)
    const api = createFlowApi({ storage, fetcher, latency: 300 })
    const pending = api.getNodes()
    await vi.advanceTimersByTimeAsync(299)
    expect(fetcher).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toHaveLength(7)
    vi.useRealTimers()
  })

  it('uses the browser fetch and localStorage by default', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => loadPayload() } as Response)
    const api = createFlowApi({ latency: 0 })
    expect(await api.getNodes()).toHaveLength(7)
    expect(fetchSpy).toHaveBeenCalledWith('/payload.json')
    await api.deleteNode('e879e4')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(6)
    vi.restoreAllMocks()
  })
})
