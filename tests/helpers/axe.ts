import axe from 'axe-core'

/**
 * axe-core rules to run: WCAG 2.1 levels A and AA (2.0 rules included, as 2.1 builds on them),
 * plus axe's best practices, such as heading order and landmarks, which Lighthouse also checks.
 */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

/**
 * Known library markup we can't change, excluded on purpose:
 * - Naive UI's focus trap (vueuc) adds empty `aria-hidden` sentinels with tabindex="0" around
 *   every modal. They only bounce focus back into the dialog and are never read out.
 */
export const LIBRARY_EXCEPTIONS = ['div[aria-hidden="true"][tabindex="0"]:empty']

/**
 * Runs axe-core's WCAG 2.1 A/AA rules and fails with a readable list of violations.
 * Colour contrast needs real layout and rendering, which happy-dom doesn't do; the
 * Playwright scan (`yarn test:a11y`) covers it in a real browser.
 */
export async function expectNoA11yViolations(context: Element = document.body) {
  const { violations } = await axe.run(
    { include: [context], exclude: LIBRARY_EXCEPTIONS },
    {
      runOnly: { type: 'tag', values: AXE_TAGS },
      rules: { 'color-contrast': { enabled: false } },
    },
  )
  if (violations.length === 0) return
  const report = violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n${v.nodes.map((n) => `  - ${n.target.join(' ')}`).join('\n')}`,
    )
    .join('\n')
  throw new Error(`WCAG 2.1 AA violations:\n${report}`)
}
