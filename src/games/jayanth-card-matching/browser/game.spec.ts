import { expect,test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {control,entry,denyCamera,syntheticHands,pointAt,ready,correctButton,start,confirmHome,freezeClock} from './helpers'

test('four choices in every category; animation input lock, rejects, keyboard success and skyline',async({page})=>{
  await denyCamera(page);await freezeClock(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  for(const category of ['Animals','Fruits','Colours']){
    await page.getByRole('button',{name:category,exact:true}).click()
    await page.getByRole('button',{name:'Start Game',exact:true}).click()
    await expect(page.locator('[data-answer]').first()).toBeDisabled()
    await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300);await ready(page);await expect(page.locator('[data-answer]')).toHaveCount(4)
    const correct=await correctButton(page),id=await correct.getAttribute('data-answer')
    if(category!=='Colours')expect(await correct.locator('img').getAttribute('src')).toEqual(await page.locator('aside img').getAttribute('src'))
    const wrong=page.locator(`[data-answer]:not([data-answer="${id}"])`).first()
    await wrong.click();await expect(wrong).toBeDisabled();await correct.focus();await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({hasText:'Well Done!'})).toBeVisible()
    await expect(page.locator('[data-skyline][data-progress="1"]')).toBeVisible()
    await confirmHome(page)
  }
})

test('hands navigate Home, adjacent options, start, wrong-to-correct, pause/resume and exit confirmation',async({page})=>{
  await syntheticHands(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  const fruits=page.getByRole('button',{name:'Fruits',exact:true});await pointAt(page,fruits);await expect(fruits).toHaveAttribute('aria-pressed','true',{timeout:5000})
  const five=page.getByRole('button',{name:'5 rounds',exact:true});await pointAt(page,five);await expect(five).toHaveAttribute('aria-pressed','true',{timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Start Game',exact:true}));await ready(page)
  const correct=await correctButton(page),id=await correct.getAttribute('data-answer')
  const wrong=page.locator(`[data-answer]:not([data-answer="${id}"])`).first()
  await pointAt(page,wrong);await expect(wrong).toBeDisabled({timeout:5000})
  await pointAt(page,correct);await expect(page.locator('[data-skyline][data-progress="1"]')).toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Resume',exact:true}));await expect(page.getByRole('dialog')).not.toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Return Home',exact:true}));await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible({timeout:5000})
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>v.srcObject instanceof MediaStream)).toBe(true)
  const dialog=page.getByRole('dialog')
  await pointAt(page,page.getByRole('button',{name:'End Session',exact:true}));await expect(page.getByRole('heading',{name:'End this camera session?',exact:true})).toBeVisible({timeout:5000})
  await pointAt(page,dialog.getByRole('button',{name:'End Session',exact:true}))
  await expect(page.getByText('Session ended. The camera, hand tracking and audio are stopped. You can close this tab.')).toBeVisible({timeout:5000})
  expect(await page.locator('video').evaluate((v:HTMLVideoElement)=>v.srcObject)).toBe(null)
  await expect(page.getByRole('img',{name:'Hand pointer'})).not.toBeVisible()
})

test('pause, session completion, restart confirmation and returning Home',async({page})=>{
  await denyCamera(page);await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:'5 rounds',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await page.waitForTimeout(500)
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','reveal')
  await page.getByRole('button',{name:'Resume',exact:true}).click()
  await control(page,'Restart')
  await page.getByRole('dialog').getByRole('button',{name:'Restart',exact:true}).click()
  for(let i=0;i<5;i++)await control(page,'Skip Round')
  await expect(page.getByRole('heading',{name:'Thank you for playing!',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Return to Home',exact:true}).click();await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible()
})

test('permission wait excludes idle; 30s answering idle warns then returns Home locally',async({page})=>{
  await denyCamera(page);await page.clock.install();await start(page)
  await page.clock.runFor(2500);await ready(page)
  await page.clock.runFor(26000);await expect(page.getByText(/Returning to Home soon/)).toBeVisible()
  await page.clock.runFor(5000);await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible();expect(page.url()).toContain(entry)
})

test('permission request and paused state never spend the idle allowance',async({page})=>{
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{})})
  await page.clock.install();await start(page);await page.clock.runFor(65000)
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','reveal')
  await page.getByRole('button',{name:'Staff Controls',exact:true}).click();await page.clock.runFor(35000)
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible()
})

test('TV visuals and no clipped cards at 1080p and 720p',async({page})=>{
  await denyCamera(page);await page.emulateMedia({reducedMotion:'no-preference'});await freezeClock(page);await page.goto(entry)
  await page.screenshot({path:'artifacts/card-matching/skyline-home-1920.png'})
  await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.locator('aside')).toBeVisible();await page.screenshot({path:'artifacts/card-matching/skyline-reveal-1920.png'})
  await page.clock.runFor(3500);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','falling',{timeout:10000});await page.evaluate(()=>document.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=1500}))
  await page.screenshot({path:'artifacts/card-matching/skyline-falling-1920.png'});await page.evaluate(()=>document.querySelectorAll('[data-answer]').forEach(el=>el.dispatchEvent(new AnimationEvent('animationend',{bubbles:true}))));await page.clock.runFor(3500);await ready(page)
  await page.screenshot({path:'artifacts/card-matching/skyline-ready-1920.png'})
  for(const [width,height] of [[1920,1080],[1280,720]]){
    await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    for(const card of await page.locator('[data-answer], [data-reference]').all()){
      const rect=(await card.boundingBox())!;expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.y+rect.height).toBeLessThanOrEqual(height)
      const image=card.locator('img');if(await image.count()){const box=(await image.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(rect.y+rect.height)}
    }
    await page.screenshot({path:`artifacts/card-matching/skyline-ready-${width}.png`})
  }
})

// Axe schedules work with timers, so it must not run under the paused visual clock.
test('Home and gameplay pass accessibility checks',async({page})=>{
  await denyCamera(page);await page.goto(entry)
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
  await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await ready(page)
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([])
})

test('hands operate settings, repeat, skip, restart and Home confirmation',async({page})=>{
  await syntheticHands(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await pointAt(page,page.getByRole('button',{name:'Staff settings',exact:true}))
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible({timeout:5000})
  const slower=dialog.getByRole('button',{name:'1.5 seconds',exact:true})
  await pointAt(page,slower);await expect(slower).toHaveAttribute('aria-pressed','true',{timeout:5000})
  const standard=dialog.getByRole('button',{name:'1 second',exact:true})
  await pointAt(page,standard);await expect(standard).toHaveAttribute('aria-pressed','true',{timeout:5000})
  await pointAt(page,dialog.getByRole('button',{name:'Done',exact:true}));await expect(dialog).not.toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Start Game',exact:true}));await ready(page)
  await pointAt(page,page.getByRole('button',{name:'Repeat Instruction',exact:true}));await page.waitForTimeout(1300)
  const initial=await page.locator('aside span').last().innerText()
  await pointAt(page,page.getByRole('button',{name:'Skip Round',exact:true}))
  await expect(page.locator('aside span').last()).not.toHaveText(initial,{timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Restart',exact:true}));await expect(page.getByRole('heading',{name:'Start a fresh journey?',exact:true})).toBeVisible({timeout:5000})
  await pointAt(page,dialog.getByRole('button',{name:'Restart',exact:true}));await expect(dialog).not.toBeVisible({timeout:5000})
  await pointAt(page,page.getByRole('button',{name:'Return Home',exact:true}));await expect(page.getByRole('button',{name:'Start Game',exact:true})).toBeVisible({timeout:5000})
})

test('recenter captures a comfortable hand pose without persisting it',async({page})=>{
  await syntheticHands(page);await page.goto(entry)
  const button=page.locator('[data-dwell="calibrate"]')
  await pointAt(page,button)
  await expect(page.getByText('Pointer centred. The camera marker shows your actual mirrored palm.')).toBeVisible({timeout:7000})
  await expect.poll(()=>page.getByRole('img',{name:'Hand pointer'}).evaluate(element=>{
    const rect=element.getBoundingClientRect();return Math.hypot(rect.x+rect.width/2-innerWidth/2,rect.y+rect.height/2-innerHeight/2)
  })).toBeLessThan(20)
  expect(await page.evaluate(()=>localStorage.length)).toBe(0)
})
