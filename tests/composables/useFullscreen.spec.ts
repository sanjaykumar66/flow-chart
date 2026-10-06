import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useFullscreen } from '@/composables/useFullscreen'

let fullscreenElement: Element | null = null

function setup() {
  let api!: ReturnType<typeof useFullscreen>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useFullscreen()
        return () => h('div')
      },
    }),
  )
  return { api, wrapper }
}

function enterFullscreen() {
  fullscreenElement = document.documentElement
  document.dispatchEvent(new Event('fullscreenchange'))
}

describe('useFullscreen', () => {
  beforeEach(() => {
    fullscreenElement = null
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => fullscreenElement,
      configurable: true,
    })
    document.documentElement.requestFullscreen = vi.fn().mockImplementation(async () => {
      enterFullscreen()
    })
    document.exitFullscreen = vi.fn().mockImplementation(async () => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
    })
  })

  afterEach(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true })
  })

  it('reports support and starts out of fullscreen', () => {
    const { api } = setup()
    expect(api.isSupported).toBe(true)
    expect(api.isFullscreen.value).toBe(false)
  })

  it('toggles fullscreen on and off', async () => {
    const { api } = setup()
    await api.toggle()
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
    expect(api.isFullscreen.value).toBe(true)

    await api.toggle()
    expect(document.exitFullscreen).toHaveBeenCalled()
    expect(api.isFullscreen.value).toBe(false)
  })

  it('follows fullscreen changes made outside the app (e.g. pressing Esc)', () => {
    const { api } = setup()
    enterFullscreen()
    expect(api.isFullscreen.value).toBe(true)
  })

  it('stops listening once unmounted', () => {
    const { api, wrapper } = setup()
    wrapper.unmount()
    enterFullscreen()
    expect(api.isFullscreen.value).toBe(false)
  })

  it('does nothing when fullscreen is unsupported', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true })
    const { api } = setup()
    await api.toggle()
    expect(api.isSupported).toBe(false)
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled()
  })

  it('logs instead of throwing when the browser refuses', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api } = setup()
    await expect(api.toggle()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})
