import { test, expect } from '@playwright/test'

test('signed-in Codex creates an activity from the wizard', async ({ page }) => {
  test.skip(process.env.CAREPLAY_TEST_CODEX !== 'true', 'Opt-in live-account check.')
  test.setTimeout(150000)
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected', { exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Create new game', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Your activity idea').fill('Create a relaxing garden where two seated residents grow flowers using their hands.')
  await page.getByRole('button', { name: 'Create my activity', exact: true }).click()
  await expect(page.locator('.cp-editor')).toBeVisible({ timeout: 125000 })
  await expect(page.getByRole('combobox', { name: 'Activity type', exact: true })).toHaveValue('garden')
  await page.screenshot({ path: 'artifacts/careplay-codex-created.png', fullPage: true })
})

// Opt-in: this test consumes the signed-in account's Codex allowance.
test('signed-in Codex updates the real editor without an API key', async ({ page }) => {
  test.skip(process.env.CAREPLAY_TEST_CODEX !== 'true', 'Set CAREPLAY_TEST_CODEX=true for the live-account check.')
  test.setTimeout(150000)
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected', { exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Open Collaborative Garden', exact: true }).click()
  await page.getByLabel('Ask for a change').fill('Set the flowers object size to exactly 1.8. Keep all other settings unchanged.')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByLabel('Object size', { exact: true })).toHaveValue('1.8', { timeout: 125000 })
  await expect(page.getByRole('combobox', { name: 'Participants', exact: true })).toHaveValue('2')
  await page.screenshot({ path: 'artifacts/careplay-codex-connected.png', fullPage: true })
})
