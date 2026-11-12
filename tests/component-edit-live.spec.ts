import {test,expect} from '@playwright/test'
import {readFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'
test.use({actionTimeout:30000})

test('real mechanic edit reuses discovery/design and preserves manual preferences and undo',async({page,request})=>{
  test.skip(process.env.CAREPLAY_TEST_EDIT_COMPONENTS!=='true','Real Codex/Docker mechanics edit; requires a completed sorting artifact.')
  test.setTimeout(1000000)
  const root=join(process.cwd(),'.careplay/proposals')
  const rows=await Promise.all((await readdir(root)).map(async id=>{try{const p=JSON.parse(await readFile(join(root,id,'proposal.json'),'utf8'));return p.report.previewAvailable&&p.report.design?.interaction==='match-categories'&&p.report.validation?.runtimeChecks.includes('full-design-lifecycle')?p.report:null}catch{return null}}))
  const original=rows.filter(Boolean).at(-1)
  expect(original).toBeTruthy()
  const {game}=await(await request.get(`/api/artifacts/${original.id}`)).json()
  let completed:any,lastStage=''
  const stages:string[]=[]
  let rejectJob!:(error:Error)=>void
  const failed=new Promise<never>((_,reject)=>{rejectJob=reject})
  page.on('response',async response=>{
    if(!/\/api\/generation\/[a-f0-9-]+$/.test(response.url()))return
    try{const job=await response.json();if(job.stage!==lastStage){lastStage=job.stage;stages.push(job.stage);console.log(job.stage)}
      if(job.status==='failed'||job.status==='complete'&&!job.report.previewAvailable)rejectJob(Error(JSON.stringify(job.report?.diagnostics??job.error)))
      if(job.status==='complete')completed=job.report
    }catch{}
  })
  await page.goto('/')
  await expect(page.getByText('Codex CLI connected',{exact:true})).toBeVisible({timeout:15000})
  await page.getByRole('button',{name:'Open Collaborative Garden',exact:true}).click()
  await page.evaluate(async game=>{const {useStudio}=await import('/src/studio/store.ts');useStudio.getState().attachExperimental(game)},game)
  await expect(page.locator('.cp-approved-art').first()).toBeVisible()
  await page.getByRole('combobox',{name:/^Colour theme/}).selectOption('ocean')
  await page.getByLabel('Activity title',{exact:true}).fill('Our Fruit Workshop')
  await page.getByLabel('Ask for a change').fill('Make hand pickup and target collisions slightly more forgiving; preserve everything else.')
  await page.getByRole('button',{name:'Send request'}).click()
  await Promise.race([expect.poll(()=>completed?.previewAvailable,{timeout:900000}).toBe(true),failed])
  expect(stages.some(s=>s.startsWith('Preserving the current design'))).toBe(true)
  expect(completed.design.lifecycle).toEqual(game.design.lifecycle)
  expect(completed.discovery.some((d:any)=>d.decision==='reuse'&&d.selected==='game-runtime')).toBe(true)
  expect(completed.discovery.some((d:any)=>d.decision==='reuse'&&d.selected==='illustrated-local-assets')).toBe(true)
  expect(completed.validation.runtimeChecks).toContain('full-design-lifecycle')
  await expect(page.getByLabel('Activity title',{exact:true})).toHaveValue('Our Fruit Workshop')
  await expect(page.getByRole('combobox',{name:/^Colour theme/})).toHaveValue('ocean')
  const current=()=>page.evaluate(async()=>{const {useStudio}=await import('/src/studio/store.ts');return useStudio.getState().config.experimental!.id})
  await expect.poll(current).toBe(completed.id)
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(current).toBe(original.id)
  await expect(page.getByRole('region',{name:'New mechanic development draft'})).toHaveCount(0)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await expect.poll(current).toBe(completed.id)
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
  console.log(JSON.stringify({id:completed.id,attempts:completed.attempts,discovery:completed.discovery.map((d:any)=>({id:d.requirementId,decision:d.decision,selected:d.selected}))}))
})

