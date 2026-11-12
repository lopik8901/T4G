import{test,expect,type Page}from'@playwright/test'
import{writeFile}from'node:fs/promises'
import{entry,syntheticHands,ready,correctButton,control,pointAt}from'./helpers'
async function begin(page:Page){await syntheticHands(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()}
test('real Chrome descent starts above viewport, visibly travels, lands stably and retriggers each round',async({page})=>{
 await page.addInitScript(()=>{
  Reflect.set(window,'flightFrames',[]);Reflect.set(window,'flightEnds',[])
  document.addEventListener('animationend',(e:AnimationEvent)=>{if((e.target as HTMLElement).matches('[data-answer]'))Reflect.get(window,'flightEnds').push({elapsed:e.elapsedTime,at:performance.now()})})
  new MutationObserver(()=>{if(document.querySelector('[data-phase]')?.getAttribute('data-phase')!=='falling'||Reflect.get(window,'watchingFlight'))return;Reflect.set(window,'watchingFlight',true);const start=performance.now();const sample=()=>{const instruction=document.querySelector('[data-layout="instruction"]')!.getBoundingClientRect();const readable=!!document.elementFromPoint(instruction.x+instruction.width/2,instruction.y+instruction.height/2)?.closest('[data-layout="instruction"]');Reflect.get(window,'flightFrames').push({instructionVisible:readable,at:performance.now()-start,rects:Array.from(document.querySelectorAll('[data-answer]')).map(n=>{const r=n.getBoundingClientRect();return {y:r.y,bottom:r.bottom,height:r.height}})});if(document.querySelector('[data-phase]')?.getAttribute('data-phase')==='falling')requestAnimationFrame(sample);else Reflect.set(window,'watchingFlight',false)};sample()}).observe(document,{attributes:true,subtree:true,attributeFilter:['data-phase']})
 })
 await begin(page);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','falling',{timeout:12000})
 expect(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>({duration:getComputedStyle(n).animationDuration,delay:getComputedStyle(n).animationDelay})))).toEqual(['0s','0.4s','0.8s','1.2s'].map(delay=>({duration:'1.5s',delay})))
 await page.screenshot({path:'artifacts/card-matching/phase62-descent-early.png'})
 await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.locator('[data-answer]').first().evaluate((el:HTMLButtonElement)=>{el.click();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}))})
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
 await page.waitForTimeout(500);await page.screenshot({path:'artifacts/card-matching/phase62-descent-middle.png'});await ready(page)
 const frames=await page.evaluate(()=>Reflect.get(window,'flightFrames')),ends=await page.evaluate(()=>Reflect.get(window,'flightEnds'))
 expect(frames.every((f:{instructionVisible:boolean})=>f.instructionVisible)).toBe(true)
 expect(frames[0].rects.every((r:{bottom:number})=>r.bottom<0)).toBe(true)
 const middle=frames.find((f:{at:number})=>f.at>300);expect(middle.rects[0].y).toBeGreaterThan(frames[0].rects[0].y+100)
 expect(ends).toHaveLength(4);for(const end of ends)expect(end.elapsed).toBeCloseTo(1.5,1)
 const before=await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));await page.waitForTimeout(300);expect(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y))).toEqual(before)
 await page.screenshot({path:'artifacts/card-matching/phase62-descent-landed.png'});await writeFile('artifacts/card-matching/phase62-descent-frames.json',JSON.stringify({frames,ends},null,2))
 const correct=await correctButton(page),oldId=await correct.getAttribute('data-answer'),oldSlot=await correct.evaluate(el=>Array.from(el.parentElement!.children).indexOf(el))
 const previousFrameCount=await page.evaluate(()=>Reflect.get(window,'flightFrames').length)
 await control(page,'Skip Round');await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','falling',{timeout:12000});await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'flightFrames').length)).toBeGreaterThan(previousFrameCount);expect(await page.evaluate(index=>Reflect.get(window,'flightFrames')[index].rects.every((r:{bottom:number})=>r.bottom<0),previousFrameCount)).toBe(true);await ready(page)
 const next=await correctButton(page);expect(await next.getAttribute('data-answer')).not.toBe(oldId);expect(await next.evaluate(el=>Array.from(el.parentElement!.children).indexOf(el))).not.toBe(oldSlot)
})
test('a paused final card keeps every answer disabled even after the descent clock elapsed',async({page})=>{
 await begin(page);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','falling',{timeout:12000})
 await page.locator('[data-answer]').last().evaluate(el=>el.getAnimations().forEach(a=>a.pause()))
 await page.waitForTimeout(3500);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','falling');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.locator('[data-answer]').last().evaluate(el=>el.getAnimations().forEach(a=>a.play()));await ready(page)
})
test('staff framing changes actual cover crop and the aligned cursor follows the same pixels',async({page})=>{
 await page.setViewportSize({width:2048,height:700});await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
 await control(page,'Camera Settings');await page.getByRole('button',{name:'Lower',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click()
 await expect(page.locator('video')).toHaveCSS('object-position','50% 75%')
 // Use a visible sensor point in this heavily cropped ultrawide frame.
 await page.evaluate(()=>Reflect.set(window,'testHand',{x:.48,y:.7}))
 const expected=await page.evaluate(()=>{const v=document.querySelector('video')!,r=v.getBoundingClientRect(),scale=Math.max(r.width/v.videoWidth,r.height/v.videoHeight);return{x:r.width*(1-.48),y:.7*v.videoHeight*scale+(r.height-v.videoHeight*scale)*.75}})
 await expect.poll(()=>page.getByRole('img',{name:'Hand pointer'}).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}).then(p=>Math.hypot(p.x-expected.x,p.y-expected.y))).toBeLessThan(3)
 const requests=await page.evaluate(()=>Reflect.get(window,'cameraRequests'));await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>Reflect.get(window,'cameraRequests'))).toBe(requests)
})
for(const [width,height] of [[2048,700],[1280,620]])test(`camera framing controls and Done fit without hand-inaccessible scrolling at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await syntheticHands(page);await page.addInitScript(()=>{navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'usb',label:'USB webcam',groupId:'',toJSON(){return{}}}] as MediaDeviceInfo[]})
 await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page);await control(page,'Camera Settings')
 const errors=await page.locator('dialog[open]').evaluate(dialog=>{const r=dialog.getBoundingClientRect();return Array.from(dialog.querySelectorAll('button')).filter(b=>{const x=b.getBoundingClientRect();return x.top<r.top||x.bottom>r.bottom||x.left<r.left||x.right>r.right}).map(b=>b.textContent)})
 expect(errors).toEqual([]);expect(await page.getByRole('dialog').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true)
 await page.screenshot({path:`artifacts/card-matching/phase62-framing-${width}-${height}.png`});await pointAt(page,page.getByRole('button',{name:'Done',exact:true}));await expect(page.getByRole('dialog')).not.toBeVisible({timeout:5000})
})
