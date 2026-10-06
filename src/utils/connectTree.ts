import type { ConnectorType, NodeType, RawFlowNode } from '@/types/flow'
import { getNodeTitle, normalizeId, normalizeParentId, toNodeType } from './flowGraph'

/** One entry in the "Connect after" tree (shape accepted by Naive UI's NTreeSelect). */
export type ConnectTreeOption = {
  key: string
  label: string
  /** Card type, or the branch for Success/Failure; used for the icon. */
  kind: NodeType | ConnectorType
  /** Business Hours can't take a step directly after it; pick one of its branches. */
  disabled: boolean
  children?: ConnectTreeOption[]
}

/**
 * The flow as a tree for choosing where a new step goes. Titles aren't unique, so the nesting
 * (which mirrors the canvas) is what tells two "Add Comment" steps apart.
 */
export function buildConnectTree(nodes: RawFlowNode[]): ConnectTreeOption[] {
  const ids = new Set(nodes.map((n) => normalizeId(n.id)))
  const childrenByParent = new Map<string | null, RawFlowNode[]>()
  for (const node of nodes) {
    const parent = normalizeParentId(node.parentId)
    const key = parent && ids.has(parent) ? parent : null // orphans become roots
    childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), node])
  }

  // Success before Failure, following each Business Hours' `connectors` order.
  const connectorRank = new Map<string, number>()
  for (const node of nodes) {
    if (node.type === 'dateTime') {
      node.data.connectors.forEach((id, i) => connectorRank.set(normalizeId(id), i))
    }
  }
  const byRank = (a: RawFlowNode, b: RawFlowNode) =>
    (connectorRank.get(normalizeId(a.id)) ?? 0) - (connectorRank.get(normalizeId(b.id)) ?? 0)

  const visited = new Set<string>()
  function toOption(node: RawFlowNode): ConnectTreeOption {
    const id = normalizeId(node.id)
    visited.add(id)
    const kids = (childrenByParent.get(id) ?? [])
      .filter((child) => !visited.has(normalizeId(child.id))) // cycle guard
      .sort(byRank)
      .map(toOption)

    const isConnector = node.type === 'dateTimeConnector'
    const option: ConnectTreeOption = {
      key: id,
      label: isConnector
        ? node.data.connectorType === 'success'
          ? 'Success'
          : 'Failure'
        : getNodeTitle(node),
      kind: isConnector ? node.data.connectorType : (toNodeType(node) as NodeType),
      disabled: node.type === 'dateTime',
    }
    if (kids.length) option.children = kids
    return option
  }

  return (childrenByParent.get(null) ?? []).map(toOption)
}
