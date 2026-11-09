import { expect, type Page, type Locator } from '@playwright/test'
export const entry = '/src/games/jayanth-card-matching/index.html'
export async function denyCamera(page: Page) {
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}})
}
export async function syntheticHands(page: Page) {
  await page.addInitScript(()=>{
    navigator.mediaDevices.getUserMedia=async()=>{
      Reflect.set(window,'cameraRequests',(Reflect.get(window,'cameraRequests')??0)+1)
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480
      const paint=()=>{
        const context=canvas.getContext('2d')!;context.fillStyle='#bfd9d1';context.fillRect(0,0,640,480)
        context.fillStyle='#557e99';context.fillRect(0,0,100,480);context.fillStyle='#a85b68';context.fillRect(540,0,100,480)
        context.fillStyle='#e4b887';context.beginPath();context.ellipse(320,145,55,65,0,0,Math.PI*2);context.fill()
        context.fillStyle='#327d74';context.fillRect(240,215,160,220)
        context.fillStyle='#173e39';context.font='18px sans-serif';context.fillText('SYNTHETIC CAMERA',215,38)
      }
      paint();const stream=canvas.captureStream(15),timer=setInterval(paint,65)
      const track=stream.getVideoTracks()[0],stop=track.stop.bind(track)
      track.stop=()=>{Reflect.set(window,'stoppedTracks',(Reflect.get(window,'stoppedTracks')??0)+1);clearInterval(timer);stop()};return stream
    }
    Object.defineProperty(window,'Worker',{value:class {
      onmessage:((event:MessageEvent)=>void)|null=null
      postMessage(data:{type:string;frame?:ImageBitmap;time:number}){
        if(data.type==='init')queueMicrotask(()=>this.onmessage?.(new MessageEvent('message',{data:{type:'ready'}})))
        else{data.frame?.close();const point=Reflect.get(window,'testHand');const multiple=Reflect.get(window,'testHands');this.onmessage?.(new MessageEvent('message',{data:{type:'hands',hands:multiple?multiple.map((p:{x:number;y:number})=>Array.from({length:21},()=>p)):point?[Array.from({length:21},()=>point)]:[],time:data.time}}))}
      }
      terminate(){Reflect.set(window,'terminatedWorkers',(Reflect.get(window,'terminatedWorkers')??0)+1)}
    }})
  })
}
export async function pointAt(page:Page,locator:Locator){
  if(!await locator.isVisible()&&await page.getByRole('button',{name:'Staff Controls',exact:true}).isVisible()){await pointAt(page,page.getByRole('button',{name:'Staff Controls',exact:true}));await expect(page.getByRole('dialog')).toBeVisible()}
  await expect(locator).toBeVisible()
  const target=await handAt(page,locator),before=await page.evaluate(target=>Reflect.get(window,'testHand')??target,target)
  for(let i=1;i<=5;i++){await page.evaluate(({before,target,i})=>Reflect.set(window,'testHand',{x:before.x+(target.x-before.x)*i/5,y:before.y+(target.y-before.y)*i/5}),{before,target,i});await page.waitForTimeout(80)}
  const rect=(await locator.boundingBox())!
  await expect.poll(async()=>page.getByRole('img',{name:'Hand pointer'}).evaluate(element=>{
    const bounds=element.getBoundingClientRect();return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}
  }).then(point=>Math.hypot(point.x-rect.x-rect.width/2,point.y-rect.y-rect.height/2)),{timeout:5000}).toBeLessThan(14)
}
export async function ready(page:Page){await expect(page.locator('[data-phase]')).toHaveAttribute('data-phase','answering',{timeout:16000})}
export async function correctButton(page:Page){const name=await page.locator('aside span').last().innerText();return page.getByRole('button',{name:`Choose ${name}`,exact:true})}
export async function start(page:Page){await page.goto(entry);await page.getByRole('button',{name:'Audio: On',exact:true}).click();await page.getByRole('button',{name:'Start Game',exact:true}).click()}
export async function confirmHome(page:Page){await control(page,'Return Home')}
export async function control(page:Page,name:string){
 const button=page.getByRole('button',{name,exact:true})
 if(!await button.isVisible())await page.getByRole('button',{name:'Staff Controls',exact:true}).click()
 await button.click()
}

export async function freezeClock(page:Page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'))}

export async function handAt(_page:Page,locator:Locator){return locator.evaluate(element=>{
 const r=element.getBoundingClientRect(),main=document.querySelector('main')!,x=r.x+r.width/2,y=r.y+r.height/2
 if(main.getAttribute('data-mirror-mode')==='aligned'){
  const scale=Math.max(innerWidth/640,innerHeight/480),panX=Number(main.getAttribute('data-frame-x')),panY=Number(main.getAttribute('data-frame-y'))
  return {x:1-(x-(innerWidth-640*scale)*(1-panX))/(640*scale),y:(y-(innerHeight-480*scale)*panY)/(480*scale)}
 }
 return {x:1-((x/innerWidth-.5)/1.45+.5),y:(y/innerHeight-.5)/1.45+.5}
})}
