import { expect, test } from '@playwright/test'
import { card, expectNoA11yViolations, openApp } from './helpers'

/** WCAG 2.1 AA (axe-core) on every screen and dialog, in a real browser. */
test.describe('WCAG 2.1 AA', () => {
  test('canvas', async ({ page }) => {
    await openApp(page)
    await expectNoA11yViolations(page)
  })

  for (const [type, id] of [
    ['Trigger', '1'],
    ['Business Hours', 'd09c08'],
    ['Send Message', 'b0653a'],
    ['Add Comment', 'e879e4'],
  ]) {
    test(`details drawer: ${type}`, async ({ page }) => {
      await openApp(page, `/nodes/${id}`)
      await expect(page.locator('.n-drawer h2')).toBeVisible()
      await expectNoA11yViolations(page)
    })
  }

  test('details drawer with validation errors', async ({ page }) => {
    await openApp(page, '/nodes/e879e4')
    await page.getByLabel('Title').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Title is required')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('create node dialog, with its menus open', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Create New Node' }).click()
    await expect(page.getByRole('dialog', { name: 'Create New Node' })).toBeVisible()
    await expectNoA11yViolations(page)
    await page.getByLabel('Connect after').first().click()
    await expectNoA11yViolations(page)
  })

  test('delete dialog', async ({ page }) => {
    await openApp(page, '/nodes/e879e4')
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Delete node?')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('discard changes dialog', async ({ page }) => {
    await openApp(page, '/nodes/e879e4')
    await page.getByLabel('Title').fill('Changed')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Discard unsaved changes?')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('keyboard shortcuts dialog', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('more actions menu and the reset dialog', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'More actions' }).click()
    await expect(page.getByText('Reset demo data…')).toBeVisible()
    await expectNoA11yViolations(page)
    await page.getByText('Reset demo data…').click()
    await expect(page.getByText('Reset the demo flow?')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('focused step and toast', async ({ page }) => {
    await openApp(page)
    await card(page, 'Welcome Message').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Control+z')
    await expect(page.getByText(/^Undone:/)).toBeVisible()
    await expectNoA11yViolations(page)
  })
})
