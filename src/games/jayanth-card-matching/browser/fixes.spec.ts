import {expect,test} from '@playwright/test'
import {control,entry,denyCamera,freezeClock,correctButton} from './helpers'
for(const length of [5,10])test(`${length} correct matches visibly light ${length} stages, persist and reset on restart`,async({page})=>{
  await denyCamera(page);await freezeClock(page);await page.goto(entry)
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:`${length} rounds`,exact:true}).click()
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  let previousLit=0,previousSlot=-1
  for(let round=1;round<=length;round++){
    await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300)
    await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','answering')
    const skyline=page.locator('[data-skyline]')
    await expect(skyline).toHaveAttribute('data-progress',String(round-1))
    const before=await skyline.locator('[data-section]').evaluateAll(nodes=>nodes.map(node=>({fill:getComputedStyle(node).fill,color:getComputedStyle(node).color})))
    const correct=await correctButton(page)
    const slot=await correct.evaluate(el=>Array.from(el.parentElement!.children).indexOf(el));expect(slot).not.toBe(previousSlot);previousSlot=slot
    if(round===1){
      const id=await correct.getAttribute('data-answer')
      await page.locator(`[data-answer]:not([data-answer="${id}"])`).first().click()
      await expect(skyline).toHaveAttribute('data-progress','0')
    }
    await correct.click()
    await expect(skyline).toHaveAttribute('data-progress',String(round))
    const after=await skyline.locator('[data-section]').evaluateAll(nodes=>nodes.map(node=>({fill:getComputedStyle(node).fill,color:getComputedStyle(node).color})))
    expect(after).not.toEqual(before)
    const count=await skyline.locator('[data-lit="true"]').count();expect(count).toBeGreaterThan(previousLit);previousLit=count
    await expect(page.locator('[data-journey]')).toContainText('lights up!')
    if(round===1)await page.screenshot({path:`artifacts/card-matching/unlock-${length}-stage-1.png`})
    await page.clock.runFor(2100)
  }
  await expect(page.getByRole('heading',{name:'Thank you for playing!',exact:true})).toBeVisible()
  await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress',String(length))
  expect(previousLit).toBe(10)
  await control(page,'Restart')
  await page.getByRole('dialog').getByRole('button',{name:'Restart',exact:true}).click()
  await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','0')
  await expect(page.locator('[data-lit="true"]')).toHaveCount(0)
})
