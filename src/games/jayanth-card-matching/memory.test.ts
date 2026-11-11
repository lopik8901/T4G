import {test} from 'node:test'
import assert from 'node:assert/strict'
import {categories} from './categories.ts'
import {newSession,updateSession,canSelect,motion,phaseDuration,gamePaces,type Session} from './session.ts'
const tick=(s:Session,delta:number)=>updateSession(s,{type:'tick',delta})
function preview(reduced=false){let s=newSession(categories[0],5,reduced,true);for(const c of s.round.answers)s=updateSession(s,{type:'land-complete',id:c.id,revision:s.revision});return tick(s,phaseDuration.falling)}
function reveal(s:Session){s=tick(s,motion.flip);assert.equal(s.phase,'revealingTarget');s=updateSession(s,{type:'target-complete',revision:s.revision});return tick(s,motion.target)}
for(const reduced of [false,true])test(`Memory gates all inputs on time AND all four completions, reduced=${reduced}`,()=>{
 let s=preview(reduced);assert.equal(s.phase,'previewing');assert.equal(canSelect(s),false)
 s=tick(s,gamePaces.standard-1);assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s)
 s=tick(s,1);assert.equal(s.phase,'flipping')
 s=tick(s,10000);assert.equal(s.phase,'flipping');assert.equal(s.idle,0)
 for(const card of s.round.answers.slice(0,3))s=updateSession(s,{type:'flip-complete',id:card.id,revision:s.revision})
 s=tick(s,1000);assert.equal(s.phase,'flipping');assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s)
 s=updateSession(s,{type:'flip-complete',id:s.round.answers[3].id,revision:s.revision});s=tick(s,1);assert.equal(s.phase,'revealingTarget');s=reveal(s);assert.equal(s.phase,'selecting');assert.equal(s.phaseTime,0)
 s=updateSession(s,{type:'choose',id:s.round.reference.id});assert.equal(s.phase,'success');assert.equal(s.journey,1)
})
test('pause freezes flip clock and stale/duplicate completion callbacks cannot unlock cards',()=>{
 let s=tick(preview(),gamePaces.standard);s=tick(s,200);s=updateSession(s,{type:'pause',value:true});assert.equal(tick(s,5000),s)
 s=updateSession(s,{type:'pause',value:false});s=updateSession(s,{type:'flip-complete',id:s.round.answers[0].id,revision:s.revision-1});assert.equal(s.closed.length,0)
 const event={type:'flip-complete' as const,id:s.round.answers[0].id,revision:s.revision};s=updateSession(s,event);s=updateSession(s,event);assert.equal(s.closed.length,1);assert.equal(s.phaseTime,200)
})
test('memory feedback reveals selected card, no penalty, then fresh selection; staff can re-preview',()=>{
 let s=tick(preview(true),gamePaces.standard);for(const c of s.round.answers)s=updateSession(s,{type:'flip-complete',id:c.id,revision:s.revision});s=tick(s,100);s=reveal(s)
 const wrong=s.round.answers.find(c=>c.id!==s.round.reference.id)!.id;s=updateSession(s,{type:'choose',id:wrong});assert.equal(s.phase,'feedback');assert.equal(s.selected,wrong);assert.equal(s.journey,0)
 assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s);s=tick(s,1200);assert.equal(s.phase,'selecting');assert.equal(s.selected,null);assert.ok(s.rejected.includes(wrong));s=updateSession(s,{type:'peek'});assert.equal(s.phase,'replaying');assert.deepEqual(s.closed,[])
})

for(const reduced of [false,true])test(`all memory phases freeze on pause and require real target completion, reduced=${reduced}`,()=>{
 let s=newSession(categories[0],5,reduced,true)
 for(const expected of ['falling','previewing','flipping','revealingTarget','selecting']){
  assert.equal(s.phase,expected)
  const paused=updateSession(s,{type:'pause',value:true})
  assert.equal(tick(paused,90000),paused)
  assert.equal(updateSession(paused,{type:'choose',id:s.round.reference.id}),paused)
  s=updateSession(paused,{type:'pause',value:false})
  if(expected!=='selecting')assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s)
  if(expected==='falling')for(const c of s.round.answers)s=updateSession(s,{type:'land-complete',id:c.id,revision:s.revision})
  if(expected==='flipping')for(const c of s.round.answers)s=updateSession(s,{type:'flip-complete',id:c.id,revision:s.revision})
  if(expected==='revealingTarget'){
   s=tick(s,90000);assert.equal(s.phase,'revealingTarget')
   assert.equal(updateSession(s,{type:'target-complete',revision:s.revision-1}),s)
   s=updateSession(s,{type:'target-complete',revision:s.revision})
  }
  s=tick(s,90000)
 }
 s=updateSession(s,{type:'choose',id:s.round.reference.id});assert.equal(s.journey,1)
 s=tick(s,2000);const old=s.revision;s=updateSession(s,{type:'advance'});assert.equal(s.phase,'falling');assert.equal(s.targetSettled,false)
 assert.equal(updateSession(s,{type:'target-complete',revision:old}),s)
})
