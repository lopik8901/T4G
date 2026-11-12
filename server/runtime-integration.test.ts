import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {authorProposal} from './generation/pipeline.ts'
import {getSandboxStatus} from './generation/docker.ts'
import {templateGame} from '../src/studio/config.ts'

test('real Docker repair retains compiled test assertions even if the author returns weaker tests',{skip:process.env.CAREPLAY_TEST_DOCKER!=='true'},async()=>{
  assert.equal((await getSandboxStatus()).available,true)
  const root=await mkdtemp(join(tmpdir(),'careplay-frozen-tests-'))
  const source=(ready:boolean)=>`import type {MechanicFactory} from './contract';export const createMechanic:MechanicFactory=()=>({setup(c){c.state.ready=${ready}},update(){},dispose(){}});`
  const tests=`import {createMechanic} from './mechanic';import {createGameContext} from './runtime';import type {MechanicTest} from './contract';export const tests:MechanicTest[]=Array.from({length:3},(_,i)=>({name:'Ready '+i,run(){const c=createGameContext({entities:[]});createMechanic({}).setup(c);if(c.state.ready!==true)throw Error('setup must set ready');}}));`
  let calls=0
  try {
    const result=await authorProposal('Test retained assertions',templateGame('garden'),root,{
      plan:async()=>({task:'code_generation',summary:'Trusted fixture, not AI evidence',reuse:[],missing:['test'],components:[],acceptance:['Assertions remain intact.']}),
      code:async()=>({name:'Trusted fixture',description:'Test pipeline only',source:source(++calls>1),tests:calls===1?tests:tests.replace("if(c.state.ready!==true)throw Error('setup must set ready');",''),assetRequests:[],scene:{instruction:'Fixture',parameters:[],entities:[{id:'circle',kind:'circle',x:.5,y:.5,radius:.06,appearance:'circle',color:'#88bb99',state:[]}]}}),
    },()=>{})
    assert.equal(result.report.status,'preview_ready');assert.equal(result.report.attempts,2);assert.equal(result.bundle.tests,tests)
  } finally {await rm(root,{recursive:true,force:true})}
})
