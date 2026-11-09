import {expect,test,type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {control,entry,syntheticHands,pointAt,ready,correctButton,freezeClock} from './helpers'
async function assertLayout(page:Page,selector:string){
  const problems=await page.locator(selector).evaluateAll(elements=>{
    const shown=elements.filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden')
    const result:string[]=[]
    for(let i=0;i<shown.length;i++){
      const a=shown[i].getBoundingClientRect(),name=shown[i].getAttribute('data-layout')??shown[i].getAttribute('aria-label')??shown[i].tagName
      if(a.left<-.5||a.top<-.5||a.right>innerWidth+.5||a.bottom>innerHeight+.5)result.push(`Outside viewport: ${name}`)
      if(shown[i].scrollWidth>shown[i].clientWidth+2)result.push(`Horizontal text overflow: ${name}`)
      for(let j=i+1;j<shown.length;j++){
        if(shown[i].contains(shown[j])||shown[j].contains(shown[i]))continue
        const b=shown[j].getBoundingClientRect()
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)result.push(`Overlap: ${name} / ${shown[j].getAttribute('data-layout')??shown[j].getAttribute('aria-label')??shown[j].tagName}`)
      }
    }
    return result
  })
  expect(problems).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
}
const gameRegions='[data-layout="instruction"], [data-answer], [data-reference], [data-layout="feedback"], [data-journey], [data-layout="controls"], [data-layout="footer"]'
for(const [width,height] of [[1920,1080],[1366,768],[1280,720]])test(`TV audit all major states at ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});await syntheticHands(page);await freezeClock(page);await page.goto(entry)
  await expect(page.locator('video')).toHaveJSProperty('videoWidth',640)
  await assertLayout(page,'header, .unused, [data-camera-preview], main fieldset, [data-dwell="start"], [data-dwell="calibrate"], [data-layout="footer"]')
  await page.screenshot({path:`artifacts/card-matching/phase5-home-${width}.png`})
  await page.getByRole('button',{name:'Staff settings',exact:true}).click()
  await assertLayout(page,'dialog[open] [data-dwell]')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({path:`artifacts/card-matching/phase5-settings-${width}.png`})
  await page.getByRole('button',{name:'Done',exact:true}).click()
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:'5 rounds',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.locator('aside')).toBeVisible();await assertLayout(page,gameRegions)
  await page.screenshot({path:`artifacts/card-matching/phase5-reveal-${width}.png`})
  await page.clock.runFor(2300);await ready(page);await assertLayout(page,gameRegions)
  await expect(page.locator('video')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)')
  await expect(page.locator('video')).toHaveCSS('object-fit','cover')
  const video=(await page.locator('[data-camera-dock]').boundingBox())!,camera=(await page.locator('[data-game-camera]').boundingBox())!;expect(Math.abs(video.width-camera.width)).toBeLessThan(2)
  await page.screenshot({path:`artifacts/card-matching/phase5-game-${width}.png`})
  const correct=await correctButton(page),id=await correct.getAttribute('data-answer')
  await page.locator(`[data-answer]:not([data-answer="${id}"])`).first().click();await assertLayout(page,gameRegions)
  await page.screenshot({path:`artifacts/card-matching/phase5-wrong-${width}.png`})
  await correct.click();await assertLayout(page,gameRegions)
  await page.screenshot({path:`artifacts/card-matching/phase5-unlock-${width}.png`})
  await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await assertLayout(page,'dialog[open] [data-dwell]')
  await page.screenshot({path:`artifacts/card-matching/phase6-overlay-${width}.png`})
  await page.getByRole('button',{name:'Resume',exact:true}).click()
  for(let i=0;i<5;i++)await control(page,'Skip Round')
  await expect(page.getByRole('heading',{name:'Thank you for playing!',exact:true})).toBeVisible()
  await assertLayout(page,'header, .unused, [data-dwell="home"], [data-dwell="restart"], [data-dwell="exit"], [data-layout="footer"]')
  await page.screenshot({path:`artifacts/card-matching/phase5-complete-${width}.png`})
})

test('Home/Exit preserve one live stream; a second game is hand-started; End Session cleans up',async({page})=>{
  await syntheticHands(page);await page.goto(entry)
  await expect(page.locator('video')).toHaveJSProperty('videoWidth',640)
  const before=await page.evaluate(()=>({requests:Reflect.get(window,'cameraRequests'),stops:Reflect.get(window,'stoppedTracks')??0}))
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await pointAt(page,page.getByRole('button',{name:'Start Game',exact:true}));await ready(page)
  await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Return Home',exact:true}));
  await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible({timeout:5000})
  expect(await page.evaluate(()=>Reflect.get(window,'cameraRequests'))).toBe(before.requests)
  expect(await page.evaluate(()=>Reflect.get(window,'stoppedTracks')??0)).toBe(before.stops)
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).getVideoTracks()[0].readyState)).toBe('live')
  const fruits=page.getByRole('button',{name:'Fruits',exact:true});await pointAt(page,fruits);await expect(fruits).toHaveAttribute('aria-pressed','true',{timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Start Game',exact:true}));await ready(page)
  await pointAt(page,page.getByRole('button',{name:'End Session',exact:true}));await expect(page.getByRole('heading',{name:'End this camera session?',exact:true})).toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('dialog').getByRole('button',{name:'End Session',exact:true}))
  await expect(page.getByText('Session ended. The camera, hand tracking and audio are stopped. You can close this tab.')).toBeVisible({timeout:5000})
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>v.srcObject)).toBe(null)
  await expect(page.getByRole('img',{name:'Hand pointer'})).not.toBeVisible()
  expect(await page.evaluate(()=>Reflect.get(window,'stoppedTracks'))).toBeGreaterThan(before.stops)
})

test('palm cursor matches live mirrored pixels, including 4:3 crop and resize',async({page})=>{
  await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720]]){
    await page.setViewportSize({width,height})
    await expect.poll(()=>page.locator('video').boundingBox().then(box=>box?Math.abs(box.width-width):9999)).toBeLessThan(2)
    const expected=await page.evaluate(()=>{
      const point={x:.3,y:.4};Reflect.set(window,'testHand',point)
      const video=document.querySelector('video')!,rect=video.getBoundingClientRect(),scale=Math.max(rect.width/video.videoWidth,rect.height/video.videoHeight)
      const main=document.querySelector('main')!,px=Number(main.getAttribute('data-frame-x')),py=Number(main.getAttribute('data-frame-y'));return {x:rect.left+(1-point.x)*video.videoWidth*scale+(rect.width-video.videoWidth*scale)*(1-px),y:rect.top+point.y*video.videoHeight*scale+(rect.height-video.videoHeight*scale)*py}
    })
    await expect.poll(()=>page.locator('[data-palm]').evaluate(element=>{const r=element.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}).then(p=>Math.hypot(p.x-expected.x,p.y-expected.y))).toBeLessThan(3)
  }
})

test('inactivity returns Home without stopping hands or detaching the video',async({page})=>{
  await syntheticHands(page);await freezeClock(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300);await ready(page)
  await page.clock.runFor(31000)
  await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible()
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).active)).toBe(true)
})

test('visible camera gameplay remains accessible',async({page})=>{
  await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
})


test('fullscreen preserves the TV layout and mirror bounds',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await syntheticHands(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
  await control(page,'Fullscreen')
  await page.getByRole('button',{name:'Resume',exact:true}).click()
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true)
  await assertLayout(page,gameRegions)
  await page.screenshot({path:'artifacts/card-matching/phase5-fullscreen.png'})
  await page.evaluate(()=>document.exitFullscreen())
})

for(const [width,height] of [[1920,1080],[1366,768],[1280,720]])test(`inactivity warning and unavailable-voice settings do not overlap at ${width}`,async({page})=>{
  await page.setViewportSize({width,height});await syntheticHands(page);await freezeClock(page);await page.goto(entry)
  await page.evaluate(()=>{speechSynthesis.getVoices=()=>[];speechSynthesis.dispatchEvent(new Event('voiceschanged'))})

  await page.getByRole('button',{name:'Staff settings',exact:true}).click();await assertLayout(page,'dialog[open] [data-dwell]')
  await page.getByRole('button',{name:'Done',exact:true}).click()
  await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300);await ready(page)
  await page.clock.runFor(26000)
  await expect(page.getByText(/Returning to Home soon/)).toBeVisible()
  await assertLayout(page,gameRegions)
})

test('completion to Home repositions the same video in the preview window',async({page})=>{
  await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:'5 rounds',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  for(let i=0;i<5;i++)await control(page,'Skip Round')
  await page.getByRole('button',{name:'Return to Home',exact:true}).click()
  const rect=(await page.locator('[data-camera-preview]').boundingBox())!
  await expect.poll(()=>page.locator('video').boundingBox().then(box=>box?Math.abs(box.x-rect.x)+Math.abs(box.y-rect.y)+Math.abs(box.width-rect.width)+Math.abs(box.height-rect.height):9999)).toBeLessThan(4)
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).active)).toBe(true)
})
