import { test, expect } from '@playwright/test'
import path from 'node:path'

// Generates the screenshots used in the README. Run with:
//   npx playwright test e2e/screenshots.spec.js
const DOCS = path.resolve(import.meta.dirname, '..', '..', 'docs')
const shot = (name) => path.join(DOCS, name)

const password = 'demoPass123'

test.describe('README screenshots', () => {
  test('capture app screenshots', async ({ page }) => {
    const username = 'shot_' + Math.random().toString(36).slice(2, 8)

    await page.goto('/login')
    await page.waitForTimeout(300)
    await page.screenshot({ path: shot('login.png'), fullPage: false })

    await page.getByRole('button', { name: /don't have an account/i }).click()
    await page.locator('#username').fill(username)
    await page.locator('#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page.getByRole('heading', { name: 'New Issue' })).toBeVisible()

    // Sort by priority so the protected/critical issues surface at the top,
    // which makes the admin-only styling obvious in the screenshot.
    await page.locator('.controls-bar select').nth(2).selectOption('priority')
    await expect(page.locator('.issue-card-protected').first()).toBeVisible()
    await page.waitForTimeout(3800) // let the welcome toast clear
    await page.screenshot({ path: shot('dashboard.png'), fullPage: false })

    // Protected issue close-up (crop to the first protected card)
    await page.locator('.issue-card-protected').first().screenshot({
      path: shot('protected-issue.png'),
    })

    // Issue detail with a comment
    await page.locator('.issue-card').first().getByRole('link', { name: 'View' }).click()
    await expect(page.getByRole('heading', { name: /Comments/ })).toBeVisible()
    await page.locator('textarea').fill('Rotating the credentials this sprint — tracking in the security channel.')
    await page.getByRole('button', { name: /post comment/i }).click()
    await expect(page.getByText(/Rotating the credentials/)).toBeVisible()
    await page.waitForTimeout(3800) // let the welcome toast clear
    await page.screenshot({ path: shot('issue-detail.png'), fullPage: false })

    // Stats page
    await page.getByRole('link', { name: 'Stats' }).click()
    await expect(page.locator('.chart-panel').first()).toBeVisible()
    await page.waitForTimeout(1500) // let the charts finish animating
    await page.screenshot({ path: shot('stats.png'), fullPage: false })

    // Light theme dashboard
    await page.getByRole('link', { name: /back to dashboard/i }).click()
    await expect(page.getByRole('heading', { name: 'New Issue' })).toBeVisible()
    await page.getByRole('button', { name: /light|dark/i }).click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: shot('dashboard-light.png'), fullPage: false })
  })
})
