/** Node types shown as cards on the canvas. Success/Failure connectors are not cards. */
export type NodeType = 'trigger' | 'businessHours' | 'sendMessage' | 'addComment'

/** Node types a user can create from the "Create New Node" form. */
export type CreatableNodeType = Exclude<NodeType, 'trigger'>

export interface CreateNodeValues {
  title: string
  description: string
  type: CreatableNodeType
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** One day's opening hours, times as `HH:mm`. */
export interface BusinessHoursSlot {
  day: WeekDay
  startTime: string
  endTime: string
}

// ---- Raw payload (payload.json) ----

/** Ids in the payload are mostly strings, but the trigger uses numbers (`1`, parent `-1`). */
export type RawNodeId = string | number

export type MessagePart =
  { type: 'text'; text: string } | { type: 'attachment'; attachment: string }

export type ConnectorType = 'success' | 'failure'

interface RawNodeBase {
  id: RawNodeId
  parentId: RawNodeId
  name?: string
  /** Not in the original payload; set on nodes created in the app. */
  description?: string
}

export type RawFlowNode = RawNodeBase &
  (
    | { type: 'trigger'; data: { type: string; oncePerContact: boolean } }
    | { type: 'sendMessage'; data: { payload: MessagePart[] } }
    | { type: 'addComment'; data: { comment: string } }
    | {
        type: 'dateTime'
        data: {
          times: BusinessHoursSlot[]
          connectors: RawNodeId[]
          timezone: string
          action: 'businessHours'
        }
      }
    | { type: 'dateTimeConnector'; data: { connectorType: ConnectorType } }
  )

// ---- Canvas (Vue Flow) data ----

export interface XYPosition {
  x: number
  y: number
}

/** `data` of an action node card on the canvas. */
export interface ActionNodeData {
  nodeType: NodeType
  title: string
  description: string
  color: string
  selected: boolean
  /** Briefly emphasised, e.g. right after undo/redo changed it. */
  highlighted: boolean
  /** No children: the card shows an "add next step" stub below it. */
  isLeaf: boolean
  /**
   * The step (or Success/Failure label) above, when a step can be inserted in between: the
   * card shows a "+" on its incoming line. Null for the trigger, which has nothing above it.
   */
  insertAfter: { id: string; title: string; color: string } | null
}

/** `data` of a Success / Failure label on the canvas. */
export interface ConnectorNodeData {
  connectorType: ConnectorType
  /** Empty branch: shows an "add first step" stub below the label. */
  isLeaf: boolean
  /** Highlighted, e.g. chosen as the place to add a new step. */
  selected: boolean
  /** Briefly emphasised, e.g. right after undo/redo moved it. */
  highlighted: boolean
}

/** `data` of an edge on the canvas. */
export interface LinkEdgeData {
  color: string
}
