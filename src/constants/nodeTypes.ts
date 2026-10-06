import type { Component } from 'vue'
import {
  BoltIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  PaperAirplaneIcon,
} from '@heroicons/vue/24/outline'
import type { CreatableNodeType, NodeType } from '@/types/flow'

export interface NodeTypeMeta {
  label: string
  icon: Component
  /** Accent colour for the icon (and later the edges leaving the node). */
  color: string
}

export const NODE_TYPES: Record<NodeType, NodeTypeMeta> = {
  trigger: { label: 'Trigger', icon: BoltIcon, color: '#db2777' },
  businessHours: { label: 'Business Hours', icon: CalendarDaysIcon, color: '#ea580c' },
  sendMessage: { label: 'Send Message', icon: PaperAirplaneIcon, color: '#0d9488' },
  addComment: { label: 'Add Comment', icon: ChatBubbleBottomCenterTextIcon, color: '#2563eb' },
}

/** Options for the "Type of Node" select, in the order the spec lists them. */
export const CREATABLE_NODE_TYPES: CreatableNodeType[] = [
  'sendMessage',
  'addComment',
  'businessHours',
]
