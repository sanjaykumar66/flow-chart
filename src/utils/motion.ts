/** The user asked the OS for less motion (WCAG 2.3.3): skip animated pans and zooms. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/** `duration` normally, 0 when reduced motion is preferred. */
export const motionDuration = (duration: number) => (prefersReducedMotion() ? 0 : duration)
