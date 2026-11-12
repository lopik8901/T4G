import {test,expect} from '@playwright/test'
import {templateGame} from '../src/studio/config.ts'

test('real API accepts supported large scene edits and rejects over-limit bodies before authoring',async({request})=>{
  const definition={palette:{primary:'#ABCDEF',secondary:'#ABCDEF',accent:'#ABCDEF',outline:'#ABCDEF'},shapes:Array.from({length:32},()=>({shape:'polygon',points:Array.from({length:16},()=>({x:12.345678901234567,y:98.76543210987654})),fill:'primary',stroke:'outline',strokeWidth:1})),states:{idle:1,selected:1,completed:1,disabled:.5},animation:'none'}
  const config={...templateGame('garden'),experimental:{id:'144851c9-efc6-483d-8b6e-429391fcaa0f',name:'Transport fixture only',sourceHash:'a'.repeat(64),artifactHash:'b'.repeat(64),scene:{instruction:'Fixture',parameters:[],registeredVisuals:Array.from({length:4},(_,i)=>({assetId:`component-${String(i).repeat(64)}`,definition})),entities:[{id:'token',kind:'token',x:.5,y:.5,radius:.08,appearance:'circle',color:'#ABCDEF',state:[]}]}}}
  const input={config,prompt:'Mute the sound',action:'edit'}
  expect(Buffer.byteLength(JSON.stringify(input))).toBeGreaterThan(64000)
  const result=await request.post('/api/agent',{data:input})
  expect(result.status()).toBe(200);expect((await result.json()).patch.volume).toBe(0)
  const oversized=await request.post('/api/agent',{headers:{'content-type':'application/json'},data:' '.repeat(1024*1024+1)})
  expect(oversized.status()).toBe(413)
})
