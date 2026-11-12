import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readRequestBody,RequestBodyTooLarge,maxRequestBytes} from './request-body.ts'
import {requestSchema,templateGame} from '../src/studio/config.ts'

async function* chunks(buffer:Buffer,size=7){for(let i=0;i<buffer.length;i+=size)yield buffer.subarray(i,i+size)}
test('valid dense registered visuals fit the bounded API request and unicode survives chunk boundaries',async()=>{
  const definition={palette:{primary:'#ABCDEF',secondary:'#ABCDEF',accent:'#ABCDEF',outline:'#ABCDEF'},shapes:Array.from({length:32},()=>({shape:'polygon',points:Array.from({length:16},()=>({x:12.345678901234567,y:98.76543210987654})),fill:'primary',stroke:'outline',strokeWidth:1})),states:{idle:1,selected:1,completed:1,disabled:.5},animation:'none'}
  const config={...templateGame('garden'),experimental:{id:'144851c9-efc6-483d-8b6e-429391fcaa0f',name:'Large art fixture',sourceHash:'a'.repeat(64),artifactHash:'b'.repeat(64),scene:{instruction:'Guide the shapes.',parameters:[],registeredVisuals:Array.from({length:4},(_,i)=>({assetId:`component-${String(i).repeat(64)}`,definition})),entities:[{id:'target',kind:'target',x:.5,y:.5,radius:.1,appearance:'circle',color:'#ABCDEF',assetId:`component-${'0'.repeat(64)}`,state:[]}]}}}
  const input=requestSchema.parse({config,prompt:'Make it gentle 🌸 蝴蝶',action:'edit'})
  const body=Buffer.from(JSON.stringify(input));assert.ok(body.length>64000);assert.ok(body.length<maxRequestBytes)
  assert.deepEqual(JSON.parse(await readRequestBody(chunks(body))),input)
  await assert.rejects(readRequestBody(chunks(Buffer.alloc(maxRequestBytes+1),65536)),RequestBodyTooLarge)
})
