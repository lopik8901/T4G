import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {readFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'

test('real validated complete-game artwork and trusted HUD are visible and accessible',async({page,request})=>{
  test.skip(process.env.CAREPLAY_TEST_COMPLETE_ARTIFACTS!=='true','Requires a real complete-game artifact from the live benchmark.')
  const root=join(process.cwd(),'.careplay/proposals')
  const rows=await Promise.all((await readdir(root)).map(async id=>{try{const p=JSON.parse(await readFile(join(root,id,'proposal.json'),'utf8'));return p.report.previewAvailable&&p.report.design?.interaction==='match-categories'&&p.report.validation?.runtimeChecks.includes('full-design-lifecycle')?p.report:null}catch{return null}}))
  const report=rows.filter(Boolean).at(-1)
  expect(report).toBeTruthy()
  const response=await request.get(`/api/artifacts/${report.id}`);expect(response.ok()).toBe(true)
  const {game}=await response.json()
  await page.goto('/')
  await page.getByRole('button',{name:'Open Collaborative Garden',exact:true}).click()
  await page.evaluate(async game=>{const {useStudio}=await import('/src/studio/store.ts');useStudio.getState().attachExperimental(game)},game)
  await expect(page.locator('.cp-approved-art')).toHaveCount(game.scene.entities.length)
  for(const id of ['apple','orange','banana','basket-apple','basket-orange','basket-banana'])await expect(page.locator(`[data-asset-id="${id}"]`)).toBeVisible()
  await expect(page.locator('.cp-lifecycle-hud')).toContainText('Round 1 of 3')
  await expect(page.getByRole('progressbar',{name:'Round progress'})).toHaveAttribute('value','0')
  const accessibility=await new AxeBuilder({page}).include('.cp-preview').withTags(['wcag2a','wcag2aa']).analyze()
  expect(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))).toEqual([])
  await page.locator('.cp-preview').screenshot({path:'artifacts/complete-sorting-playing.png'})
})
