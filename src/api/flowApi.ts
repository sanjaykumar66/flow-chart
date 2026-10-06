import type { CreateNodeValues, RawFlowNode } from '@/types/flow'
import type { NodeFormValues } from '@/utils/nodeForm'
import { deleteNode, insertNode, updateNode, type InsertTarget } from '@/utils/treeOps'

/**
 * Fake backend. There's no server for this assignment: the flow starts from `/payload.json`
 * and every change is saved to localStorage, with a short delay so loading and saving states
 * behave like a real API. Swapping in a real backend only means replacing this file.
 */
export interface FlowApi {
  getNodes(): Promise<RawFlowNode[]>
  createNode(
    values: CreateNodeValues,
    target: InsertTarget,
  ): Promise<{ nodes: RawFlowNode[]; id: string }>
  updateNode(id: string, values: NodeFormValues): Promise<RawFlowNode[]>
  deleteNode(id: string): Promise<RawFlowNode[]>
  /** Drops saved changes and goes back to the original payload. */
  reset(): Promise<RawFlowNode[]>
}

export interface FlowApiOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  fetcher?: typeof fetch
  latency?: number
  payloadUrl?: string
}

export const STORAGE_KEY = 'flow-chart:nodes'

export class FlowApiError extends Error {}

export function createFlowApi(options: FlowApiOptions = {}): FlowApi {
  const {
    storage = globalThis.localStorage,
    fetcher = (...args) => globalThis.fetch(...args),
    latency = 300,
    payloadUrl = '/payload.json',
  } = options

  const wait = () => new Promise((resolve) => setTimeout(resolve, latency))

  async function loadPayload(): Promise<RawFlowNode[]> {
    const response = await fetcher(payloadUrl)
    if (!response.ok) throw new FlowApiError(`Couldn't load the flow (HTTP ${response.status})`)
    return (await response.json()) as RawFlowNode[]
  }

  async function read(): Promise<RawFlowNode[]> {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as RawFlowNode[]
      } catch {
        storage.removeItem(STORAGE_KEY) // corrupted: fall back to the payload
      }
    }
    return loadPayload()
  }

  function write(nodes: RawFlowNode[]) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(nodes))
    } catch {
      throw new FlowApiError('Not enough browser storage to save. Try removing some attachments.')
    }
  }

  async function change<T>(
    apply: (nodes: RawFlowNode[]) => T,
    toNodes: (result: T) => RawFlowNode[],
  ) {
    await wait()
    const result = apply(await read())
    write(toNodes(result))
    return result
  }

  return {
    async getNodes() {
      await wait()
      return read()
    },
    createNode: (values, target) =>
      change(
        (nodes) => insertNode(nodes, values, target),
        (result) => result.nodes,
      ),
    updateNode: (id, values) =>
      change(
        (nodes) => updateNode(nodes, id, values),
        (nodes) => nodes,
      ),
    deleteNode: (id) =>
      change(
        (nodes) => deleteNode(nodes, id),
        (nodes) => nodes,
      ),
    async reset() {
      await wait()
      storage.removeItem(STORAGE_KEY)
      return loadPayload()
    },
  }
}

export const flowApi = createFlowApi()
