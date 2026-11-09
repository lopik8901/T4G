import {test} from 'node:test'
import assert from 'node:assert/strict'
import {categories} from './categories.ts'
import {newSession,updateSession,canSelect,motion,phaseDuration,gamePaces,closingSoonDuration,type Session,type GamePace} from './session.ts'
const tick=(s:Session,delta:number)=>updateSession(s,{type:'tick',delta})
const completion=(s:Session,type:'land-complete'|'open-complete'|'flip-complete')=>s.round.answers.reduce((state,c)=>updateSession(state,{type,id:c.id,revision:s.revision,cycle:s.cycle}),s)
function select(s:Session){s=completion(s,'flip-complete');s=tick(s,motion.flip);s=updateSession(s,{type:'target-complete',revision:s.revision,cycle:s.cycle});return tick(s,motion.target)}
test('gentle timing configuration has 1.5 s descent, .4 s stagger, .9 s flip and 1.5 s target',()=>{
 assert.equal(motion.descent,1500);assert.equal(motion.stagger,400);assert.equal(phaseDuration.falling,2700);assert.equal(motion.flip,900);assert.equal(motion.target,1500);assert.equal(motion.dwell,1000)
 assert.deepEqual(gamePaces,{relaxed:14000,standard:10000,brisk:8000});assert.equal(newSession(categories[0],0).pace,'standard')
})
for(const pace of Object.keys(gamePaces) as GamePace[])for(const reduced of [false,true])test(`${pace}, reduced=${reduced}: full preview starts only after landing; target/input locked; no idle consumed`,()=>{
 let s=newSession(categories[0],5,reduced,true,pace)
 if(!reduced){s=tick(s,20000);assert.equal(s.phase,'falling');assert.equal(s.idle,0);s=completion(s,'land-complete')}
 s=tick(s,phaseDuration.falling);assert.equal(s.phase,'previewing');assert.equal(s.phaseTime,0)
 s=tick(s,gamePaces[pace]-closingSoonDuration-1);assert.equal(s.closingSoon,false)
 s=tick(s,1);assert.equal(s.closingSoon,true);assert.equal(canSelect(s),false)
 s=tick(s,closingSoonDuration-1);assert.equal(s.phase,'previewing');assert.equal(updateSession(s,{type:'choose',id:s.round.reference.id}),s)
 const paused=updateSession(s,{type:'pause',value:true});assert.equal(tick(paused,60000),paused)
 s=updateSession(paused,{type:'pause',value:false});s=tick(s,1);assert.equal(s.phase,'flipping');assert.equal(s.idle,0)
 s=completion(s,'flip-complete');s=tick(s,899);assert.equal(s.phase,'flipping');s=tick(s,1);assert.equal(s.phase,'revealingTarget')
 s=updateSession(s,{type:'target-complete',revision:s.revision,cycle:s.cycle});s=tick(s,1499);assert.equal(canSelect(s),false);s=tick(s,1);assert.equal(s.phase,'selecting');assert.equal(s.idle,0)
 s=tick(s,29999);assert.equal(s.idle,29999)
})
test('repeated replay preserves question, order, rejection, round and skyline, discards stale callbacks, and waits for all openings',()=>{
 let s=newSession(categories[0],10,false,true,'relaxed');s=completion(s,'land-complete');s=tick(s,2700);s=tick(s,14000);s=select(s)
 s=updateSession(s,{type:'choose',id:s.round.reference.id});s=tick(s,2000);s=updateSession(s,{type:'advance'});s=completion(s,'land-complete');s=tick(s,2700);s=tick(s,14000);s=select(s);assert.equal(s.journey,1)
 const wrong=s.round.answers.find(c=>c.id!==s.round.reference.id)!.id;s=updateSession(s,{type:'choose',id:wrong});s=tick(s,1200)
 const round=s.round,history=s.history,journey=s.journey,number=s.number,revision=s.revision
 for(let i=0;i<10;i++){
  const priorCycle=s.cycle;s=updateSession(s,{type:'peek'});assert.equal(s.phase,'replaying');assert.equal(s.cycle,priorCycle+1);assert.equal(canSelect(s),false)
  assert.equal(updateSession(s,{type:'peek'}),s);assert.equal(updateSession(s,{type:'target-complete',revision,cycle:priorCycle}),s)
  assert.equal(updateSession(s,{type:'open-complete',id:wrong,revision,cycle:priorCycle}),s)
  s=tick(s,5000);assert.equal(s.phase,'replaying')
  for(const c of round.answers.slice(0,3))s=updateSession(s,{type:'open-complete',id:c.id,revision,cycle:s.cycle})
  s=tick(s,1000);assert.equal(s.phase,'replaying')
  let paused=updateSession(s,{type:'pause',value:true});assert.equal(tick(paused,60000),paused);paused=completion(paused,'open-complete');assert.equal(paused.phase,'replaying')
  s=updateSession(paused,{type:'pause',value:false});s=tick(s,1);assert.equal(s.phase,'previewing');assert.equal(s.phaseTime,0)
  s=tick(s,13999);assert.equal(s.phase,'previewing');s=tick(s,1);s=select(s)
  assert.equal(s.round,round);assert.equal(s.number,number);assert.equal(s.revision,revision);assert.equal(s.history,history);assert.equal(s.journey,journey);assert.deepEqual(s.rejected,[wrong]);assert.deepEqual(s.shown,[]);assert.equal(s.idle,0)
 }
 s=updateSession(s,{type:'choose',id:round.reference.id});assert.equal(s.journey,journey+1)
})
test('pace changes are allowed while paused; direct matching never gains replay or a memory timer',()=>{
 let s=newSession(categories[0],5,true,true);s=tick(s,100);s=tick(s,5000);s=updateSession(s,{type:'pause',value:true});s=updateSession(s,{type:'pace',value:'relaxed'});assert.equal(s.phaseTime,5000);assert.equal(s.pace,'relaxed');s=updateSession(s,{type:'pause',value:false});s=tick(s,8999);assert.equal(s.phase,'previewing');s=tick(s,1);assert.equal(s.phase,'flipping')
 let direct=newSession(categories[0],0,true);for(let i=0;i<3;i++)direct=tick(direct,10000);assert.equal(direct.phase,'answering');assert.equal(updateSession(direct,{type:'peek'}),direct)
})
