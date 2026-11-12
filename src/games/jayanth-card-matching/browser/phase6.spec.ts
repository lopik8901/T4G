import {test,expect} from '@playwright/test'
import {entry,syntheticHands,denyCamera,freezeClock,ready,correctButton,control,pointAt,handAt} from './helpers'
async function noOverlap(page:import('@playwright/test').Page){
 const errors=await page.locator('[data-layout="instruction"], [data-answer], [data-reference], [data-journey], [data-layout="feedback"]').evaluateAll(nodes=>{
 const shown=nodes.filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'),errors=[]
 for(let i=0;i<shown.length;i++){const a=shown[i].getBoundingClientRect();if(a.left<0||a.top<0||a.right>innerWidth+1||a.bottom>innerHeight+1)errors.push('outside '+shown[i].outerHTML.slice(0,80));for(let j=i+1;j<shown.length;j++){const b=shown[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)errors.push('overlap '+i+','+j)}}return errors
 });expect(errors).toEqual([])
}
for(const [width,height] of [[2048,700],[1920,1080],[1366,768],[1280,720],[1280,620]])test(`Phase 6.2 immersive layout and staff overlay ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await syntheticHands(page);await freezeClock(page);await page.goto(entry)
 await expect(page.locator('video')).toHaveJSProperty('videoWidth',640)
 await page.screenshot({path:`artifacts/card-matching/phase62-home-${width}-${height}.png`})
 const start=await page.getByRole('button',{name:'Start Game',exact:true}).boundingBox();expect(start!.y+start!.height).toBeLessThan(height);const footer=(await page.locator('footer').boundingBox())!;expect(start!.y+start!.height).toBeLessThanOrEqual(footer.y)
 await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
 await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300);await ready(page);await noOverlap(page)
 const outside=await page.locator('main button:visible').allTextContents();expect(outside).toHaveLength(6);expect(outside).toContain('Staff Controls');expect(await page.locator('main button:visible:not([data-answer])').allTextContents()).toEqual(['Recenter Hand','Staff Controls'])
 const video=(await page.locator('video').boundingBox())!;expect(Math.abs(video.x+video.width/2-width/2)).toBeLessThan(2);expect(video.width).toBeGreaterThan(width*.9);expect(video.height).toBeGreaterThan(height*.7);await expect(page.locator('video')).toHaveCSS('object-fit','cover');await expect(page.locator('video')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)')
 expect(video.width).toBe(width);expect(video.height).toBe(height)
 await page.screenshot({path:`artifacts/card-matching/phase62-level1-${width}-${height}.png`})
 const before=await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundImage)
 await (await correctButton(page)).click();await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1');await noOverlap(page)
 await page.screenshot({path:`artifacts/card-matching/phase62-success-${width}-${height}.png`})
 expect(await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundImage)).not.toBe(before)
 await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible()
 await page.clock.fastForward(35000);await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:`artifacts/card-matching/phase62-staff-${width}-${height}.png`})
 await page.getByRole('button',{name:'Return Home',exact:true}).click();await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible()
 expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).active)).toBe(true)
})
test('Memory Peek hides accessible answers after three seconds and staff reveals again',async({page})=>{
 await syntheticHands(page);await freezeClock(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 await page.getByRole('button',{name:/^Game Options/}).click();await page.getByRole('button',{name:'2 — Memory Peek',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
 await expect(page.locator('aside')).toHaveCount(0);await page.clock.runFor(2300);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','previewing')
 await page.clock.runFor(10400);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting');await expect(page.getByRole('button',{name:'Choose card 1',exact:true})).toBeVisible()
 await page.screenshot({path:'artifacts/card-matching/phase62-memory.png'})
 for(const [width,height] of [[1920,1080],[1280,720]]){await page.setViewportSize({width,height});await noOverlap(page);await page.screenshot({path:`artifacts/card-matching/phase62-memory-${width}.png`})}
 const target=await page.locator('aside .unused').count();expect(target).toBe(0)
 await control(page,'Replay Pictures');await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','replaying');await expect(page.getByRole('button',{name:'Choose card 1',exact:true})).toHaveCount(0)
})
test('two visible hands: moving hand selects, steady dwell persists, staff reselects',async({page})=>{
 await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 await page.evaluate(()=>Reflect.set(window,'testHands',[{x:.25,y:.5},{x:.7,y:.5}]))
 await page.waitForTimeout(200);await page.evaluate(()=>Reflect.set(window,'testHands',[{x:.25,y:.5},{x:.75,y:.5}]))
 await page.waitForTimeout(250);await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
 await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await page.getByRole('button',{name:'Select Hand / Diagnostics',exact:true}).click()
 await expect(page.getByRole('region',{name:'Tracking diagnostics'})).toContainText('2 detected hands');await expect(page.getByRole('region',{name:'Tracking diagnostics'})).not.toContainText('Active: none')
 await page.getByRole('button',{name:'Reselect active hand',exact:true}).click();await expect(page.getByRole('region',{name:'Tracking diagnostics'})).toContainText('Active: none')
})
test('staff overlay can be opened and resumed by dwell without answer pass-through',async({page})=>{
 await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
 await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('dialog')).toBeVisible();await pointAt(page,page.getByRole('button',{name:'Resume',exact:true}));await expect(page.getByRole('dialog')).not.toBeVisible({timeout:5000});await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
})
test('moving second hand answers after steady dwell; occlusion cancels without transferring to stationary hand',async({page})=>{
 await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
 const target=await handAt(page,await correctButton(page))
 const phone={x:.1,y:.9},origin={x:.55,y:.55}
 async function move(){for(let i=0;i<=6;i++){await page.evaluate(({phone,origin,target,i})=>Reflect.set(window,'testHands',[phone,{x:origin.x+(target.x-origin.x)*i/6,y:origin.y+(target.y-origin.y)*i/6}]),{phone,origin,target,i});await page.waitForTimeout(100)}}
 await move();await page.waitForTimeout(200);await page.evaluate(phone=>Reflect.set(window,'testHands',[phone]),phone);await page.waitForTimeout(1300)
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0');await expect(page.getByRole('img',{name:'Hand pointer'})).not.toBeVisible()
 await move();await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1',{timeout:5000})
})
test('1920x1080 fullscreen centred scene remains readable and unclipped',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await syntheticHands(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
 await control(page,'Fullscreen');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.getByRole('button',{name:'Resume',exact:true}).click();await noOverlap(page);await page.screenshot({path:'artifacts/card-matching/phase62-fullscreen-1920.png'});await page.evaluate(()=>document.exitFullscreen())
})
test('4:3 seated calibration stays centred from Home into centred gameplay',async({page})=>{
 await syntheticHands(page);await page.goto(entry);await page.evaluate(()=>Reflect.set(window,'testHand',{x:.55,y:.6}));await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.locator('[data-dwell="calibrate"]').click()
 await expect(page.getByText('Pointer centred. The camera marker shows your actual mirrored palm.')).toBeVisible({timeout:7000})
 const offset=()=>page.getByRole('img',{name:'Hand pointer'}).evaluate(el=>{const r=el.getBoundingClientRect();return Math.hypot(r.x+r.width/2-innerWidth/2,r.y+r.height/2-innerHeight/2)})
 await expect.poll(offset).toBeLessThan(4);await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page);await expect.poll(offset).toBeLessThan(4)
})
test('camera selection replaces one stream safely',async({page})=>{
 await syntheticHands(page);await page.addInitScript(()=>{navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'usb',label:'Test USB camera',groupId:'',toJSON(){return{}}}] as MediaDeviceInfo[]})
 await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 await page.getByRole('button',{name:'Start Game',exact:true}).click()
 await ready(page);const before=await page.evaluate(()=>Reflect.get(window,'cameraRequests'))
 await control(page,'Camera Settings');await page.getByRole('button',{name:'Test USB camera',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'cameraRequests'))).toBe(before+1)
 expect(await page.evaluate(()=>Reflect.get(window,'stoppedTracks'))).toBeGreaterThan(0)
 await expect(page.getByRole('dialog')).not.toBeVisible()
})
