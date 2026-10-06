import { ref, watch, type Ref, type WatchSource } from 'vue'

/**
 * Becomes true the first time `open` is true and stays true. Lazily loaded dialogs render behind
 * it, so their code downloads on first use and they stay mounted for their close animation.
 */
export function useOpenedOnce(open: WatchSource<boolean>): Readonly<Ref<boolean>> {
  const opened = ref(false)
  watch(
    open,
    (value) => {
      if (value) opened.value = true
    },
    { immediate: true },
  )
  return opened
}
