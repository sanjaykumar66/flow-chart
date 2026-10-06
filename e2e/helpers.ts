import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** axe-core tags for WCAG 2.1 levels A and AA (2.0 rules included, as 2.1 builds on them). */
export const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/**
 * Library markup we can't change, excluded on purpose: Naive UI's focus trap adds empty
 * `aria-hidden` sentinels with tabindex="0" around modals; they only bounce focus back inside.
 */
const LIBRARY_EXCEPTIONS = 'div[aria-hidden="true"][tabindex="0"]:empty'

/** Scans the page as it is now (colour contrast included) and fails on any WCAG 2.1 AA issue. */
export async function expectNoA11yViolations(page: Page) {
  // Let open/close transitions finish so axe sees final colours and states.
  await page.waitForTimeout(400)
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_21_AA)
    .exclude(LIBRARY_EXCEPTIONS)
    .analyze()
  const report = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(' ')),
  }))
  expect(report).toEqual([])
}

/** Opens the app with a clean slate (no saved flow or positions from an earlier test). */
export async function openApp(page: Page, path = '/') {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-started')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-started', '1')
    }
  })
  await page.goto(path)
  await expect(page.getByText('Conversation Opened')).toBeVisible()
}

export const card = (page: Page, title: string) =>
  page.getByRole('button', { name: new RegExp(`^${title},`) })
