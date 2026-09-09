import { test, expect } from '@playwright/test'

const password = 'demoPass123'
const newUsername = () => 'e2e_' + Math.random().toString(36).slice(2, 8)

// Small helper so the recorded video doesn't feel like a jump cut between
// every action — real screen recordings need a beat to be watchable.
const beat = (page, ms = 700) => page.waitForTimeout(ms)

async function signUp(page, username) {
  await page.goto('/login')
  await page.getByRole('button', { name: /don't have an account/i }).click()
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page.getByRole('heading', { name: 'New Issue' })).toBeVisible()
}

test.describe('Issue Tracker', () => {
  test('signs up and lands on a dashboard seeded with starter issues', async ({ page }) => {
    await signUp(page, newUsername())

    // 10 starter issues are seeded on signup, paginated 6 per page
    await expect(page.locator('.issue-card')).toHaveCount(6)
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible()
  })

  test('protected issues cannot be deleted until admin mode is enabled', async ({ page }) => {
    await signUp(page, newUsername())

    const protectedCard = page.locator('.issue-card-protected').first()
    await expect(protectedCard).toBeVisible()
    await expect(protectedCard.getByText('Admin Only')).toBeVisible()

    // The delete button is disabled for non-admins...
    await expect(protectedCard.getByRole('button', { name: 'Delete' })).toBeDisabled()

    // ...and enabling admin mode unlocks it.
    await page.getByRole('button', { name: /become admin/i }).click()
    await expect(page.getByRole('button', { name: /admin mode: on/i })).toBeVisible()
    await expect(protectedCard.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  test('creates an issue and shows it on the dashboard', async ({ page }) => {
    await signUp(page, newUsername())

    await page.locator('#title').fill('Add rate limiting to login endpoint')
    await page.locator('#description').fill('Brute-force protection is missing on /auth/token.')
    await page.locator('#priority').selectOption('High')
    await page.locator('#labels').fill('security, backend')
    await page.locator('#assignee').fill('Aryaen')
    await page.getByRole('button', { name: /add issue/i }).click()

    await expect(page.getByText('Add rate limiting to login endpoint')).toBeVisible()
  })

  test('walkthrough for the demo recording', async ({ page }) => {
    await page.goto('/login')
    await beat(page, 900)

    // --- Sign up ---
    await page.getByRole('button', { name: /don't have an account/i }).click()
    await beat(page, 500)
    await page.locator('#username').pressSequentially(newUsername(), { delay: 70 })
    await beat(page, 300)
    await page.locator('#password').pressSequentially(password, { delay: 60 })
    await beat(page, 500)
    await page.locator('button[type="submit"]').click()

    // --- Dashboard with seeded issues ---
    await expect(page.getByRole('heading', { name: 'New Issue' })).toBeVisible()
    await beat(page, 1200)
    await page.mouse.wheel(0, 400)
    await beat(page, 900)
    await page.mouse.wheel(0, 400)
    await beat(page, 1100)

    // --- Create a new issue ---
    await page.mouse.wheel(0, -900)
    await beat(page, 600)
    await page.locator('#title').pressSequentially('Add rate limiting to login endpoint', { delay: 35 })
    await beat(page, 250)
    await page.locator('#description').pressSequentially('Brute-force protection is missing on /auth/token.', { delay: 20 })
    await beat(page, 300)
    await page.locator('#priority').selectOption('High')
    await beat(page, 250)
    await page.locator('#labels').pressSequentially('security, backend', { delay: 45 })
    await beat(page, 250)
    await page.locator('#assignee').pressSequentially('Aryaen', { delay: 60 })
    await beat(page, 400)
    await page.getByRole('button', { name: /add issue/i }).click()
    await expect(page.getByText('Add rate limiting to login endpoint')).toBeVisible()
    await beat(page, 1200)

    // --- Filter + sort controls ---
    await page.locator('.search-input').pressSequentially('database', { delay: 80 })
    await beat(page, 1200)
    await page.locator('.search-input').fill('')
    await beat(page, 600)
    await page.locator('.controls-bar select').nth(2).selectOption('priority')
    await beat(page, 1200)

    // --- Protected issue: blocked delete, then admin mode ---
    const protectedCard = page.locator('.issue-card-protected').first()
    await protectedCard.scrollIntoViewIfNeeded()
    await beat(page, 1200)
    await expect(protectedCard.getByRole('button', { name: 'Delete' })).toBeDisabled()
    await beat(page, 800)

    await page.getByRole('button', { name: /become admin/i }).click()
    await expect(page.getByRole('button', { name: /admin mode: on/i })).toBeVisible()
    await beat(page, 1400)

    // --- Issue detail + comment ---
    await page.locator('.issue-card').first().getByRole('link', { name: 'View' }).click()
    await expect(page.getByRole('heading', { name: /Comments/ })).toBeVisible()
    await beat(page, 1000)
    await page.locator('textarea').pressSequentially('Confirmed on staging — picking this up today.', { delay: 25 })
    await beat(page, 400)
    await page.getByRole('button', { name: /post comment/i }).click()
    await expect(page.getByText('Confirmed on staging — picking this up today.')).toBeVisible()
    await beat(page, 1400)

    // --- Stats page ---
    await page.getByRole('link', { name: 'Stats' }).click()
    await expect(page.locator('.chart-panel').first()).toBeVisible()
    await beat(page, 2200)

    // --- Settings page ---
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible()
    await beat(page, 1500)

    // --- Theme toggle ---
    await page.getByRole('link', { name: /back to dashboard/i }).click()
    await beat(page, 800)
    await page.getByRole('button', { name: /light|dark/i }).click()
    await beat(page, 1800)
    await page.getByRole('button', { name: /light|dark/i }).click()
    await beat(page, 1200)
  })
})
