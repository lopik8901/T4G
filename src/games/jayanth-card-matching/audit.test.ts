import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mapHand} from './mirror.ts'
import {defaultCalibration} from './assistance.ts'
import {rankVoices} from './speech.ts'
for(const [width,height] of [[1920,1080],[1366,768],[1280,720]])test(`live mirror and cursor share the same cover crop at ${width}x${height}`,()=>{
  const middle=mapHand({x:.5,y:.5},640,480,width,height,true,defaultCalibration)
  assert.deepEqual(middle.point,{x:.5,y:.5})
  const palm=mapHand({x:.25,y:.5},640,480,width,height,true,{centerX:.2,centerY:.7,reach:1.8})
  assert.deepEqual(palm.point,palm.raw)
  assert.equal(palm.point.x,.75)
  assert.notDeepEqual(mapHand({x:.25,y:.5},640,480,width,height,false,defaultCalibration).point,palm.point)
})
test('offline narration rejects network voices',()=>{
 const voice=(lang:string,localService:boolean)=>({name:lang,voiceURI:lang,lang,localService})
 assert.deepEqual(rankVoices([voice('en-SG',false),voice('zh-CN',true)],'en'),[])
})
