import { WEEK_DAYS } from '@/constants/forms'
import type { CreateNodeValues, RawFlowNode, RawNodeId } from '@/types/flow'
import { normalizeId, normalizeParentId } from './flowGraph'
import type { NodeFormValues } from './nodeForm'

/**
 * Pure operations on the flow (an array of payload nodes linked by `parentId`).
 * Each returns a new array and never mutates its input, so they can run both in the fake API
 * and optimistically in the TanStack Query cache.
 */

export class FlowOperationError extends Error {}

/** Where a new node goes: after `parentId`, and before `childId` when inserting on an edge. */
export interface InsertTarget {
  parentId: string
  childId?: string
}

const sameId = (a: RawNodeId, b: string) => normalizeId(a) === b

function findNode(nodes: RawFlowNode[], id: string): RawFlowNode {
  const node = nodes.find((n) => sameId(n.id, id))
  if (!node) throw new FlowOperationError(`Node ${id} not found`)
  return node
}

function childrenOf(nodes: RawFlowNode[], id: string): RawFlowNode[] {
  return nodes.filter((n) => normalizeParentId(n.parentId) === id)
}

/** A short random id in the payload's style (6 hex chars), unique within `taken`. */
export function generateNodeId(taken: Iterable<RawNodeId> = []): string {
  const used = new Set(Array.from(taken, (id) => normalizeId(id)))
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(3))
    const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    if (!used.has(id)) return id
  }
}

/** Builds the payload node(s) for a new step. Business Hours comes with its Success/Failure. */
export function createNodeRecords(
  values: CreateNodeValues,
  parentId: string,
  taken: Iterable<RawNodeId>,
): { node: RawFlowNode; connectors: RawFlowNode[] } {
  const used = new Set(Array.from(taken, (id) => normalizeId(id)))
  const nextId = () => {
    const id = generateNodeId(used)
    used.add(id)
    return id
  }
  const id = nextId()
  const base = {
    id,
    parentId,
    name: values.title,
    ...(values.description ? { description: values.description } : {}),
  }

  switch (values.type) {
    case 'sendMessage':
      return { node: { ...base, type: 'sendMessage', data: { payload: [] } }, connectors: [] }
    case 'addComment':
      return { node: { ...base, type: 'addComment', data: { comment: '' } }, connectors: [] }
    case 'businessHours': {
      const successId = nextId()
      const failureId = nextId()
      return {
        node: {
          ...base,
          type: 'dateTime',
          data: {
            times: WEEK_DAYS.map(({ value }) => ({
              day: value,
              startTime: '09:00',
              endTime: '17:00',
            })),
            connectors: [successId, failureId],
            timezone: 'UTC',
            action: 'businessHours',
          },
        },
        connectors: [
          {
            id: successId,
            parentId: id,
            name: 'Success',
            type: 'dateTimeConnector',
            data: { connectorType: 'success' },
          },
          {
            id: failureId,
            parentId: id,
            name: 'Failure',
            type: 'dateTimeConnector',
            data: { connectorType: 'failure' },
          },
        ],
      }
    }
  }
}

/**
 * Inserts a new step.
 * - On an edge (`childId`): between that parent and child.
 * - After a step with children: into the chain, the children move under the new step.
 * - After a leaf: appended.
 * Steps that branch (Business Hours) can't take a step directly after them: insert under
 * Success or Failure instead. When the new step is Business Hours, whatever it pushes down goes
 * under its Success branch.
 */
export function insertNode(
  nodes: RawFlowNode[],
  values: CreateNodeValues,
  target: InsertTarget,
): { nodes: RawFlowNode[]; id: string } {
  const parent = findNode(nodes, target.parentId)
  if (parent.type === 'dateTime') {
    throw new FlowOperationError('Add the step under the Success or Failure branch instead')
  }

  const moved = target.childId
    ? [findNode(nodes, target.childId)]
    : childrenOf(nodes, target.parentId)
  if (target.childId && normalizeParentId(moved[0]!.parentId) !== target.parentId) {
    throw new FlowOperationError(`${target.childId} is not a child of ${target.parentId}`)
  }

  const { node, connectors } = createNodeRecords(
    values,
    target.parentId,
    nodes.map((n) => n.id),
  )
  const newParentForMoved = node.type === 'dateTime' ? normalizeId(connectors[0]!.id) : node.id
  const movedIds = new Set(moved.map((n) => normalizeId(n.id)))

  const updated = nodes.map((n) =>
    movedIds.has(normalizeId(n.id)) ? { ...n, parentId: newParentForMoved } : n,
  )
  return { nodes: [...updated, node, ...connectors], id: normalizeId(node.id) }
}

/** Ids of a node and everything below it. */
function subtreeIds(nodes: RawFlowNode[], id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const n of nodes) {
      const parent = normalizeParentId(n.parentId)
      const nid = normalizeId(n.id)
      if (parent && ids.has(parent) && !ids.has(nid)) {
        ids.add(nid)
        grew = true
      }
    }
  }
  return ids
}

/**
 * Deletes a step.
 * - A regular step: its children reconnect to its parent, so the flow stays connected.
 * - Business Hours: removed with its Success/Failure branches and everything under them,
 *   since those branches can't exist on their own.
 * The Trigger and the Success/Failure labels can't be deleted.
 */
export function deleteNode(nodes: RawFlowNode[], id: string): RawFlowNode[] {
  const node = findNode(nodes, id)
  if (node.type === 'trigger') throw new FlowOperationError("The trigger can't be deleted")
  if (node.type === 'dateTimeConnector') {
    throw new FlowOperationError("Success and Failure branches can't be deleted on their own")
  }

  if (node.type === 'dateTime') {
    const removed = subtreeIds(nodes, id)
    return nodes.filter((n) => !removed.has(normalizeId(n.id)))
  }

  return nodes
    .filter((n) => !sameId(n.id, id))
    .map((n) => (normalizeParentId(n.parentId) === id ? { ...n, parentId: node.parentId } : n))
}

/** Applies the drawer form to a step. */
export function updateNode(
  nodes: RawFlowNode[],
  id: string,
  values: NodeFormValues,
): RawFlowNode[] {
  const node = findNode(nodes, id)
  const description = values.description.trim()
  const base = { ...node, name: values.title.trim(), description: description || undefined }
  if (!description) delete base.description

  let next: RawFlowNode
  switch (node.type) {
    case 'sendMessage':
      next = {
        ...base,
        type: 'sendMessage',
        data: {
          payload: [
            ...values.texts.map((text) => ({ type: 'text' as const, text })),
            ...values.attachments.map((attachment) => ({
              type: 'attachment' as const,
              attachment,
            })),
          ],
        },
      }
      break
    case 'addComment':
      next = { ...base, type: 'addComment', data: { comment: values.comment } }
      break
    case 'dateTime':
      next = {
        ...base,
        type: 'dateTime',
        data: {
          ...node.data,
          times: values.times.map((slot) => ({ ...slot })),
          timezone: values.timezone,
        },
      }
      break
    case 'trigger':
      next = { ...base, type: 'trigger', data: node.data }
      break
    case 'dateTimeConnector':
      throw new FlowOperationError("Success and Failure branches can't be edited")
  }

  return nodes.map((n) => (sameId(n.id, id) ? next : n))
}
