import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useMediaQuery } from '@/composables/useMediaQuery'

/** A controllable stand-in for window.matchMedia. */
function mockMatchMedia(initial: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined
  const list = {
    matches: initial,
    addEventListener: vi.fn((_: string, fn: typeof listener) => (listener = fn)),
    removeEventListener: vi.fn(),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(list as unknown as MediaQueryList)
  return { list, change: (matches: boolean) => listener?.({ matches } as MediaQueryListEvent) }
}

function setup(query = '(min-width: 640px)') {
  let matches!: ReturnType<typeof useMediaQuery>
  const wrapper = mount(
    defineComponent({
      setup() {
        matches = useMediaQuery(query)
        return () => h('div')
      },
    }),
  )
  return { matches: () => matches.value, wrapper }
}

describe('useMediaQuery', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts with whether the query matches', () => {
    mockMatchMedia(true)
    expect(setup().matches()).toBe(true)
  })

  it('follows changes, e.g. when a phone rotates', () => {
    const { change } = mockMatchMedia(false)
    const { matches } = setup()
    expect(matches()).toBe(false)
    change(true)
    expect(matches()).toBe(true)
  })

  it('stops listening when unmounted', () => {
    const { list } = mockMatchMedia(false)
    setup().wrapper.unmount()
    expect(list.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
