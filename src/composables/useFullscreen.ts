import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Browser fullscreen for the whole page (`document.documentElement`), so drawers and modals,
 * which render at the end of <body>, stay visible while fullscreen.
 */
export function useFullscreen() {
  const isSupported = typeof document !== 'undefined' && document.fullscreenEnabled === true
  const isFullscreen = ref(false)

  function sync() {
    isFullscreen.value = Boolean(document.fullscreenElement)
  }

  async function toggle() {
    if (!isSupported) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch (error) {
      console.warn('Fullscreen request failed', error)
    }
  }

  onMounted(() => {
    sync()
    document.addEventListener('fullscreenchange', sync)
  })

  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', sync))

  return { isSupported, isFullscreen, toggle }
}
