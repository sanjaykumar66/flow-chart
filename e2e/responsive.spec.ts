import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations, openApp } from './helpers'

/** No sideways scrolling, and every toolbar control fully on screen without overlapping. */
async function expectToolbarFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
  const boxes = await page
    .locator('header')
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((b) => b.getBoundingClientRect().toJSON()))
  const width = page.viewportSize()!.width
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(width)
  }
  for (let i = 1; i < boxes.length; i++)
    expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right)
}

for (const [name, width, height] of [
  ['small phone', 320, 640],
  ['phone', 375, 740],
  ['tablet', 768, 1000],
] as const) {
  test.describe(`${name} (${width}px)`, () => {
    test.use({ viewport: { width, height } })

    test('the toolbar fits without overlapping', async ({ page }) => {
      await openApp(page)
      await expectToolbarFits(page)
      await expect(page.getByRole('heading', { level: 1, name: 'Flow Builder' })).toBeVisible()
      await page.getByRole('button', { name: 'Create New Node' }).click()
      await expect(page.getByRole('dialog', { name: 'Create New Node' })).toBeVisible()
    })

    test('the details drawer fits on screen', async ({ page }) => {
      await openApp(page, '/nodes/b0653a')
      const drawer = page.locator('.n-drawer')
      await expect(drawer).toBeVisible()
      const box = (await drawer.boundingBox())!
      expect(box.width).toBeLessThanOrEqual(width + 0.5) // sub-pixel rounding
      await expect(page.getByRole('button', { name: 'Save' })).toBeInViewport()
      // The drawer sits below the header: its buttons stay clickable, not covered.
      for (const name of ['Undo', 'Create New Node']) {
        const button = page.locator('header').getByRole('button', { name })
        const covered = await button.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return !el.contains(top) && !top?.contains(el)
        })
        expect(covered).toBe(false)
      }
      await expect(page.getByRole('button', { name: 'Delete' })).toBeInViewport()
    })

    test('passes the accessibility scan', async ({ page }) => {
      await openApp(page)
      await expectNoA11yViolations(page)
    })
  })
}
