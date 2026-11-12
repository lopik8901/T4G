import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'

test('trusted artifact fixture integrates create, isolated play, rebuild, undo and save', async ({ page }) => {
  // Transport/UI fixture only: this does not stand in for Docker or live AI validation.
  const bundle = `var CarePlayMechanic={createMechanic(){return {setup(){},update(c,dt){c.entities[0].position.x+=dt*.02;},dispose(){}}}};`
  const hash = createHash('sha256').update(bundle).digest('hex'), sourceHash = 'a'.repeat(64)
  const ids = ['3315bb42-e497-4c2c-ae43-d2ee1aa12e32', '3315bb42-e497-4c2c-ae43-d2ee1aa12e33']
  const game = (index: number) => ({ id: ids[index], name: `Experimental fixture ${index + 1}`, sourceHash, artifactHash: hash, scene: { instruction: 'Guide the circle gently.', parameters: [], entities: [{id:'circle',kind:'circle',x:.2 + index * .2,y:.4,radius:.1,appearance:'circle',color:'#88bb99',state:[]}] } })
  let calls = 0
  await page.route('**/api/status', r => r.fulfill({json:{mode:'live',provider:'codex',ready:true}}))
  await page.route('**/api/agent', async r => {
    if (calls) expect(r.request().postDataJSON().config.experimental.id).toBe(ids[0])
    await r.fulfill({status:202,json:{pendingJob:ids[calls++]}})
  })
  await page.route('**/api/generation/*', r => { const index=ids.indexOf(r.request().url().split('/').pop()!);return r.fulfill({json:{status:'complete',report:{id:ids[index],name:game(index).name,status:'preview_ready',summary:'Trusted fixture preview.',sourceHash,artifactHash:hash,attempts:1,plan:{task:'code_generation',summary:'Fixture.',reuse:[],missing:['fixture'],components:[],acceptance:['Fixture moves.']},quality:{passed:true,checks:[],issues:[],warnings:['Check the lower target for clipping.'],screenshotReviewed:false},diagnostics:[],testsExecuted:true,previewAvailable:true,developerApproved:false,validation:{imageId:'fixture-only',testCount:3,runtimeChecks:['fixture']}}}}) })
  await page.route('**/api/artifacts/*', r => r.fulfill({json:{game:game(ids.indexOf(r.request().url().split('/').pop()!)),browserBundle:bundle}}))
  await page.goto('/')
  await page.getByRole('button',{name:'Create new game',exact:true}).click()
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  await page.getByLabel('Your activity idea').fill('An unsupported fixture mechanic')
  await page.getByRole('button',{name:'Create my activity',exact:true}).click()
  const object=page.locator('.cp-experimental-object')
  await expect(object).toHaveCount(1)
  await page.getByText('Design and validation details',{exact:true}).click()
  await expect(page.getByText('Check the lower target for clipping.',{exact:true})).toBeVisible()
  await expect(page.locator('iframe[title="Isolated experimental mechanic"]')).toHaveAttribute('sandbox','allow-scripts')
  await page.getByRole('button',{name:'Play',exact:true}).click()
  await expect.poll(async()=>parseFloat((await object.getAttribute('style'))!.match(/left: ([\d.]+)%/)![1])).toBeGreaterThan(20.1)
  await page.getByRole('button',{name:'Pause',exact:true}).click()
  await page.getByLabel('Ask for a change').fill('Move the starting position')
  await page.getByRole('button',{name:'Send request'}).click()
  await expect(page.getByLabel('Activity title')).toHaveValue('Experimental fixture 2')
  await page.getByRole('button',{name:'Undo',exact:true}).click()
  await expect(page.getByLabel('Activity title')).toHaveValue('Experimental fixture 1')
  await page.getByRole('button',{name:'Save',exact:true}).click()
  await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
  await page.reload()
  await page.getByRole('button',{name:'Edit Experimental fixture 1',exact:true}).click()
  await expect(object).toHaveCount(1)
})

