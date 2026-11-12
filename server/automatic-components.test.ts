import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepareComponents, mergeRequirements } from './generation/component-work.ts'
import { componentRecordSchema } from '../src/engine/components.ts'
import type { GenerationPlan } from '../src/engine/generation.ts'
import type { ComponentRequirement } from '../src/engine/design.ts'
import { trustedRuntimeHash } from './generation/docker.ts'
import { missingComponentImports } from './generation/validator.ts'
import { discoverComponents } from './generation/discovery.ts'
import { reviewPlan } from './generation/quality.ts'

// Deterministic orchestration fixtures only. No assertion below represents live AI or execution evidence.
const spec={id:'generic-dwell',name:'Generic dwell',description:'Select by sustained palm contact',type:'interaction' as const,capabilities:['dwell-selection'],interactions:['hand-contact'],parameters:[{key:'targetKind',description:'Kind to select',default:'token'},{key:'dwellSeconds',description:'Contact duration',default:1.2}]}
const requirement:ComponentRequirement={id:'dwell-needed',kind:'mechanic',description:'Sustained contact',capabilities:['dwell-selection'],minimumQuality:3}
const task={requirementId:requirement.id,spec,request:'Generic dwell by targetKind, duration parameter, reset on loss.',rationale:'Useful with different entity kinds and games.'}
const plan:GenerationPlan={task:'code_generation',summary:'Fixture',reuse:[],missing:['dwell-selection'],components:[],acceptance:['Dwell selects.'],componentTasks:[task],localBehavior:['Increment game progress once per completion.']}
const record=(version=1)=>componentRecordSchema.parse({...spec,version,hash:String(version).repeat(64),createdAt:new Date().toISOString(),interface:'careplay-mechanic-v1',inputs:['context'],outputs:['state.completed'],dependencies:[],provenance:{origin:'developer',request:'MOCK fixture',license:'Test only'},runtime:'careplay-worker-v1',status:'validated',evidence:{validatedHash:String(version).repeat(64),runtimeHash:trustedRuntimeHash,imageId:'MOCK',testCount:5,checks:['MOCK'],validatedAt:new Date().toISOString()},review:null})
const visual={palette:{primary:'#ABCDEF',secondary:'#ABCDEF',accent:'#ABCDEF',outline:'#ABCDEF'},shapes:[{shape:'ellipse' as const,x:50,y:50,width:50,height:50,fill:'primary' as const,stroke:'none' as const,strokeWidth:0}],states:{idle:1,selected:1,completed:1,disabled:.5},animation:'none' as const}
test('automatic component preparation generates once, refreshes discovery and reuses exact pins in the next request',async()=>{
  let records:ReturnType<typeof record>[]=[],calls=0,loads=0
  const io={list:async()=>records,generate:async()=>{calls++;const r=record();records=[r];return {record:r,reused:false,attempts:1}},load:async()=>{loads++;return {record:records[0],payload:{visual}}}}
  const a=await prepareComponents(plan,[requirement],()=>{},'unused',undefined,io)
  assert.equal(a.work[0].status,'generated');assert.equal(a.discovery[0].selected,'component:generic-dwell@1');assert.equal(calls,1);assert.equal(loads,1)
  const b=await prepareComponents({...plan,componentTasks:[{...task,spec:{...spec,id:'dwell-for-fish'}}]},[requirement],()=>{},'unused',undefined,io)
  assert.equal(b.work[0].status,'reused');assert.equal(b.work[0].generatorInvoked,false);assert.equal(calls,1);assert.deepEqual(b.work[0].component,a.work[0].component)
})
test('failed or duplicate component work falls back without linking unvalidated source',async()=>{
  let calls=0
  const io={list:async()=>[],generate:async()=>{calls++;return {record:null,reused:false,attempts:2,diagnostics:['Generated behavior assertion failed.'],validationAttempts:[]}},load:async()=>{throw Error('Must not load failed output')}}
  const result=await prepareComponents({...plan,componentTasks:[task,{...task,spec:{...spec,id:'same-capability'}}]},[requirement],()=>{},'unused',undefined,io)
  assert.equal(calls,1);assert.equal(result.work[0].status,'failed');assert.equal(result.work[1].status,'skipped');assert.equal(result.records.length,0);assert.equal(result.discovery[0].decision,'generate')
  const candidate={...record(),status:'candidate' as const,evidence:null}
  const bad=await prepareComponents(plan,[requirement],()=>{},'unused',undefined,{...io,list:async()=>[candidate],generate:async()=>({record:candidate,reused:false,attempts:1})})
  assert.equal(bad.work[0].status,'failed');assert.equal(bad.records.length,0)
})
test('preparation rejects incompatible parameters, skips built-ins and never repeats quota failures',async()=>{
  const incompatible={...record(),parameters:[]};let generated=0
  const io={list:async()=>[incompatible],generate:async()=>{generated++;throw Error('Your Codex usage limit has been reached. Please try again later.')},load:async()=>{throw Error('Incompatible component must not load')}}
  const result=await prepareComponents({...plan,componentTasks:[task,task]},[requirement],()=>{},'unused',undefined,io)
  assert.equal(generated,1);assert.equal(result.work.length,1);assert.equal(result.work[0].status,'failed');assert.equal(result.discovery[0].decision,'generate')
  const sdkTask={...task,spec:{...spec,capabilities:['follow-hand']}}
  const sdk=await prepareComponents({...plan,componentTasks:[sdkTask]},[{...requirement,capabilities:['follow-hand']}],()=>{},'unused',undefined,io)
  assert.equal(sdk.work[0].status,'skipped');assert.equal(generated,1)
})
test('visual tasks use the existing component generator; undeclared tasks and missing module imports fail closed',async()=>{
  let calls=0
  const r={...record(),type:'visual' as const,interface:'careplay-svg-v1' as const,capabilities:['gentle-cloud-art'],parameters:[],interactions:[]}
  const io={list:async()=>calls?[r]:[],generate:async()=>{calls++;return {record:r,reused:false,attempts:1}},load:async()=>({record:r,payload:{visual}})}
  const t={...task,spec:{...spec,type:'visual' as const,capabilities:['gentle-cloud-art'],parameters:[]}}
  const result=await prepareComponents({...plan,componentTasks:[t]},[{...requirement,kind:'visual',capabilities:['gentle-cloud-art']}],()=>{},'unused',undefined,io)
  assert.equal(result.work[0].status,'generated')
  const no=await prepareComponents({...plan,componentTasks:[{...t,requirementId:'undeclared'}]},[requirement],()=>{},'unused',undefined,io)
  assert.equal(no.work[0].status,'skipped');assert.equal(calls,1)
  const linked=[{id:spec.id,version:1,hash:'1'.repeat(64),source:'mock source only'}]
  assert.equal(missingComponentImports(`// import './component-${linked[0].hash}'`,linked).length,1)
  assert.equal(missingComponentImports(`import type {createMechanic} from './component-${linked[0].hash}'`,linked).length,1)
  assert.equal(missingComponentImports(`export {createMechanic} from './component-${linked[0].hash}'`,linked).length,0)
})
test('planner refinements retain original requirements and distinguish missing behavior from available artwork',()=>{
  const merged=mergeRequirements([requirement],[{...requirement,capabilities:['dwell-selection','dwell-feedback'],minimumQuality:2}])
  assert.deepEqual(merged[0].capabilities,['dwell-selection','dwell-feedback']);assert.equal(merged[0].minimumQuality,3)
  const art=discoverComponents([{...requirement,kind:'visual',capabilities:['flower-art','2d-illustrations','labels','generous-overlap','static-layout'],minimumQuality:4}])[0]
  assert.ok(!art.missingCapabilities?.includes('flower-art'));assert.ok(art.missingCapabilities?.includes('static-layout'))
  const existing={...record(),capabilities:['dwell-selection','overlap','tracking-loss-reset']}
  const reuse=discoverComponents([{...requirement,capabilities:['sustained-contact-selection','overlap','palm-continuity','tracking-loss-detection']}],undefined,[existing])[0]
  assert.ok(reuse.selectedComponents?.includes('component:generic-dwell@1'))
  assert.equal(reviewPlan({...plan,requirements:[],acceptance:['Requires correction.']}).length,2)
})
