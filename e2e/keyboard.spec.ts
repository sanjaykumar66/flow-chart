import { expect, test, type Page } from '@playwright/test'
import { card, openApp } from './helpers'

const position = (page: Page, id: string) =>
  page
    .locator(`.vue-flow__node[data-id="${id}"]`)
    .evaluate((el) => (el as HTMLElement).style.transform)

/** Keyboard-only use of the app (WCAG 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible). */
test.describe('keyboard', () => {
  test('reaches the toolbar, the steps and the canvas controls with Tab', async ({ page }) => {
    await openApp(page)
    const reached: string[] = []
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      reached.push(
        await page.evaluate(
          () =>
            document.activeElement?.getAttribute('aria-label') ??
            document.activeElement?.textContent?.trim() ??
            '',
        ),
      )
    }
    expect(reached).toContain('Create New Node')
    expect(reached).toContain('Keyboard shortcuts')
    expect(reached.some((name) => name.startsWith('Welcome Message, Send Message'))).toBe(true)
    expect(reached.some((name) => name.startsWith('Add a step between'))).toBe(true)
    // the "+" above a step comes right before it
    const welcome = reached.findIndex((name) => name.startsWith('Welcome Message,'))
    expect(reached[welcome - 1]).toBe('Add a step between “Success” and “Welcome Message”')
    // the canvas controls are a single Tab stop
    expect(reached.filter((name) => /^Zoom|^Fit flow|fullscreen$/.test(name))).toHaveLength(1)
  })

  test('opens a step with Enter, moves focus into the drawer, and returns it on Esc', async ({
    page,
  }) => {
    await openApp(page)
    await card(page, 'Away Message').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nodes\/b6a0c1$/)
    const heading = page.locator('.n-drawer h2')
    await expect(heading).toBeFocused()

    await page.keyboard.press('Tab') // the drawer's close button
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Title')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
    await expect(card(page, 'Away Message')).toBeFocused()
  })

  test('shows a visible focus indicator on steps', async ({ page }) => {
    await openApp(page)
    await card(page, 'Trigger').focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    // a solid blue ring appears around the focused card
    await expect
      .poll(() => card(page, 'Trigger').evaluate((el) => getComputedStyle(el).boxShadow))
      .toMatch(/oklch\(0\.546 0\.245 262\.881\)|rgb\(21, 93, 252\)/)
  })

  test('moves a step with the arrow keys and undoes the whole move at once', async ({ page }) => {
    await openApp(page)
    const start = await position(page, 'b0653a')
    await card(page, 'Welcome Message').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowDown')
    const moved = await position(page, 'b0653a')
    expect(moved).not.toBe(start)
    await expect(card(page, 'Welcome Message')).toBeFocused()

    await page.keyboard.press('Control+z')
    await expect.poll(() => position(page, 'b0653a')).toBe(start)
  })

  test('moves between canvas controls with the arrow keys', async ({ page }) => {
    await openApp(page)
    const controls = page.getByRole('toolbar', { name: 'Canvas controls' })
    await controls.getByRole('button', { name: 'Zoom in' }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(controls.getByRole('button', { name: 'Zoom out' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(controls.getByRole('button', { name: /fullscreen/ })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(controls.getByRole('button', { name: 'Zoom in' })).toBeFocused()
  })

  test('opens the shortcuts with ? and closes them with Esc', async ({ page }) => {
    await openApp(page)
    await page.keyboard.press('?')
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('creates a step with the keyboard only', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Create New Node' }).focus()
    await page.keyboard.press('Enter')
    await page.getByLabel('Title').first().fill('Keyboard step')
    await page.keyboard.press('Tab') // description
    await page.keyboard.press('Tab') // type of node
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab') // connect after
    await page.keyboard.press('Enter')
    await page.keyboard.type('Away')
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown') // to "Away Message"
    await page.keyboard.press('Enter')
    await expect(page.locator('.n-tree-select')).toContainText('Away Message')
    await page.getByRole('button', { name: 'Create', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('“Keyboard step” added')).toBeVisible()
  })

  test('resets the layout from the More actions menu with the keyboard', async ({ page }) => {
    await openApp(page)
    const start = await position(page, 'b0653a')
    await card(page, 'Welcome Message').focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.getByRole('button', { name: 'More actions' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/^Layout reset/)).toBeVisible()
    await expect.poll(() => position(page, 'b0653a')).toBe(start)
  })

  test('after deleting a step, focus moves to the step above it', async ({ page }) => {
    await openApp(page, '/nodes/e879e4')
    await page.getByRole('button', { name: 'Delete' }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Delete node?' })
    await dialog.getByRole('button', { name: 'Delete' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('“Add Comment #1” deleted')).toBeVisible()
    await expect(card(page, 'Away Message')).toBeFocused()
  })

  test('Cancel on the delete dialog leaves focus on the Delete button', async ({ page }) => {
    await openApp(page, '/nodes/e879e4')
    const deleteButton = page.getByRole('button', { name: 'Delete' })
    await deleteButton.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    await expect(page.getByText('Delete node?')).toBeHidden()
    await expect(deleteButton).toBeFocused()
  })

  test('changes the Business Hours timezone with the keyboard', async ({ page }) => {
    await openApp(page, '/nodes/d09c08')
    await page.getByLabel('Time Zone').first().focus()
    await page.keyboard.press('Enter')
    await page.keyboard.type('Kolkata')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    await page.reload()
    await expect(page.locator('.n-drawer')).toContainText('Asia/Kolkata')
  })
})
