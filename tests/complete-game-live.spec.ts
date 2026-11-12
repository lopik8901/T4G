import {test,expect} from '@playwright/test'

for(const scenario of ['sorting','feeding'] as const)test(`real complete ${scenario} game: wizard, all rounds, replay and save`,async({page})=>{
  test.skip(process.env.CAREPLAY_TEST_COMPLETE!=='true','Uses real Codex, Docker and generated code; consumes model allowance.')
  test.setTimeout(1200000)
  let game:any,requests=0,lastStage=''
  let rejectJob!:(error:Error)=>void
  const failed=new Promise<never>((_,reject)=>{rejectJob=reject})
  page.on('request',r=>{if(r.url().endsWith('/api/agent')&&r.method()==='POST')requests++})
  page.on('response',async response=>{
    try{
      if(/\/api\/generation\/[a-f0-9-]+$/.test(response.url())){
        const job=await response.json();if(job.stage!==lastStage){lastStage=job.stage;console.log(`[${scenario}] ${job.stage}`)}
        if(job.status==='failed'||job.status==='complete'&&!job.report.previewAvailable)rejectJob(Error(JSON.stringify(job.report?.diagnostics??job.error)))
        if(job.report)console.log(JSON.stringify({id:job.report.id,attempts:job.report.attempts,validation:job.report.validation}))
      }
      if(/\/api\/artifacts\/[a-f0-9-]+$/.test(response.url())&&response.ok())game=(await response.json()).game
    }catch{}
  })
  page.on('pageerror',e=>console.error(e.message))
  await page.addInitScript(()=>{
    if(window.top!==window)return
    navigator.mediaDevices.getUserMedia=async()=>{
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480
      const paint=()=>{const c=canvas.getContext('2d')!;c.fillStyle='#819d90';c.fillRect(0,0,640,480)};paint()
      const stream=canvas.captureStream(15),timer=setInterval(paint,65),track=stream.getVideoTracks()[0],stop=track.stop.bind(track)
      track.stop=()=>{clearInterval(timer);stop()};return stream
    }
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
  const prompt=scenario==='sorting'?'Create Fruit Sorting for two seated residents: apples, oranges and bananas, three clearly labelled matching baskets. Select and guide fruit with hands only. Wrong baskets gently return fruit with no penalty; correct baskets collect fruit and update shared progress. Three short rounds with three fruits per round and new seeded arrangements. Attractive illustrated fruit and baskets, large forgiving zones, slow motion, clear instructions, gentle completion, Play Again and restart current round. No score or timer. Use the reusable lifecycle SDK, not a special template.':'Create a gentle fish-feeding activity for two seated residents. Guide three food pieces to a friendly fish using hands only. Food is collected once, fish respond gently, shared progress increases. Two short rounds with new food arrangements, a clear completion and Play Again. Use approved illustrated fish and food, large forgiving targets, slow motion, no score or timer. Reuse generic lifecycle and hand guidance, not a special game template.'
  await page.getByLabel('Your activity idea').fill(prompt)
  await page.getByRole('button',{name:'Create my activity',exact:true}).click()
  await Promise.race([expect(page.locator('.cp-editor')).toBeVisible({timeout:1000000}),failed])
  await expect(page.locator('.cp-experimental-object').first()).toBeVisible()
  expect(game.design).toBeTruthy();expect(game.scene.lifecycle.rounds).toBe(scenario==='sorting'?3:2)
  const entities=game.scene.entities as any[],roles=(e:any)=>Object.fromEntries(e.state.map((p:any)=>[p.key,p.value]))
  const sources=entities.filter(e=>roles(e).role==='source'),targets=entities.filter(e=>roles(e).role==='target')
  const position=async(id:string)=>page.locator(`[data-entity-id="${id}"]`).evaluate(e=>({x:parseFloat((e as HTMLElement).style.left)/100,y:parseFloat((e as HTMLElement).style.top)/100}))
  await page.getByRole('button',{name:'Enable camera',exact:true}).click()
  await page.getByRole('button',{name:'Play',exact:true}).click()
  const progress=page.getByRole('progressbar',{name:'Round progress'})
  const guide=async(source:any,target:any)=>{
    const from=await position(source.id),to=await position(target.id)
    await page.evaluate(async({from,to})=>{
      Reflect.set(window,'controlledHands',[from,{x:.99,y:.02}]);await new Promise(r=>setTimeout(r,650))
      let start=from
      for(const end of [{x:to.x,y:.5},to]){for(let i=1;i<=45;i++){const t=i/45;Reflect.set(window,'controlledHands',[{x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t},{x:.99,y:.02}]);await new Promise(r=>setTimeout(r,60))}start=end}
      await new Promise(r=>setTimeout(r,750));Reflect.set(window,'controlledHands',[])
    },{from,to})
  }
  for(let round=1;round<=game.scene.lifecycle.rounds;round++){
    await expect(page.locator('.cp-lifecycle-hud')).toContainText(`Round ${round} of`)
    for(let i=0;i<sources.length;i++){
      const source=sources[i],target=targets.find(t=>roles(t).category===roles(source).category)
      expect(target).toBeTruthy();await guide(source,target)
      if(i<sources.length-1)await expect(progress).toHaveAttribute('value',String(i+1))
    }
    if(round<game.scene.lifecycle.rounds)await expect(page.locator('.cp-lifecycle-hud')).toContainText(`Round ${round+1} of`,{timeout:8000})
  }
  await expect(page.getByRole('button',{name:'Play Again',exact:true})).toBeVisible({timeout:8000})
  await page.screenshot({path:`artifacts/complete-${scenario}.png`,fullPage:true})
  const before=requests
  await page.getByRole('button',{name:'Play Again',exact:true}).click()
  await expect(progress).toHaveAttribute('value','0');await expect(page.locator('.cp-lifecycle-hud')).toContainText('Round 1 of')
  expect(requests).toBe(before)
  await guide(sources[0],targets.find(t=>roles(t).category===roles(sources[0]).category))
  await expect(progress).toHaveAttribute('value','1')
  await page.getByRole('button',{name:'Restart round',exact:true}).click()
  await expect(progress).toHaveAttribute('value','0')
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible()
  await page.getByLabel('Ask for a change').fill('Mute the sound');await page.getByRole('button',{name:'Send request'}).click()
  await expect(page.getByLabel('Sound volume',{exact:true})).toHaveValue('0')
})
