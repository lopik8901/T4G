import{test,expect,type Page}from'@playwright/test'
import{categories}from'../categories'
import{entry,syntheticHands,pointAt,control}from'./helpers'
async function begin(page:Page,shortDwell=false){
 await syntheticHands(page);await page.addInitScript(()=>{new MutationObserver(()=>{const phase=document.querySelector('[data-phase]')?.getAttribute('data-phase');if(phase===Reflect.get(window,'observedPhase'))return;Reflect.set(window,'observedPhase',phase);if(phase==='selecting')Reflect.set(window,'selectingAt',performance.now());if(phase==='success')Reflect.set(window,'dwellElapsed',performance.now()-Reflect.get(window,'selectingAt'))}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-phase']})});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
 if(shortDwell){await page.getByRole('button',{name:'Staff settings',exact:true}).click();await page.getByRole('button',{name:'0.8 seconds',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click()}
 await page.getByRole('button',{name:/^Game Options/}).click();await page.getByRole('button',{name:'2 — Memory Peek',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
 await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','previewing',{timeout:16000})
}
async function attemptAllInputs(page:Page){
 await page.locator('[data-answer]').first().evaluate((button:HTMLButtonElement)=>{button.click();button.dispatchEvent(new MouseEvent('click',{bubbles:true}));button.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true}));button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))})
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
 await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
}
test('Memory 2.0 hides target, blocks all early inputs and held hand must leave before a fresh one-second dwell',async({page})=>{
 await begin(page,true);await expect(page.locator('[data-reference]')).toHaveCount(0);await attemptAllInputs(page)
 // No target knowledge: hold over the first equally prominent preview card.
 const first=page.locator('[data-answer]').first();await pointAt(page,first)
 await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping',{timeout:12000});await attemptAllInputs(page)
 await expect(page.locator('[data-reference]')).toHaveCount(0)
 await page.evaluate(()=>document.getAnimations().filter(a=>(a.effect as KeyframeEffect)?.target?.hasAttribute('data-card-rotor')).forEach(a=>a.pause()))
 await page.waitForTimeout(1000);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping');await attemptAllInputs(page)
 await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()))
 await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','revealingTarget');await attemptAllInputs(page)
 await expect(page.locator('[data-reference]')).toBeVisible()
 await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting',{timeout:5000})
 await expect(page.locator('[data-card-front][aria-hidden="true"]')).toHaveCount(4)
 await page.waitForTimeout(1400);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting');await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
 const targetName=await page.locator('aside span').last().innerText(),targetId=await page.locator('aside img').getAttribute('src')
 expect(targetName.length).toBeGreaterThan(0)
 // Leave the held card, then re-enter it: no old dwell time is retained.
 await page.evaluate(()=>Reflect.set(window,'testHand',{x:.5,y:.48}));await page.waitForTimeout(300)
 const at=Date.now();await pointAt(page,first);await page.waitForTimeout(400);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting')
 await expect(page.locator('[data-phase]')).not.toHaveAttribute('data-phase','selecting',{timeout:2500});expect(Date.now()-at).toBeGreaterThanOrEqual(1000)
 if(await page.locator('[data-phase]').getAttribute('data-phase')==='feedback'){
  await expect(first).toBeDisabled();await expect(first.locator('img')).toHaveCount(1);await expect(page.locator('[data-card-front][aria-hidden="false"]')).toHaveCount(1)
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting')
  // Correct identity is available only in staff/test DOM data after the prompt.
  const id=targetId?.split('/').pop()?.split('.')[0]
  const actual=await page.locator('[data-reference] img').getAttribute('src')
  expect(actual).toBe(targetId);expect(id).toBeTruthy()
  const label=await page.locator('aside span').last().innerText()
  // Match catalogue label to stable test ID (not exposed as an accessible hidden label).
  const correct=page.locator(`[data-answer="${categories[0].items.find(c=>c.label===label)!.id}"]`)
  await correct.click()
 }
 await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1')
})
test('pausing and resuming a partial flip preserves state and disabled cards',async({page})=>{
 await begin(page);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping',{timeout:12000});await page.getByRole('button',{name:'Staff Controls',exact:true}).click()
 await page.waitForTimeout(1200);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting',{timeout:4000})
 const back=page.getByRole('button',{name:'Choose card 1',exact:true});await expect(back).toBeEnabled();await control(page,'Replay Pictures');await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','replaying');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
})
test('Resume explicitly unpauses a flip after browser visibility loss',async({page})=>{
 await begin(page);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping',{timeout:12000})
 await page.evaluate(()=>{Reflect.set(window,'testHidden',true);Object.defineProperty(document,'hidden',{configurable:true,get:()=>Reflect.get(window,'testHidden')});document.dispatchEvent(new Event('visibilitychange'))})
 await page.waitForTimeout(600);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','flipping');await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
 await page.evaluate(()=>{Reflect.set(window,'testHidden',false);document.dispatchEvent(new Event('visibilitychange'))});await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click()
 await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting',{timeout:5000});await expect(page.getByRole('button',{name:'Choose card 1',exact:true})).toBeEnabled()
})
