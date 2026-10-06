import type { BusinessHoursSlot, RawFlowNode } from '@/types/flow'
import { getNodeTitle } from './flowGraph'

/** Everything the details drawer can edit, for every node type. */
export interface NodeFormValues {
  title: string
  description: string
  texts: string[]
  attachments: string[]
  comment: string
  times: BusinessHoursSlot[]
  timezone: string
}

export function emptyNodeForm(): NodeFormValues {
  return {
    title: '',
    description: '',
    texts: [],
    attachments: [],
    comment: '',
    times: [],
    timezone: 'UTC',
  }
}

/** Fills the drawer form from a payload node (copies arrays so edits don't touch the source). */
export function toNodeForm(node: RawFlowNode): NodeFormValues {
  const form: NodeFormValues = {
    ...emptyNodeForm(),
    title: getNodeTitle(node),
    description: node.description ?? '',
  }

  switch (node.type) {
    case 'sendMessage':
      for (const part of node.data.payload) {
        if (part.type === 'text') form.texts.push(part.text)
        else form.attachments.push(part.attachment)
      }
      break
    case 'addComment':
      form.comment = node.data.comment
      break
    case 'dateTime':
      form.times = node.data.times.map((slot) => ({ ...slot }))
      form.timezone = node.data.timezone
      break
  }
  return form
}

/** A plain copy of the form (no reactive proxies), safe to hand to the API and cache. */
export function cloneNodeForm(form: NodeFormValues): NodeFormValues {
  return {
    title: form.title,
    description: form.description,
    texts: [...form.texts],
    attachments: [...form.attachments],
    comment: form.comment,
    times: form.times.map((slot) => ({ ...slot })),
    timezone: form.timezone,
  }
}

/** Whether two forms hold the same values (field by field, so key order doesn't matter). */
export function isSameNodeForm(a: NodeFormValues, b: NodeFormValues): boolean {
  const sameList = <T>(x: T[], y: T[], same: (p: T, q: T) => boolean) =>
    x.length === y.length && x.every((item, i) => same(item, y[i] as T))
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.comment === b.comment &&
    a.timezone === b.timezone &&
    sameList(a.texts, b.texts, (p, q) => p === q) &&
    sameList(a.attachments, b.attachments, (p, q) => p === q) &&
    sameList(
      a.times,
      b.times,
      (p, q) => p.day === q.day && p.startTime === q.startTime && p.endTime === q.endTime,
    )
  )
}
