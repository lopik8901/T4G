import { test, expect } from '@playwright/test'

test('slow Docker/provider status cannot silently send an AI edit through offline demo rules', async ({page}) => {
  let release!: () => void
  const ready=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/status',async route=>{await ready;await route.fulfill({json:{mode:'live',provider:'codex',ready:true}})})
  let requests=0
  await page.route('**/api/agent',route=>{requests++;return route.fulfill({json:{patch:{size:1.4},explanation:'Validated provider edit.',unsupported:false,mode:'live'}})})
  await page.goto('/')
  await page.getByRole('button',{name:'Open Balloon Pop',exact:true}).click()
  await page.getByLabel('Ask for a change').fill('Make the balloons bigger')
  await expect(page.getByRole('button',{name:'Send request'})).toBeDisabled()
  await expect(page.getByText('Connecting assistant...',{exact:true})).toBeVisible()
  expect(requests).toBe(0)
  release()
  await page.getByRole('button',{name:'Send request'}).click()
  await expect(page.getByLabel('Object size',{exact:true})).toHaveValue('1.4')
  expect(requests).toBe(1)
})

test('creation shows progress and an inline failure beside the button, then allows retry', async ({ page }) => {
  await page.route('**/api/status', route => route.fulfill({ json: { mode: 'live', provider: 'codex', ready: true } }))
  await page.route('**/api/agent', async route => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.fulfill({ status: 502, json: { error: 'Codex is temporarily unavailable. Please try again.' } }) })
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Create new game', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Your activity idea').fill('Create a relaxing garden')
  await page.getByRole('button', { name: 'Create my activity', exact: true }).click()
  await expect(page.locator('.cp-creation-feedback')).toContainText('Codex')
  await expect(page.locator('.cp-description-form [role="alert"]')).toContainText('temporarily unavailable')
  await expect(page.getByRole('button', { name: 'Create my activity', exact: true })).toBeEnabled()
  await page.route('**/api/agent', route => route.fulfill({ json: { patch: { template: 'garden', object: 'seed', name: 'A new garden' }, explanation: 'Created a garden.', unsupported: false, mode: 'live' } }))
  await page.getByRole('button', { name: 'Create my activity', exact: true }).click()
  await expect(page.locator('.cp-editor')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A new garden', exact: true })).toBeVisible()
})
