import { test } from 'node:test'
import assert from 'node:assert/strict'
import { journeyProgress } from './journey.ts'
import { rankVoices, compatibleVoice } from './speech.ts'
import { newSession, updateSession } from './session.ts'
import { categories } from './categories.ts'
for(const length of [5,10])test(`${length} rounds: each correct match lights a distinct persistent stage, restart resets`,()=>{
  let state=newSession(categories[0],length,true)
  let previous=0
  for(let i=1;i<=length;i++){
    for(let j=0;j<3;j++)state=updateSession(state,{type:'tick',delta:2000})
    const before=state.journey
    const wrong=state.round.answers.find(card=>card.id!==state.round.reference.id)!
    state=updateSession(state,{type:'choose',id:wrong.id});assert.equal(state.journey,before)
    state=updateSession(state,{type:'choose',id:state.round.reference.id})
    const p=journeyProgress(state.journey,length)
    assert.equal(p.stage,i);assert.equal(p.total,length)
    const active=p.sections.filter(stage=>stage<=p.stage).length
    assert.ok(active>previous);previous=active
    state=updateSession(state,{type:'tick',delta:2000});state=updateSession(state,{type:'advance'})
    assert.equal(state.journey,i)
  }
  assert.equal(previous,10);assert.equal(state.phase,'complete')
  assert.equal(journeyProgress(newSession(categories[0],length).journey,length).stage,0)
})
test('English matching accepts only local English metadata',()=>{
 const voice=(lang:string,localService=true)=>({name:lang,lang,voiceURI:lang,localService})
 assert.equal(compatibleVoice(voice('en_SG'),'en'),true)
 assert.equal(compatibleVoice(voice('zh-CN'),'en'),false)
 assert.deepEqual(rankVoices([voice('en-US',false)],'en'),[])
 assert.equal(rankVoices([voice('en-US'),voice('en-SG')],'en')[0].lang,'en-SG')
})
