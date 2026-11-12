import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Real Docker-validated AI artifacts; only camera landmarks are synthetic.
for (const kind of ['butterfly', 'circles'] as const) test(`real generated ${kind} artifact plays in the isolated editor preview`, async ({ page, request }) => {
  test.skip(process.env.CAREPLAY_TEST_ARTIFACTS !== 'true', 'Requires real successful npm run validate:autonomous artifacts.')
  test.setTimeout(90000)
  const root = join(process.cwd(), '.careplay', 'proposals')
  const candidates = await Promise.all((await readdir(root)).map(async id => {
    try { const record = JSON.parse(await readFile(join(root,id,'proposal.json'),'utf8')); return record.report.previewAvailable && record.report.validation?.runtimeChecks.includes(`acceptance:${kind}`) ? record.report : null } catch { return null }
  }))
  const report = candidates.filter(Boolean).at(-1)
  expect(report, `No real Docker acceptance artifact for ${kind}`).toBeTruthy()
  const response = await request.get(`/api/artifacts/${report.id}`)
  expect(response.ok()).toBe(true)
  const { game } = await response.json()
  expect(game.artifactHash).toBe(report.artifactHash)
  await page.addInitScript(() => {
    if (window.top !== window) return
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480
      const paint=()=>{const c=canvas.getContext('2d')!;c.fillStyle='#719487';c.fillRect(0,0,640,480)};paint()
      const stream=canvas.captureStream(15),timer=setInterval(paint,65),track=stream.getVideoTracks()[0],stop=track.stop.bind(track)
      track.stop=()=>{clearInterval(timer);stop()};return stream
    }
    const NativeWorker=window.Worker
    const CameraWorker=class extends EventTarget {
      onmessage: ((event: MessageEvent)=>void)|null=null
      postMessage(data: {type:string;time:number;frame?:ImageBitmap}) {
        if(data.type==='init'){queueMicrotask(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})));return}
        data.frame?.close()
        const rect=document.querySelector('.cp-preview-stage')!.getBoundingClientRect(),scale=Math.max(rect.width/640,rect.height/480)
        const hands=(Reflect.get(window,'controlledHands')??[]).map((p:{x:number;y:number})=>Array.from({length:21},()=>({x:((1-p.x)*rect.width+(640*scale-rect.width)/2)/(640*scale),y:(p.y*rect.height+(480*scale-rect.height)/2)/(480*scale)})))
        this.onmessage?.(new MessageEvent('message',{data:{type:'hands',hands,time:data.time}}))
      }
      terminate() {}
    }
    Reflect.set(window,'Worker',class { constructor(url:string|URL,options?:WorkerOptions){return String(url)==='/hand-tracker.js'?new CameraWorker():new NativeWorker(url,options)} })
  })
  await page.goto('/')
  await page.getByRole('button',{name:'Open Collaborative Garden',exact:true}).click()
  // Seed the editor with the real, validated artifact; do not evaluate its code in the host.
  await page.evaluate(async game => { const {useStudio}=await import('/src/studio/store.ts');useStudio.getState().attachExperimental(game) },game)
  await expect(page.locator('iframe[title="Isolated experimental mechanic"]')).toHaveAttribute('sandbox','allow-scripts')
  await page.getByRole('button',{name:'Enable camera',exact:true}).click()
  await expect(page.getByRole('button',{name:'Stop camera',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Play',exact:true}).click()
  const setHands=async (hands:{x:number;y:number}[])=>page.evaluate(hands=>Reflect.set(window,'controlledHands',hands),hands)
  if(kind==='butterfly') {
    const source=game.scene.entities.find((e:{appearance:string})=>e.appearance==='butterfly'),target=game.scene.entities.find((e:{appearance:string})=>e.appearance==='flower')
    const node=page.locator(`[data-entity-id="${source.id}"]`),flower=page.locator(`[data-entity-id="${target.id}"]`)
    await expect(node).toBeVisible()
    const start=await node.evaluate(e=>({x:parseFloat((e as HTMLElement).style.left)/100,y:parseFloat((e as HTMLElement).style.top)/100}))
    const near={x:Math.min(.95,start.x+.07),y:start.y},other={x:.98,y:.02}
    await setHands([near,other])
    await expect.poll(async()=>node.evaluate((e,start)=>Math.hypot(parseFloat((e as HTMLElement).style.left)/100-start.x,parseFloat((e as HTMLElement).style.top)/100-start.y),start),{timeout:6000}).toBeGreaterThan(.01)
    const destination=await flower.evaluate(e=>({x:parseFloat((e as HTMLElement).style.left)/100,y:parseFloat((e as HTMLElement).style.top)/100}))
    await page.evaluate(async ({near,destination,other})=>{for(let i=1;i<=160;i++){const t=i/160;Reflect.set(window,'controlledHands',[{x:near.x+(destination.x-near.x)*t,y:near.y+(destination.y-near.y)*t},other]);await new Promise(r=>setTimeout(r,50))}},{near,destination,other})
    await expect(flower).toHaveAttribute('data-completed','true',{timeout:7000})
    await setHands([]);await page.waitForTimeout(1500)
    await expect(flower).toBeVisible();await expect(flower).toHaveAttribute('data-completed','true')
  } else {
    const bubbles=page.locator('[data-kind="bubble"]'),initial=await bubbles.count()
    await page.evaluate(async ()=>{for(let i=0;i<35;i++){Reflect.set(window,'controlledHands',[{x:.2+i*.015,y:.5}]);await new Promise(r=>setTimeout(r,50))}Reflect.set(window,'controlledHands',[]);await new Promise(r=>setTimeout(r,1000))})
    expect(await bubbles.count()).toBe(initial)
    // End the rejected path, then let input smoothing settle at the circle's
    // first point. Otherwise the preceding line becomes part of the circle.
    await setHands([]);await page.waitForTimeout(600)
    await setHands([{x:.68,y:.5}]);await page.waitForTimeout(600)
    await page.evaluate(async ()=>{for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;Reflect.set(window,'controlledHands',[{x:.5+Math.cos(a)*.18,y:.5+Math.sin(a)*.18}]);await new Promise(r=>setTimeout(r,50))}})
    await expect.poll(()=>bubbles.count(),{timeout:5000}).toBeGreaterThan(initial)
    await setHands([])
  }
  await expect(page.locator('.cp-preview p[role="status"]')).toContainText('Experimental preview')
  await page.screenshot({path:`artifacts/generated-${kind}-live.png`,fullPage:true})
  await page.getByRole('button',{name:'Pause',exact:true}).click()
  await page.getByRole('button',{name:'Save',exact:true}).click()
  await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
})
