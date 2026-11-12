import { test, expect } from '@playwright/test'
import { reusableComponents } from '../server/components/registry.ts'
import { previewComponent } from '../server/components/preview.ts'

test('real reusable wandering component and registered visual play through the isolated editor',async({page,request})=>{
  test.skip(process.env.CAREPLAY_TEST_COMPONENTS!=='true','Requires the two real validated component examples.')
  test.setTimeout(120000)
  const records=await reusableComponents()
  const mechanic=records.find(r=>r.id==='autonomous-wandering')
  const visual=records.find(r=>r.id==='soft-star-art')
  expect(mechanic).toBeTruthy();expect(visual).toBeTruthy()
  const {game}=await previewComponent(mechanic!,visual!)
  expect((await request.get(`/api/artifacts/${game.id}`)).ok()).toBe(true)
  await page.goto('/')
  await page.getByRole('button',{name:'Open Collaborative Garden',exact:true}).click()
  await page.evaluate(async game=>{const {useStudio}=await import('/src/studio/store.ts');useStudio.getState().attachExperimental(game)},game)
  const object=page.locator('.cp-experimental-object').first()
  await expect(object.locator('svg ellipse').first()).toBeVisible()
  await expect(page.locator('iframe[title="Isolated experimental mechanic"]')).toHaveAttribute('sandbox','allow-scripts')
  const before=await object.getAttribute('style')
  await page.getByRole('button',{name:'Play',exact:true}).click()
  await expect.poll(()=>object.getAttribute('style')).not.toBe(before)
  await expect(page.locator('.cp-preview p[role="status"]')).toContainText('Experimental preview')
  await page.getByRole('button',{name:'Pause',exact:true}).click()
  await page.screenshot({path:'artifacts/component-preview.png',fullPage:true})
  await page.getByRole('button',{name:'Save',exact:true}).click()
  await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
})
