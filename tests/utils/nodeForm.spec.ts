import { describe, expect, it } from 'vitest'
import type { RawFlowNode } from '@/types/flow'
import { cloneNodeForm, emptyNodeForm, isSameNodeForm, toNodeForm } from '@/utils/nodeForm'
import { loadPayload } from '../fixtures/payload'

const node = (id: string) => loadPayload().find((n) => String(n.id) === id) as RawFlowNode

describe('toNodeForm', () => {
  it('splits a message into texts and attachments', () => {
    const form = toNodeForm(node('b0653a'))
    expect(form.title).toBe('Welcome Message')
    expect(form.texts).toEqual(['Hello there\n\nwelcome to the chat!'])
    expect(form.attachments).toHaveLength(1)
    expect(form.attachments[0]).toMatch(/^https:\/\/fastly\.picsum\.photos\//)
  })

  it('reads the comment', () => {
    expect(toNodeForm(node('e879e4')).comment).toBe('User message during off hours')
  })

  it('reads business hours and timezone, copying the slots', () => {
    const source = node('d09c08')
    const form = toNodeForm(source)
    expect(form.times).toHaveLength(7)
    expect(form.timezone).toBe('UTC')

    form.times[0]!.startTime = '10:00'
    expect(source.type === 'dateTime' && source.data.times[0]!.startTime).toBe('09:00')
  })

  it('gives the trigger only a title', () => {
    expect(toNodeForm(node('1'))).toEqual({ ...emptyNodeForm(), title: 'Trigger' })
  })
})

describe('cloneNodeForm', () => {
  it('copies arrays and slots so the copy is independent and cloneable', async () => {
    const { reactive } = await import('vue')
    const form = reactive(toNodeForm(node('d09c08')))
    const copy = cloneNodeForm(form)
    expect(() => structuredClone(copy)).not.toThrow()
    copy.times[0]!.startTime = '10:00'
    expect(form.times[0]!.startTime).toBe('09:00')
  })
})

describe('isSameNodeForm', () => {
  it('treats copies of the same form as equal', () => {
    const form = toNodeForm(node('d09c08'))
    expect(isSameNodeForm(form, cloneNodeForm(form))).toBe(true)
  })

  it('ignores the key order of business-hours slots', () => {
    const form = {
      ...emptyNodeForm(),
      times: [{ day: 'mon' as const, startTime: '09:00', endTime: '17:00' }],
    }
    const reordered = {
      ...form,
      times: [{ endTime: '17:00', startTime: '09:00', day: 'mon' as const }],
    }
    expect(isSameNodeForm(form, reordered)).toBe(true)
  })

  it.each([
    ['title', { title: 'x' }],
    ['description', { description: 'x' }],
    ['comment', { comment: 'x' }],
    ['timezone', { timezone: 'Asia/Kolkata' }],
    ['texts', { texts: ['x'] }],
    ['attachments', { attachments: ['x.png'] }],
    ['times', { times: [{ day: 'mon' as const, startTime: '09:00', endTime: '17:00' }] }],
  ])('spots a change in %s', (_, change) => {
    expect(isSameNodeForm(emptyNodeForm(), { ...emptyNodeForm(), ...change })).toBe(false)
  })

  it('spots a changed slot time', () => {
    const slot = { day: 'mon' as const, startTime: '09:00', endTime: '17:00' }
    const a = { ...emptyNodeForm(), times: [slot] }
    const b = { ...emptyNodeForm(), times: [{ ...slot, endTime: '18:00' }] }
    expect(isSameNodeForm(a, b)).toBe(false)
  })
})
