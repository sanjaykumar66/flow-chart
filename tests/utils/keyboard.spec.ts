import { describe, expect, it } from 'vitest'
import { getNudge, isDialogOpen, isEditableTarget } from '@/utils/keyboard'

describe('isEditableTarget', () => {
  it.each(['input', 'textarea', 'select'])('is true for a %s', (tag) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(true)
  })

  it('is true for content-editable elements', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'isContentEditable', { value: true })
    expect(isEditableTarget(el)).toBe(true)
  })

  it('is false for buttons and empty targets', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe('getNudge', () => {
  it.each([
    ['ArrowUp', { x: 0, y: -10 }],
    ['ArrowDown', { x: 0, y: 10 }],
    ['ArrowLeft', { x: -10, y: 0 }],
    ['ArrowRight', { x: 10, y: 0 }],
  ])('moves %s by the small step', (key, delta) => {
    expect(getNudge({ key, shiftKey: false })).toEqual(delta)
  })

  it('moves further with Shift', () => {
    expect(getNudge({ key: 'ArrowRight', shiftKey: true })).toEqual({ x: 50, y: 0 })
    expect(getNudge({ key: 'ArrowUp', shiftKey: true }, 5, 25)).toEqual({ x: 0, y: -25 })
  })

  it('ignores other keys', () => {
    expect(getNudge({ key: 'Enter', shiftKey: false })).toBeNull()
  })
})

describe('isDialogOpen', () => {
  it('reports whether a Naive modal is on screen', () => {
    expect(isDialogOpen()).toBe(false)
    const wrapper = document.createElement('div')
    wrapper.className = 'n-modal-body-wrapper'
    document.body.append(wrapper)
    expect(isDialogOpen()).toBe(true)
  })
})
