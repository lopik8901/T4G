import {test,expect} from '@playwright/test'
import {denyCamera,syntheticHands,pointAt,correctButton,ready} from '../src/games/jayanth-card-matching/browser/helpers'
import {categories} from '../src/games/jayanth-card-matching/categories'

test('imported main Balloon Pop runs separately and counts a preview pop',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/demos/balloon-pop/')
  await expect(page.getByRole('combobox',{name:'Penalty balloons',exact:true})).toHaveValue('off')
  await page.getByRole('button',{name:'Or try a preview'}).click()
  await page.getByRole('button',{name:'Start preview',exact:true}).click()
  const bonus=page.getByRole('button',{name:'Pop rainbow balloon (+3)',exact:true})
  await bonus.focus();await page.keyboard.press('Enter')
  await expect(page.locator('.round-status strong')).toHaveText('1 balloon popped')
  await expect(page.locator('.score-display strong')).toHaveText('3')
  await page.screenshot({path:'artifacts/demo-balloon.png',fullPage:true})
  expect(errors).toEqual([])
})

test('Direct Match opens Level 1 and advances the skyline on a correct answer',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await denyCamera(page)
  await page.goto('/demos/direct-match/')
  await expect(page.getByRole('button',{name:'Game Options · Level 1',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await ready(page)
  await expect(page.locator('[data-answer]')).toHaveCount(4)
  await (await correctButton(page)).click()
  await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1')
  await page.screenshot({path:'artifacts/demo-direct-match.png',fullPage:true})
  expect(errors).toEqual([])
})

test('Memory Peek opens Level 2, conceals cards, then accepts the matching remembered picture',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await denyCamera(page)
  await page.goto('/demos/memory-peek/')
  await expect(page.getByRole('button',{name:'Game Options · Level 2',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','previewing',{timeout:16000})
  await expect(page.locator('[data-answer]:enabled')).toHaveCount(0)
  await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','selecting',{timeout:25000})
  await expect(page.locator('[data-card-front][aria-hidden="true"]')).toHaveCount(4)
  const label=await page.locator('aside span').last().innerText()
  const answer=categories[0].items.find(item=>item.label===label)!
  await page.locator(`[data-answer="${answer.id}"]`).click()
  await expect(page.locator('[data-skyline]')).toHaveAttribute('data-progress','1')
  await page.screenshot({path:'artifacts/demo-memory-peek.png',fullPage:true})
  expect(errors).toEqual([])
})

test('imported card demo retains local hand-pointer navigation and explicit camera cleanup',async({page})=>{
  await syntheticHands(page)
  await page.goto('/demos/direct-match/')
  await page.getByRole('button',{name:'Audio: On',exact:true}).click()
  await pointAt(page,page.getByRole('button',{name:'Fruits',exact:true}))
  await expect(page.getByRole('button',{name:'Fruits',exact:true})).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button',{name:'End Session',exact:true}).click()
  await page.getByRole('dialog').getByRole('button',{name:'End Session',exact:true}).click()
  await expect(page.getByText('Session ended. The camera, hand tracking and audio are stopped. You can close this tab.')).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'stoppedTracks')??0)).toBeGreaterThan(0)
})
