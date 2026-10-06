import { vi } from 'vitest'
import { createFlowApi } from '@/api/flowApi'
import { loadPayload } from '../fixtures/payload'
import { memoryStorage } from './memoryStorage'

/** The real fake-API logic with no delay, in-memory storage and the fixture payload. */
export function createTestApi() {
  const storage = memoryStorage()
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => loadPayload() }) as Response)
  return { api: createFlowApi({ storage, fetcher, latency: 0 }), storage, fetcher }
}
