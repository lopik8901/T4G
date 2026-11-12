import {test,expect,type Page} from '@playwright/test'
import {denyCamera,entry,freezeClock,control} from './helpers'
async function fixture(page:Page,available=true){
 await denyCamera(page);await page.addInitScript(available=>{
 const english={name:'Test local English',voiceURI:'en-test',lang:'en-SG',localService:true}
 Reflect.set(window,'testVoices',available?[english]:[]);Reflect.set(window,'englishVoice',english);Reflect.set(window,'speechRequests',[]);Reflect.set(window,'speechMode','ok')
 class Utterance{text:string;onstart?:()=>void;onend?:()=>void;onerror?:(e:{error:string})=>void;constructor(text:string){this.text=text}}
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance})
 class Service extends EventTarget{
 timer:ReturnType<typeof setTimeout>|undefined
 getVoices(){return Reflect.get(window,'testVoices')}
 cancel(){clearTimeout(this.timer)}
 resume(){}
 speak(u:Utterance){Reflect.set(window,'lastUtterance',u);Reflect.get(window,'speechRequests').push(u);const mode=Reflect.get(window,'speechMode');if(mode==='blocked'){u.onerror?.({error:'not-allowed'});return}if(mode==='delayed')return;u.onstart?.();if(mode!=='hold')this.timer=setTimeout(()=>u.onend?.(),30)}
 }
 Object.defineProperty(window,'speechSynthesis',{value:new Service()})
 },available)
}
async function settings(page:Page){await page.getByRole('button',{name:'Staff settings',exact:true}).click()}
test('English Test Voice, volume, mute, correct instructions and no language/player controls',async({page})=>{
 await fixture(page);await page.goto(entry);await expect(page.getByRole('button',{name:/Mandarin|Two Players|Single Player/})).toHaveCount(0)
 await settings(page);await page.getByRole('button',{name:'Softer',exact:true}).click();await page.getByRole('button',{name:'Test Voice',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'lastUtterance')?.lang)).toBe('en-SG');expect(await page.evaluate(()=>Reflect.get(window,'lastUtterance').volume)).toBe(.4)
 await expect(page.locator('[data-speech-status]')).toContainText('audibility is unverified');await page.getByRole('dialog').getByRole('button',{name:'Audio: On',exact:true}).click();await expect(page.locator('[data-speech-status]')).toHaveText('Audio is off.');await page.getByRole('dialog').getByRole('button',{name:'Audio: Off',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click()
 await page.getByRole('button',{name:'Start Game',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'lastUtterance')?.text)).toMatch(/^Find /);expect(await page.locator('main').getAttribute('lang')).toBe('en')
})
test('late local English discovery retries current request; network voices rejected; missing speech never blocks game',async({page})=>{
 await fixture(page,false);await freezeClock(page);await page.goto(entry);await settings(page);await expect(page.locator('[data-speech-status]')).toContainText('No local English voice');await page.getByRole('button',{name:'Test Voice',exact:true}).click()
 await page.evaluate(()=>{Reflect.set(window,'testVoices',[{name:'Network English',voiceURI:'remote',lang:'en-US',localService:false}]);speechSynthesis.dispatchEvent(new Event('voiceschanged'))});expect(await page.evaluate(()=>Reflect.get(window,'speechRequests').length)).toBe(0)
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click();await expect(page.locator('aside')).toBeVisible();await page.clock.runFor(2300);await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','answering')
 await page.evaluate(()=>{Reflect.set(window,'testVoices',[Reflect.get(window,'englishVoice')]);speechSynthesis.dispatchEvent(new Event('voiceschanged'))});await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'lastUtterance')?.text)).toMatch(/^Find /)
})
test('blocked speech can retry; startup timeout survives late cancellation; stale callbacks cannot affect a new request',async({page})=>{
 await fixture(page);await freezeClock(page);await page.goto(entry);await settings(page)
 await page.evaluate(()=>Reflect.set(window,'speechMode','blocked'));await page.getByRole('button',{name:'Test Voice',exact:true}).click();await expect(page.locator('[data-speech-status]')).toContainText('Click Test Voice directly')
 await page.evaluate(()=>Reflect.set(window,'speechMode','delayed'));await page.getByRole('button',{name:'Test Voice',exact:true}).click();await page.clock.runFor(16000);await expect(page.locator('[data-speech-status]')).toContainText('did not start in time');await page.evaluate(()=>Reflect.get(window,'lastUtterance').onerror?.({error:'interrupted'}));await expect(page.locator('[data-speech-status]')).toContainText('did not start in time')
 await page.evaluate(()=>{Reflect.set(window,'oldSpeech',Reflect.get(window,'lastUtterance'));Reflect.set(window,'speechMode','hold')});await page.getByRole('button',{name:'Test Voice',exact:true}).click();await page.evaluate(()=>{const u=Reflect.get(window,'oldSpeech');u.onend?.();u.onerror?.({error:'not-allowed'})});await expect(page.locator('[data-speech-status]')).toContainText('English speech requested')
 await page.getByRole('dialog').getByRole('button',{name:'Audio: On',exact:true}).click();await expect(page.locator('[data-speech-status]')).toHaveText('Audio is off.')
})
