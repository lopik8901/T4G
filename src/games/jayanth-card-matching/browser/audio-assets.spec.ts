import {test,expect} from '@playwright/test'
import {entry,denyCamera} from './helpers'
async function fixture(page:import('@playwright/test').Page){
 await denyCamera(page)
 await page.addInitScript(()=>{
  const voices=[{name:'Local English',voiceURI:'en',lang:'en-SG',localService:true},{name:'Local English',voiceURI:'en',lang:'en-SG',localService:true}]
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(text:string){this.text=text}}})
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,addEventListener(){},removeEventListener(){},resume(){},cancel(){},speak(u:{text:string;lang:string;onstart?:()=>void;onend?:()=>void}){Reflect.set(window,'spoken',u);u.onstart?.();setTimeout(()=>u.onend?.(),20)}}})
  Object.defineProperty(window,'Audio',{value:class {
   volume=1;onended?:()=>void;onerror?:()=>void;path:string
   constructor(path:string){this.path=path;Reflect.set(window,'clipPath',path)}
   pause(){Reflect.set(window,'pausedClip',true)}
   async play(){Reflect.set(window,'clipVolume',this.volume);Reflect.set(window,'clipPlayed',true);if(Reflect.get(window,'missingClip'))throw new Error('Missing');setTimeout(()=>this.onended?.(),20)}
  }})
 })
 await page.route(/\/speech\.ts(?:\?|$)/,async route=>{const response=await route.fetch();const body=(await response.text()).replace(/const recordedClips = \{\}/,'const recordedClips = {en:{"app:preview":"/approved-local-test.mp3"}}');await route.fulfill({response,body})})
 await page.goto(entry)
}
test('local English recording has priority and volume is applied; muting cancels playback',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:'Staff settings',exact:true}).click();await page.getByRole('button',{name:'Test Voice',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'clipPlayed'))).toBe(true);expect(await page.evaluate(()=>Reflect.get(window,'clipVolume'))).toBe(.65);expect(await page.evaluate(()=>Reflect.get(window,'clipPath'))).toBe('/approved-local-test.mp3');expect(await page.evaluate(()=>Reflect.get(window,'spoken'))).toBeUndefined()
 await page.getByRole('button',{name:'Test Voice',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Audio: On',exact:true}).click();expect(await page.evaluate(()=>Reflect.get(window,'pausedClip'))).toBe(true)
})
test('missing local recording reports failure and uses only matching local voice',async({page})=>{
 await fixture(page);await page.evaluate(()=>Reflect.set(window,'missingClip',true));await page.getByRole('button',{name:'Staff settings',exact:true}).click();await page.getByRole('button',{name:'Test Voice',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'spoken')?.lang)).toBe('en-SG');await expect(page.locator('[data-speech-status]')).toContainText('local recording could not load')
 expect(await page.evaluate(()=>Reflect.get(window,'spoken')?.text)).toBe('Take your time. Let’s find a matching card together.')
})
