import { test, expect } from '@playwright/test'
import { isolatedFrame } from '../src/engine/isolated-frame'
import { readFileSync } from 'node:fs'
const runtimeCore=readFileSync(new URL('../sandbox/runtime-core.mjs',import.meta.url),'utf8')

// Hand-authored boundary fixtures, NOT evidence that an AI-generated game passed Docker.
const scene = { parameters: [], entities: [{ id: 'one', kind: 'circle', x: .2, y: .3, radius: .1, state: [] }] }
test('opaque preview worker receives positions, cannot access parent DOM, and is terminated when stuck', async ({ page }) => {
  await page.goto('/')
  const requests: string[] = []
  page.on('request', r => { if(r.url().startsWith('https://example.com')) requests.push(r.url()) })
  const source = `var CarePlayMechanic={createMechanic(){return {setup(c){c.emit({type:'spawn',entityId:'one',value:{kind:'circle',x:.2,y:.3,radius:.1}});fetch('https://example.com/denied-preview-probe').then(()=>{c.entities[0].state.completed=false},()=>{c.entities[0].state.completed=true})},update(c){c.entities[0].position.x=c.input.hands[0]?.position.x??.2;},dispose(){}}}};`
  const result = await page.evaluate(async html => {
    const iframe = document.createElement('iframe'); iframe.sandbox.add('allow-scripts'); iframe.srcdoc = html
    const messages: unknown[] = []; let blocked = false
    const done = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No isolated response')), 5000)
      iframe.onload = () => {
        try { void iframe.contentWindow!.document.body } catch { blocked = true }
        const pair = new MessageChannel()
        pair.port1.onmessage = e => { messages.push(e.data); if (messages.length === 1) setTimeout(() => pair.port1.postMessage({input:{time:1,hands:[{id:'h',position:{x:.8,y:.4}}],sound:false,pointer:null},delta:.05}), 50); else { clearTimeout(timeout); pair.port1.close(); resolve() } }
        iframe.contentWindow!.postMessage('connect', '*', [pair.port2])
      }
    })
    document.body.append(iframe); await done; iframe.remove(); return { blocked, messages }
  }, isolatedFrame(source, scene, runtimeCore))
  expect(result.blocked).toBe(true)
  expect((result.messages[1] as {entities:unknown[]}).entities).toHaveLength(1)
  expect(result.messages[1]).toMatchObject({ entities: [{ x: .8, completed: true }] })
  expect(requests).toEqual([])
  const timeout = await page.evaluate(async html => {
    const iframe = document.createElement('iframe'); iframe.sandbox.add('allow-scripts'); iframe.srcdoc = html
    const response = new Promise<unknown>((resolve, reject) => { const timer=setTimeout(()=>reject(Error('Watchdog failed')),5000); iframe.onload=()=>{const p=new MessageChannel();p.port1.onmessage=e=>{clearTimeout(timer);p.port1.close();resolve(e.data)};iframe.contentWindow!.postMessage('connect','*',[p.port2])} })
    document.body.append(iframe); const result=await response;iframe.remove();return result
  }, isolatedFrame('while(true){}', scene, runtimeCore))
  expect(timeout).toMatchObject({ error: expect.stringContaining('timeout') })
})
