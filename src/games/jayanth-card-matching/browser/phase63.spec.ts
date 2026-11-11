import {test,expect,type Page} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {categories} from '../categories'
import {entry,syntheticHands,control} from './helpers'
async function setup(page:Page,audio=false){
 await syntheticHands(page)
 await page.addInitScript(()=>{
  const spoken:{text:string;phase:string|null}[]=[];Reflect.set(window,'spoken',spoken)
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(text:string){this.text=text}}})
  const voice={name:'Local English',lang:'en-SG',voiceURI:'local',localService:true,default:true}
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[voice],cancel(){},resume(){},speak(u:SpeechSynthesisUtterance){spoken.push({text:u.text,phase:document.querySelector('[data-phase]')?.getAttribute('data-phase')??null});u.onend?.({} as SpeechSynthesisEvent)},addEventListener(){},removeEventListener(){}}})
  Reflect.set(window,'promptFrames',[])
  new MutationObserver(()=>{
   if(document.querySelector('[data-phase]')?.getAttribute('data-phase')!=='revealingTarget'||Reflect.get(window,'watchPrompt'))return
   Reflect.set(window,'watchPrompt',true)
   const sample=()=>{
    const a=document.querySelector('[data-reference]')!.getBoundingClientRect(),b=document.querySelector('[data-layout="instruction"]')!.getBoundingClientRect()
    Reflect.get(window,'promptFrames').push({at:performance.now(),x:a.x,y:a.y,overlap:Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1})
    if(document.querySelector('[data-phase]')?.getAttribute('data-phase')==='revealingTarget')requestAnimationFrame(sample);else Reflect.set(window,'watchPrompt',false)
   };sample()
  }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-phase']})
  const frames:unknown[]=[];Reflect.set(window,'memoryFrames',frames)
  new MutationObserver(()=>{const phase=document.querySelector('[data-phase]')?.getAttribute('data-phase');if(!phase||phase===Reflect.get(window,'lastPhase'))return;Reflect.set(window,'lastPhase',phase);frames.push({phase,at:performance.now(),target:!!document.querySelector('[data-reference]'),answers:Array.from(document.querySelectorAll('[data-answer]')).map(n=>({label:n.getAttribute('aria-label'),disabled:(n as HTMLButtonElement).disabled,y:n.getBoundingClientRect().y}))})}).observe(document,{subtree:true,attributes:true,childList:true})
 })
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(entry)
 if(!audio)await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 await page.getByRole('button',{name:/^Game Options/}).click();await page.getByRole('button',{name:'2 — Memory Peek',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click()
 await page.getByRole('button',{name:'Start Game',exact:true}).click()
}
async function phase(page:Page,name:string){await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase',name,{timeout:20000})}
async function locked(page:Page){
 await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.locator('[data-answer]').first().evaluate((b:HTMLButtonElement)=>{b.click();b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));b.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true}))})
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
}
async function geometry(page:Page){
 expect(await page.locator('[data-reference]:visible,[data-layout="instruction"],[data-answer],[data-journey],.unused').evaluateAll(nodes=>{
 const rects=nodes.map(n=>n.getBoundingClientRect());return rects.flatMap((a,i)=>{const errors=[];if(a.x<0||a.y<0||a.right>innerWidth+1||a.bottom>innerHeight+1)errors.push('outside '+i);for(let j=i+1;j<rects.length;j++){const b=rects[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)errors.push('overlap '+i+','+j)}return errors})
 })).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
}
for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[2048,700],[1280,620]])test(`Look Remember Match complete real animation flow and layout ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await setup(page,true)
 await phase(page,'falling');await locked(page);await expect(page.locator('[data-reference]')).toHaveCount(0)
 await expect(page.locator('[data-answer]').first()).toBeVisible();await page.waitForTimeout(450)
 await page.screenshot({path:`artifacts/card-matching/phase63-arriving-${width}-${height}.png`})
 await phase(page,'previewing');await locked(page);await geometry(page)
 await expect(page.locator('[data-answer] img')).toHaveCount(4)
 expect(await page.locator('[data-layout="instruction"]').innerText()).toBe('Look carefully at the pictures!')
 const ids=await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-answer')))
 await page.screenshot({path:`artifacts/card-matching/phase63-preview-${width}-${height}.png`})
 await phase(page,'flipping');await locked(page);await expect(page.locator('[data-reference]')).toHaveCount(0)
 expect(await page.evaluate(()=>Reflect.get(window,'spoken').some((s:{text:string})=>s.text.startsWith('Find ')))).toBe(false)
 await phase(page,'revealingTarget');await locked(page);await expect(page.locator('[data-reference]')).toBeVisible()
 await page.screenshot({path:`artifacts/card-matching/phase63-target-${width}-${height}.png`})
 await phase(page,'selecting');await geometry(page)
 const promptFrames=await page.evaluate(()=>Reflect.get(window,'promptFrames'));expect(promptFrames.length).toBeGreaterThan(10);expect(promptFrames.filter((f:{overlap:boolean})=>f.overlap)).toEqual([])
 expect(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-answer')))).toEqual(ids)
 await expect(page.locator('[data-card-front][aria-hidden="true"]')).toHaveCount(4)
 const speeches=await page.evaluate(()=>Reflect.get(window,'spoken'));expect(speeches.some((s:{text:string;phase:string})=>s.text.startsWith('Find ')&&s.phase==='revealingTarget')).toBe(true)
 await page.screenshot({path:`artifacts/card-matching/phase63-selection-${width}-${height}.png`})
 await page.getByLabel('Answer cards',{exact:true}).screenshot({path:`artifacts/card-matching/phase63-closed-${width}-${height}.png`})
 const name=await page.locator('aside span').last().innerText(),id=categories[0].items.find(c=>c.label===name)!.id
 const wrong=page.locator(`[data-answer]:not([data-answer="${id}"])`).first();await wrong.click();await phase(page,'feedback');await expect(wrong).toBeDisabled();await expect(page.locator('[data-card-front][aria-hidden="false"]')).toHaveCount(1)
 await phase(page,'selecting');await page.locator(`[data-answer="${id}"]`).focus();await page.keyboard.press('Enter');await phase(page,'success')
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1');await geometry(page)
 await page.screenshot({path:`artifacts/card-matching/phase63-success-${width}-${height}.png`})
 await control(page,'Fullscreen');await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.getByRole('button',{name:'Resume',exact:true}).click()
 await page.screenshot({path:`artifacts/card-matching/phase63-fullscreen-${width}-${height}.png`})
 await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await page.screenshot({path:`artifacts/card-matching/phase63-staff-${width}-${height}.png`})
 await writeFile(`artifacts/card-matching/phase63-flow-${width}-${height}.json`,JSON.stringify(await page.evaluate(()=>({frames:Reflect.get(window,'memoryFrames'),spoken:Reflect.get(window,'spoken'),promptFrames:Reflect.get(window,'promptFrames')})),null,2))
})
for(const stoppedPhase of ['falling','previewing','flipping','revealingTarget','selecting'])test(`Pause Resume and Home preserve safety during ${stoppedPhase}`,async({page})=>{
 await setup(page);await phase(page,stoppedPhase);await page.getByRole('button',{name:'Staff Controls',exact:true}).click()
 await page.waitForTimeout(1400);await phase(page,stoppedPhase);await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.getByRole('button',{name:'Resume',exact:true}).click()
 await phase(page,'selecting');await control(page,'Return Home');await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible()
 expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>(v.srcObject as MediaStream).active)).toBe(true)
})
test('Restart invalidates target callbacks; End Session stops camera during target reveal',async({page})=>{
 await setup(page);await phase(page,'revealingTarget');await control(page,'Restart');await page.getByRole('dialog').getByRole('button',{name:'Restart',exact:true}).click()
 await phase(page,'falling');await locked(page);await expect(page.locator('[data-reference]')).toHaveCount(0)
 await phase(page,'revealingTarget');await control(page,'End Session');await page.getByRole('dialog').getByRole('button',{name:'End Session',exact:true}).click()
 await expect(page.getByText(/Session ended. The camera/)).toBeVisible();expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>v.srcObject)).toBeNull()
 await expect(page.getByRole('img',{name:'Hand pointer'})).not.toBeVisible()
})

test('a stalled actual target animation cannot be bypassed by elapsed time or inputs',async({page})=>{
 await setup(page);await phase(page,'revealingTarget')
 await page.locator('[data-reference]').evaluate(el=>el.getAnimations().forEach(a=>a.pause()))
 await page.waitForTimeout(1400);await phase(page,'revealingTarget');await locked(page)
 await page.locator('[data-reference]').evaluate(el=>el.getAnimations().forEach(a=>a.play()))
 await phase(page,'selecting');await expect(page.locator('[data-answer]:enabled')).toHaveCount(4)
})
