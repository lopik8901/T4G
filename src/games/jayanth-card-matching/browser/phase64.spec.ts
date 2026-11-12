import {test,expect,type Page} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {entry,syntheticHands,freezeClock,control,pointAt,handAt} from './helpers'
import {categories} from '../categories'
import {gamePaces,type GamePace} from '../session'
const phase=(page:Page,value:string)=>expect(page.locator('[data-phase]')).toHaveAttribute('data-phase',value,{timeout:22000})
async function begin(page:Page,memory=true){
 await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 if(memory){await page.getByRole('button',{name:/^Game Options/}).click();await page.getByRole('button',{name:'2 — Memory Peek',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click()}
 await page.getByRole('button',{name:'Start Game',exact:true}).click();if(memory)await expect(page.locator('[data-answer]').first()).toBeVisible();else await expect(page.locator('[data-reference]')).toBeVisible()
}
async function pace(page:Page,value:GamePace){await control(page,'Game Pace');await page.getByRole('button',{name:new RegExp(`^${value[0].toUpperCase()+value.slice(1)} ·`)}).click();await page.getByRole('button',{name:'Done',exact:true}).click()}
for(const value of Object.keys(gamePaces) as GamePace[])test(`reduced motion: staff ${value} duration, late indicator, pause and full post-reveal inactivity allowance`,async({page})=>{
 await syntheticHands(page);await freezeClock(page);await begin(page);await expect(page.locator('[data-answer]').first()).toHaveCSS('animation-name','none');await pace(page,value)
 await page.clock.runFor(100);await phase(page,'previewing');await expect(page.locator('[data-reference]')).toHaveCount(0)
 await page.clock.runFor(gamePaces[value]-3100);await expect(page.locator('[data-closing-soon]')).toHaveCount(0)
 await control(page,'Staff Controls');await page.clock.runFor(35000);await phase(page,'previewing');await page.getByRole('button',{name:'Resume',exact:true}).click()
 await page.clock.runFor(200);await expect(page.locator('[data-closing-soon]')).toBeVisible();await page.screenshot({path:`artifacts/card-matching/phase64-closing-soon-${value}.png`})
 await page.clock.runFor(2800);await phase(page,'previewing');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.clock.runFor(100);await phase(page,'flipping');await expect(page.locator('[data-reference]')).toHaveCount(0)
 await page.clock.runFor(800);await phase(page,'flipping');await page.clock.runFor(100);await phase(page,'revealingTarget');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.clock.runFor(1400);await phase(page,'revealingTarget');await page.clock.runFor(100);await phase(page,'selecting')
 await page.clock.runFor(24000);await expect(page.getByText(/Returning to Home soon/)).toHaveCount(0);await page.clock.runFor(1500);await expect(page.getByText(/Returning to Home soon/)).toBeVisible()
 await page.clock.runFor(4600);await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible()
})
test('Level 1 hides Replay Pictures and has no preview timing',async({page})=>{
 await syntheticHands(page);await freezeClock(page);await begin(page,false);await page.clock.runFor(2300);await phase(page,'answering');await control(page,'Staff Controls');await expect(page.getByRole('button',{name:'Replay Pictures',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Game Pace',exact:true})).toBeVisible()
})
test('real hand replay preserves persistent pictures, order, question and progress; repeat replay pauses safely and rearms dwell',async({page})=>{
 await syntheticHands(page);await page.emulateMedia({reducedMotion:'no-preference'});await begin(page);await pace(page,'brisk');await phase(page,'selecting')
 const targetLabel=await page.locator('aside span').last().innerText(),id=categories[0].items.find(c=>c.label===targetLabel)!.id,name=await page.locator('[data-reference]').innerText()
 const wrong=page.locator(`[data-answer]:not([data-answer="${id}"])`).first();await wrong.click();await phase(page,'selecting')
 await page.evaluate(()=>{Reflect.set(window,'originalCards',Array.from(document.querySelectorAll('[data-answer]')));Reflect.set(window,'originalImages',Array.from(document.querySelectorAll('[data-answer] img')))})
 const original=await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-answer'),x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})))
 await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('dialog')).toBeVisible();await pointAt(page,page.getByRole('button',{name:'Replay Pictures',exact:true}));await expect(page.getByRole('dialog')).not.toBeVisible();await phase(page,'replaying')
 await expect(page.locator('[data-reference]')).toHaveCount(0);await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await phase(page,'previewing');await page.screenshot({path:'artifacts/card-matching/phase64-replay-open.png'})
 await pointAt(page,page.locator(`[data-answer="${id}"]`))
 await control(page,'Staff Controls');await page.waitForTimeout(1200);await phase(page,'previewing');await page.getByRole('button',{name:'Resume',exact:true}).click()
 // Restore the known slot after dialog mapping; it must not consume its preview hover.
 await pointAt(page,page.locator(`[data-answer="${id}"]`));await phase(page,'selecting');await page.waitForTimeout(1400)
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0');expect(await page.locator('[data-reference]').innerText()).toBe(name)
 expect(await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-answer'),x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})))).toEqual(original)
 expect(await page.evaluate(()=>Reflect.get(window,'originalCards').every((n:Element,i:number)=>n===document.querySelectorAll('[data-answer]')[i])&&Reflect.get(window,'originalImages').every((n:Element,i:number)=>n===document.querySelectorAll('[data-answer] img')[i]))).toBe(true)
 await expect(wrong).toBeDisabled()
 await control(page,'Replay Pictures');await phase(page,'replaying');await page.waitForTimeout(300);await control(page,'Staff Controls');await page.waitForTimeout(1200);await phase(page,'replaying');await page.getByRole('button',{name:'Resume',exact:true}).click();await phase(page,'selecting')
 expect(await page.locator('[data-reference]').innerText()).toBe(name);await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
 await page.evaluate(()=>Reflect.set(window,'testHand',{x:.5,y:.48}));await page.waitForTimeout(300);await pointAt(page,page.locator(`[data-answer="${id}"]`));await page.waitForTimeout(400);await phase(page,'selecting');await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1',{timeout:3000})
})
test('record complete real paced flow: stable faces, exact motion, neutral privacy and calm close-soon cue',async({page})=>{
 await syntheticHands(page);await page.emulateMedia({reducedMotion:'no-preference'})
 await page.addInitScript(()=>{
  Reflect.set(window,'motionEvidence',[]);Reflect.set(window,'animationEvidence',[])
  document.addEventListener('animationend',(e:AnimationEvent)=>{if((e.target as HTMLElement).matches('[data-answer],[data-card-rotor]'))Reflect.get(window,'animationEvidence').push({elapsed:e.elapsedTime,phase:document.querySelector('[data-phase]')?.getAttribute('data-phase'),target:(e.target as HTMLElement).hasAttribute('data-answer')?'descent':'flip'})})
  new MutationObserver(()=>{const phase=document.querySelector('[data-phase]')?.getAttribute('data-phase');if(!phase||phase===Reflect.get(window,'lastEvidencePhase'))return;Reflect.set(window,'lastEvidencePhase',phase);Reflect.get(window,'motionEvidence').push({phase,at:performance.now(),target:!!document.querySelector('[data-reference]')})}).observe(document,{subtree:true,attributes:true,childList:true,attributeFilter:['data-phase']})
 })
 await begin(page);await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/card-matching/phase64-descent.png'})
 await phase(page,'previewing');await page.evaluate(()=>Reflect.set(window,'stableImages',Array.from(document.querySelectorAll('[data-answer] img'))));await page.screenshot({path:'artifacts/card-matching/phase64-preview.png'})
 await expect(page.locator('[data-closing-soon]')).toBeVisible({timeout:9000});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/card-matching/phase64-closing-soon.png'})
 await phase(page,'flipping');await page.waitForTimeout(350);await page.screenshot({path:'artifacts/card-matching/phase64-flipping.png'});await expect(page.locator('[data-reference]')).toHaveCount(0)
 await phase(page,'revealingTarget');await page.waitForTimeout(250);await page.screenshot({path:'artifacts/card-matching/phase64-target.png'});await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await phase(page,'selecting');await page.screenshot({path:'artifacts/card-matching/phase64-selection.png'})
 expect(await page.evaluate(()=>Reflect.get(window,'stableImages').every((n:Element,i:number)=>n===document.querySelectorAll('[data-answer] img')[i]))).toBe(true)
 const evidence=await page.evaluate(()=>({phases:Reflect.get(window,'motionEvidence'),animations:Reflect.get(window,'animationEvidence')}))
 const preview=evidence.phases.find((p:{phase:string})=>p.phase==='previewing'),flip=evidence.phases.find((p:{phase:string})=>p.phase==='flipping');expect(flip.at-preview.at).toBeGreaterThanOrEqual(10000);expect(flip.at-preview.at).toBeLessThan(10350)
 const lands=evidence.animations.filter((a:{target:string})=>a.target==='descent'),flips=evidence.animations.filter((a:{target:string})=>a.target==='flip');expect(lands).toHaveLength(4);expect(flips).toHaveLength(4);for(const a of lands)expect(a.elapsed).toBeCloseTo(1.5,2);for(const a of flips)expect(a.elapsed).toBeCloseTo(.9,2)
 await writeFile('artifacts/card-matching/phase64-motion.json',JSON.stringify(evidence,null,2))
})

test('stationary physical palm cannot activate a dialog control just because menu mapping changed',async({page})=>{
 await syntheticHands(page);await begin(page);await phase(page,'previewing')
 await control(page,'Staff Controls');const target=await handAt(page,page.getByRole('button',{name:'Select Hand / Diagnostics',exact:true}));await page.getByRole('button',{name:'Resume',exact:true}).click()
 await page.evaluate(target=>Reflect.set(window,'testHand',target),target);await page.waitForTimeout(500);await expect(page.getByRole('img',{name:'Hand pointer',exact:true})).toBeVisible()
 await control(page,'Staff Controls');await page.waitForTimeout(1600)
 await expect(page.getByRole('heading',{name:'Staff Controls',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Choose the controlling hand',exact:true})).toHaveCount(0)
 await pointAt(page,page.getByRole('button',{name:'Resume',exact:true}));await expect(page.getByRole('dialog')).not.toBeVisible({timeout:4000})
})
