import { test, expect } from '@playwright/test'

test('real wizard request generates an isolated playable preview when Docker is configured', async ({ page, request }) => {
  test.skip(process.env.CAREPLAY_TEST_GENERATION !== 'true', 'Opt-in real Codex authoring check; consumes account allowance.')
  test.setTimeout(600000)
  let lastStage = ''
  page.on('response', async response => {
    if (!/\/api\/generation\/[a-f0-9-]+$/.test(response.url())) return
    try { const job=await response.json();if(job.stage!==lastStage){lastStage=job.stage;console.log(`[wizard] ${job.stage}`)} } catch {}
  })
  page.on('console',message=>{if(message.text().startsWith('[vite]'))console.log(message.text())})
  page.on('pageerror',error=>console.error(`[wizard page error] ${error.message}`))
  const status = await (await request.get('/api/status')).json()
  const canExecute = status.generation?.execution?.available === true
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected', { exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Create new game', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Your activity idea').fill('Create a Butterfly Garden where butterflies acquire a nearby hand, follow that hand, then enter a flower target. The flower blooms permanently and the butterfly departs. Two seated residents, hand tracking only, no points or timer. This requires new hand-following and object-target collision mechanics; do not substitute touch-to-collect.')
  await page.getByRole('button', { name: 'Create my activity', exact: true }).click()
  const draft = page.getByRole('region', { name: 'New mechanic development draft' })
  let rejectNavigation!: () => void
  const unexpectedNavigation=new Promise<never>((_resolve,reject)=>{rejectNavigation=()=>reject(Error('The wizard navigated away during generation.'))})
  const navigation=(frame:import('@playwright/test').Frame)=>{if(frame===page.mainFrame())rejectNavigation()}
  page.on('framenavigated',navigation)
  try { await Promise.race([expect(draft).toBeVisible({timeout:550000}),unexpectedNavigation]) } finally {page.off('framenavigated',navigation)}
  if (canExecute) {
    await expect(draft).toContainText('Experimental playable preview')
    await expect(page.locator('.cp-editor')).toBeVisible()
    await expect(page.locator('iframe[title="Isolated experimental mechanic"]')).toHaveAttribute('sandbox','allow-scripts')
    await expect(page.locator('.cp-experimental-object').first()).toBeVisible()
    await page.getByRole('button',{name:'Play',exact:true}).click()
    await expect(page.locator('.cp-preview p[role="status"]')).toContainText('Experimental preview')
    await page.getByRole('button',{name:'Pause',exact:true}).click()
    await page.getByRole('button',{name:'Save',exact:true}).click()
    await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
    await page.screenshot({path:'artifacts/careplay-generated-live-wizard.png',fullPage:true})
    return
  }
  await expect(draft).toContainText('not a playable activity')
  await expect(page.locator('.cp-editor')).toHaveCount(0)
  await draft.getByText('What was prepared', { exact: true }).click()
  await expect(draft).toContainText('authored, not executed')
  await page.screenshot({ path: 'artifacts/careplay-generated-developer-draft.png', fullPage: true })
})
