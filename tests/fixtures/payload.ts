import type { RawFlowNode } from '@/types/flow'
import payload from './payload.json'

/** A fresh copy of the assignment's payload.json for each test. */
export function loadPayload(): RawFlowNode[] {
  return structuredClone(payload) as RawFlowNode[]
}
