import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateComponent } from './components/generate.ts'
import { readComponent, reusableComponents } from './components/registry.ts'
import { loadPreviousBundle } from './generation/artifacts.ts'
import { validateInDocker } from './generation/docker.ts'
import { authorProposal } from './generation/pipeline.ts'
import { templateGame } from '../src/studio/config.ts'
import { readFile } from 'node:fs/promises'

test('component repair freezes compiled assertions inside real Docker',{skip:process.env.CAREPLAY_TEST_DOCKER!=='true'},async()=>{
  const root=await mkdtemp(join(tmpdir(),'careplay-component-repair-'))
  const tests=`import type {MechanicTest} from './contract';import {createMechanic} from './mechanic';import {createGameContext} from './runtime';export const tests:MechanicTest[]=Array.from({length:5},(_,i)=>({name:'Keep original assertion '+i,run(){const c=createGameContext({entities:[]});createMechanic({}).setup(c);if(c.state.ready!==true)throw Error('Must be ready');}}));`
  let calls=0
  try{
    const result=await generateComponent({spec:{id:'test-ready',name:'Fixture',description:'Trusted assertion-freeze fixture, not AI evidence',type:'mechanic',capabilities:['setup-ready'],interactions:[],parameters:[]},request:'Trusted test only'},async()=>({name:'Fixture',description:'Fixture',source:`import type {MechanicFactory} from './contract';export const createMechanic:MechanicFactory=()=>({setup(c){c.state.ready=${++calls>1}},update(){},dispose(c){delete c.state.ready}});`,tests:calls===1?tests:tests.replace("if(c.state.ready!==true)throw Error('Must be ready');",''),assetRequests:[],scene:{instruction:'Fixture',parameters:[],entities:[{id:'token',kind:'token',x:.5,y:.5,radius:.08,appearance:'circle',color:'#88AA99',state:[],assetId:'bubble-pearl',label:''}]}}),root)
    assert.equal(result.attempts,2);assert.ok(result.record)
    const saved=await readComponent(result.record,root);assert.ok('mechanic'in saved.payload);assert.equal(saved.payload.mechanic.tests,tests)
  }finally{await rm(root,{recursive:true,force:true})}
})
for(const [name,id] of [['sorting','bd41536e-385c-4280-aa84-68da1c0f0a61'],['feeding','d08b4f49-52ee-4059-bbbe-08a6d5458410']])test(`existing real ${name} artifact retains full lifecycle in current Docker`,{skip:process.env.CAREPLAY_TEST_COMPLETE_ARTIFACTS!=='true'},async()=>{
  const result=await validateInDocker(await loadPreviousBundle(id))
  assert.equal(result.status,'passed',JSON.stringify(result.status==='failed'?result.diagnostics:result.status))
  if(result.status==='passed'){assert.ok(result.runtimeChecks.includes('full-design-lifecycle'));assert.ok(result.runtimeChecks.includes('replay-playable'))}
})
test('normal game orchestration pins discovered source and overwrites model dependency bytes',{skip:process.env.CAREPLAY_TEST_COMPONENTS!=='true'},async()=>{
  const record=(await reusableComponents()).find(r=>r.id==='autonomous-wandering');assert.ok(record)
  const {payload}=await readComponent(record);assert.ok('mechanic'in payload)
  const prior=JSON.parse(await readFile('.careplay/proposals/bd41536e-385c-4280-aa84-68da1c0f0a61/proposal.json','utf8')).report.design
  const root=await mkdtemp(join(tmpdir(),'careplay-component-link-'))
  try{
    const result=await authorProposal('Trusted linker smoke, not a model game benchmark',templateGame('garden'),root,{
      design:async()=>({...prior,title:'Component linker smoke',interaction:'custom',lifecycle:{...prior.lifecycle,mode:'open-ended',rounds:1},requirements:[{id:'wandering-needed',kind:'mechanic',description:'Reuse wandering',capabilities:['roaming'],minimumQuality:3}]}),
      plan:async()=>({task:'code_generation',summary:'Trusted linker fixture',reuse:[record.id],missing:[],components:[],acceptance:['Pinned component passes its existing tests.']}),
      code:async(_request,_plan,_previous,_diagnostics,context)=>{
        assert.equal(context?.components?.[0].hash,record.hash)
        const scene=structuredClone(payload.mechanic.scene!);scene.entities.forEach(e=>e.y=.45)
        return {...payload.mechanic,scene,source:`export {createMechanic} from '${context!.components![0].importPath}';`,linkedComponents:[{id:record.id,version:record.version,hash:record.hash,source:'throw new Error("model bytes must never win")'}]}
      },
    },()=>{})
    assert.equal(result.report.previewAvailable,true,JSON.stringify(result.report.diagnostics))
    assert.equal(result.bundle.linkedComponents?.[0].source,payload.mechanic.source)
  }finally{await rm(root,{recursive:true,force:true})}
})
test('component provider failure falls back to safe local authoring through real Docker',{skip:process.env.CAREPLAY_TEST_DOCKER!=='true'},async()=>{
  const root=await mkdtemp(join(tmpdir(),'careplay-component-fallback-'))
  const prior=JSON.parse(await readFile('.careplay/proposals/bd41536e-385c-4280-aa84-68da1c0f0a61/proposal.json','utf8')).report.design
  const requirement={id:'generic-fixture',kind:'mechanic' as const,description:'Fixture reusable behavior',capabilities:['fixture-generic-ready'],minimumQuality:3}
  let calls=0
  try{
    const result=await authorProposal('Trusted fallback fixture, not AI evidence',templateGame('garden'),join(root,'proposals'),{
      design:async()=>({...prior,title:'Fallback fixture',interaction:'custom',requirements:[requirement],lifecycle:{...prior.lifecycle,mode:'open-ended',rounds:1}}),
      plan:async()=>({task:'code_generation',summary:'Fixture',reuse:[],missing:requirement.capabilities,components:[],acceptance:['Local fallback passes.'],componentTasks:[{requirementId:requirement.id,spec:{id:'fixture-generic-ready',name:'Fixture',description:'Not AI evidence',type:'mechanic',capabilities:requirement.capabilities,interactions:[],parameters:[{key:'targetKind',description:'Kind',default:'token'}]},request:'Generic readiness fixture',rationale:'Reusable parameterized fixture behavior.'}]}),
      code:async(_r,_p,_previous,_diagnostics,context)=>{
        assert.equal(context?.componentWork?.[0].status,'failed');assert.equal(context?.componentWork?.[0].authorAttempts,1);assert.equal(context?.components?.length,0)
        return {name:'Fallback fixture',description:'Trusted fixture',source:`import type {MechanicFactory} from './contract';export const createMechanic:MechanicFactory=()=>({setup(c){c.state.ready=true},update(){},dispose(c){delete c.state.ready}});`,tests:`import type {MechanicTest} from './contract';import {createMechanic} from './mechanic';import {createGameContext} from './runtime';export const tests:MechanicTest[]=Array.from({length:3},(_,i)=>({name:'Readiness '+i,run(){const c=createGameContext({entities:[]});createMechanic({}).setup(c);if(c.state.ready!==true)throw Error('Not ready');}}));`,assetRequests:[],scene:{instruction:'Fixture',parameters:[],entities:[{id:'token',kind:'token',x:.5,y:.5,radius:.08,appearance:'circle',color:'#88AA99',state:[],assetId:'bubble-pearl',label:''}]}}
      },
    },()=>{},null,undefined,{root:join(root,'registry'),author:async()=>{calls++;throw Error('Your Codex usage limit has been reached. Please try again later.')}})
    assert.equal(calls,1);assert.equal(result.report.previewAvailable,true);assert.equal(result.bundle.linkedComponents?.length,0)
  }finally{await rm(root,{recursive:true,force:true})}
})
