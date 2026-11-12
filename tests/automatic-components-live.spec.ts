import {test,expect} from '@playwright/test'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {canonicalCapability} from '../server/generation/discovery.ts'

test('normal wizard automatically generates missing dwell behavior then reuses it with another theme',async({context,request})=>{
  test.skip(process.env.CAREPLAY_TEST_AUTOMATIC_COMPONENTS!=='true','Real Codex/Docker/browser test; consumes allowance. No model/API/source mocks.')
  test.setTimeout(3600000)
  const initial=await(await request.get('/api/components')).json()
  const reuseOnly=process.env.CAREPLAY_TEST_AUTOMATIC_REUSE_ONLY==='true'
  expect(initial.persisted.some((r:any)=>['validated','approved'].includes(r.status)&&r.capabilities.map(canonicalCapability).includes('dwell-selection')),'Start state must match a fresh Test A or a reuse-only continuation.').toBe(reuseOnly)
  const results:any[]=reuseOnly?JSON.parse(await readFile('artifacts/automatic-components-live.json','utf8')).results.filter((r:any)=>r.theme==='flowers'):[]
  if(reuseOnly)expect(results).toHaveLength(1)
  await mkdir('artifacts',{recursive:true})
  try{
    for(const theme of reuseOnly?['fish']:['flowers','fish']){
      const page=await context.newPage();page.setDefaultTimeout(30000)
      let report:any,game:any,lastStage=''
      let rejectJob!:(error:Error)=>void
      const failed=new Promise<never>((_,reject)=>{rejectJob=reject})
      page.on('response',async response=>{try{
        if(/\/api\/generation\/[a-f0-9-]+$/.test(response.url())){
          const job=await response.json()
          if(job.stage!==lastStage){lastStage=job.stage;console.log(`[${theme}] ${job.stage}`)}
          if(job.status==='failed'||job.status==='complete'&&!job.report.previewAvailable)rejectJob(Error(JSON.stringify(job.report??job.error)))
          if(job.status==='complete')report=job.report
        }
        if(/\/api\/artifacts\/[a-f0-9-]+$/.test(response.url())&&response.ok())game=(await response.json()).game
      }catch{}})
      // ONLY video/landmarks are synthetic. Generated game worker and backend remain real.
      await page.addInitScript(()=>{
        if(window.top!==window)return
        navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const c=canvas.getContext('2d')!;c.fillStyle='#819d90';c.fillRect(0,0,640,480);return canvas.captureStream(15)}
        const NativeWorker=window.Worker
        const CameraWorker=class extends EventTarget{
          onmessage:((event:MessageEvent)=>void)|null=null
          postMessage(data:{type:string;time:number;frame?:ImageBitmap}){
            if(data.type==='init'){queueMicrotask(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})));return}
            data.frame?.close();const rect=document.querySelector('.cp-preview-stage')!.getBoundingClientRect(),scale=Math.max(rect.width/640,rect.height/480)
            const hands=(Reflect.get(window,'controlledHands')??[]).map((p:{x:number;y:number})=>Array.from({length:21},()=>({x:((1-p.x)*rect.width+(640*scale-rect.width)/2)/(640*scale),y:(p.y*rect.height+(480*scale-rect.height)/2)/(480*scale)})))
            this.onmessage?.(new MessageEvent('message',{data:{type:'hands',hands,time:data.time}}))
          }
          terminate(){}
        }
        Reflect.set(window,'Worker',class{constructor(url:string|URL,options?:WorkerOptions){return String(url)==='/hand-tracker.js'?new CameraWorker():new NativeWorker(url,options)}})
      })
      await page.goto('/')
      await expect(page.getByText('Codex CLI connected',{exact:true})).toBeVisible({timeout:15000})
      await page.getByRole('button',{name:'Create new game',exact:true}).click()
      await page.getByRole('button',{name:'Continue',exact:true}).click()
      const prompt=`Create a calm ${theme==='flowers'?'Flower Pause Garden':'Quiet Fish Pond'} for two seated residents. Show three large stationary ${theme} spaced well apart, with approved local ${theme==='flowers'?'flower':'fish'} illustrations and labels. Select a target only when a palm stays close continuously for 1.2 seconds. A brief touch must not select it. Moving away or losing tracking resets partial contact. Two hands may cooperate, but cannot double-complete a target. Completed ${theme} remain visible in a changed state. One gentle round with three selections, visible shared progress, completion and Play Again. No timer, penalties or competitive score. Keep the reusable sustained-contact selection behavior independent of this theme; game-specific progress glue can remain local. This requires a real dwell interaction rather than the instant-contact garden template. Use only hand tracking.`
      await page.getByLabel('Your activity idea').fill(prompt)
      await page.getByRole('button',{name:'Create my activity',exact:true}).click()
      await Promise.race([expect(page.locator('.cp-editor')).toBeVisible({timeout:1800000}),failed])
      await expect.poll(()=>!!report&&!!game,{timeout:15000}).toBe(true)
      const proposal=JSON.parse(await readFile(`.careplay/proposals/${report.id}/proposal.json`,'utf8'))
      const before=JSON.parse(await readFile(`.careplay/proposals/${report.id}/discovery-before-components.json`,'utf8'))
      const pins=proposal.bundle.linkedComponents
      expect(pins.length).toBeGreaterThan(0)
      if(theme==='flowers'){
        expect(before.some((d:any)=>d.decision==='generate')).toBe(true)
        expect(report.plan.componentTasks.length).toBeGreaterThan(0)
        expect(report.componentWork.some((w:any)=>w.generatorInvoked&&w.status==='generated')).toBe(true)
      }else{
        expect(report.componentWork.every((w:any)=>!w.generatorInvoked)).toBe(true)
        expect(pins.some((p:any)=>p.hash===results[0].pins[0].hash&&p.version===results[0].pins[0].version)).toBe(true)
      }
      const progress=page.getByRole('progressbar',{name:'Round progress'})
      await page.getByRole('button',{name:'Enable camera',exact:true}).click()
      await page.getByRole('button',{name:'Play',exact:true}).click()
      const setHands=async(hands:{x:number;y:number}[])=>page.evaluate(hands=>Reflect.set(window,'controlledHands',hands),hands)
      const nodes=page.locator('.cp-experimental-object')
      const position=async(index:number)=>nodes.nth(index).evaluate(e=>({x:parseFloat((e as HTMLElement).style.left)/100,y:parseFloat((e as HTMLElement).style.top)/100}))
      await setHands([await position(0)]);await page.waitForTimeout(400)
      await expect(progress).toHaveAttribute('value','0')
      await setHands([]);await page.waitForTimeout(700);await expect(progress).toHaveAttribute('value','0')
      for(let i=0;i<3;i++){
        await setHands([await position(i)]);await expect(progress).toHaveAttribute('value',String(i+1),{timeout:10000})
        await setHands([]);await page.waitForTimeout(500)
      }
      await expect(page.getByRole('button',{name:'Play Again',exact:true})).toBeVisible()
      await page.getByRole('button',{name:'Play Again',exact:true}).click();await expect(progress).toHaveAttribute('value','0')
      await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
      await page.screenshot({path:`artifacts/automatic-${theme}.png`,fullPage:true})
      const row={theme,id:report.id,report,pins:pins.map(({source,...pin}:any)=>pin),initialDiscovery:before}
      results.push(row);await writeFile('artifacts/automatic-components-live.json',JSON.stringify({results},null,2))
      console.log(JSON.stringify({theme,id:report.id,pins:row.pins,componentWork:report.componentWork}))
      await page.close()
    }
  }catch(error){await writeFile('artifacts/automatic-components-live.json',JSON.stringify({results,error:error instanceof Error?error.message:'Test failed'},null,2));throw error}
})
