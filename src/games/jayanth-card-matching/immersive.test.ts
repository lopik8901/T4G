import{test}from'node:test'
import assert from'node:assert/strict'
import{videoPoint,sensorPoint}from'./framing.ts'
import{newSession,updateSession}from'./session.ts'
import{categories}from'./categories.ts'
import{createRound}from'./logic.ts'
for(const [width,height] of [[2048,700],[1920,1080],[1366,768],[1280,720]])test(`cover mapping and inverse preserve exact mirrored pixels and pan at ${width}x${height}`,()=>{
 for(const size of [[640,480],[1280,720]])for(const framing of [{x:.5,y:.25},{x:.25,y:.75},{x:.75,y:.1}]){
  const original={x:.45,y:.4},pixel=videoPoint(original,...size as[number,number],width,height,'cover',framing),back=sensorPoint(pixel,...size as[number,number],width,height,'cover',framing)
  assert.ok(Math.abs(back.x-original.x)<1e-10);assert.ok(Math.abs(back.y-original.y)<1e-10)
 }
})
test('descent requires all four real landing events and its time gate; pause/stale events are safe',()=>{
 let s=newSession(categories[0],5);for(const t of [1800,1500])s=updateSession(s,{type:'tick',delta:t});assert.equal(s.phase,'falling')
 s=updateSession(s,{type:'tick',delta:10000});assert.equal(s.phase,'falling');assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s)
 for(const c of s.round.answers.slice(0,3))s=updateSession(s,{type:'land-complete',id:c.id,revision:s.revision})
 s=updateSession(s,{type:'pause',value:true});assert.equal(updateSession(s,{type:'tick',delta:5000}),s);s=updateSession(s,{type:'pause',value:false})
 s=updateSession(s,{type:'land-complete',id:s.round.answers[3].id,revision:s.revision-1});assert.equal(s.landed.length,3)
 s=updateSession(s,{type:'land-complete',id:s.round.answers[3].id,revision:s.revision});s=updateSession(s,{type:'tick',delta:1});assert.equal(s.phase,'answering')
})
test('eligible correct positions are balanced, unique and never repeat the excluded slot',()=>{
 let seed=8123;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32}
 for(let excluded=0;excluded<4;excluded++){
  const count=[0,0,0,0]
  for(let i=0;i<6000;i++){const r=createRound(categories[2],undefined,random,[],excluded);const slot=r.answers.findIndex(c=>c.id===r.reference.id);assert.notEqual(slot,excluded);assert.equal(new Set(r.answers.map(c=>c.id)).size,4);count[slot]++}
  for(let slot=0;slot<4;slot++)if(slot!==excluded)assert.ok(count[slot]>1800&&count[slot]<2200,`${excluded}: ${count}`)
 }
})
test('a prepared round cannot re-use the previous correct slot',()=>{
 let s=newSession(categories[0],0,true);const old=s.round.answers.findIndex(c=>c.id===s.round.reference.id);const prepared={reference:s.round.reference,answers:[...s.round.answers]}
 s=updateSession(s,{type:'skip',round:prepared});assert.notEqual(s.round.reference.id,prepared.reference.id);assert.notEqual(s.round.answers.findIndex(c=>c.id===s.round.reference.id),old)
})
