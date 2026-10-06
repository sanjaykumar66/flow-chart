import { onBeforeUnmount, ref, type Ref } from 'vue'

/** Tailwind's `sm` breakpoint: phones are narrower than this. */
export const SMALL_SCREEN_QUERY = '(min-width: 640px)'

/** Whether a CSS media query matches, kept up to date as the window resizes or rotates. */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const list = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined
  const matches = ref(list?.matches ?? false)
  const update = (event: MediaQueryListEvent) => (matches.value = event.matches)
  list?.addEventListener?.('change', update)
  onBeforeUnmount(() => list?.removeEventListener?.('change', update))
  return matches
}
