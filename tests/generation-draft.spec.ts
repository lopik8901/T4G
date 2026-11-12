import { test, expect } from '@playwright/test'

test('missing mechanics produce a clearly non-playable draft instead of a misleading playable activity', async ({ page }) => {
  await page.route('**/api/status', route => route.fulfill({ json: { mode: 'live', provider: 'codex', ready: true } }))
  const id = '3315bb42-e497-4c2c-ae43-d2ee1aa12e32'
  await page.route('**/api/agent', route => route.fulfill({ status: 202, json: { pendingJob: id } }))
  let polls = 0
  await page.route(`**/api/generation/${id}`, route => {
    polls++
    return route.fulfill({ json: polls === 1 ? { id, status: 'running', stage: 'Drafting hand guidance and target collision tests' } : { id, status: 'complete', stage: 'Draft ready', report: {
      id, name: 'Reusable hand guidance', status: 'awaiting_isolation', summary: 'Isolated code execution is not configured.', sourceHash: 'abc', attempts: 1,
      plan: { task: 'code_generation', summary: 'Separate following and persistent target outcomes.', reuse: ['mirror-hand-input'], missing: ['follow-hand', 'target collision'], components: [], acceptance: ['Tracking loss releases objects'] }, diagnostics: [], testsExecuted: false, previewAvailable: false, developerApproved: false,
    } } })
  })
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Create new game', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Your activity idea').fill('Butterflies follow hands into flowers and bloom permanently.')
  await page.getByRole('button', { name: 'Create my activity', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Drafting hand guidance')
  await expect(page.getByRole('region', { name: 'New mechanic development draft' })).toBeVisible()
  await expect(page.getByText('This is a developer draft, not a playable activity. Your existing game is unchanged.', { exact: true })).toBeVisible()
  await expect(page.locator('.cp-editor')).toHaveCount(0)
  await page.getByText('What was prepared', { exact: true }).click()
  await expect(page.getByText('Generated unit tests: authored, not executed', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download developer draft' })).toHaveAttribute('href', `/api/generation/${id}/bundle`)
})
