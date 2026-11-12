import { z } from 'zod'
import { componentSpecSchema, componentRefSchema, illustrationSchema, type ComponentSpec } from '../../src/engine/components.ts'
import { sourceBundleSchema, type SourceBundle } from '../../src/engine/generation.ts'
import { codexStructured } from '../codex.ts'
import { engineContract, runtimeDeclarations } from '../generation/validator.ts'
import { canonicalCapability } from '../generation/discovery.ts'
import { reusableComponents, loadForReuse, saveCandidate, validateComponent, registryRoot, readComponent } from './registry.ts'
import { componentAuthorInstructions } from './prompts.ts'
import { sceneSchema } from '../../src/engine/scene.ts'

export const componentGenerationRequest=z.object({spec:componentSpecSchema,request:z.string().min(1).max(2000),revise:componentRefSchema.optional()}).strict()
export const componentMechanicOutput=sourceBundleSchema.omit({linkedComponents:true}).extend({scene:z.object({instruction:sceneSchema.shape.instruction,parameters:sceneSchema.shape.parameters,entities:z.array(sceneSchema.shape.entities.element.required()).min(1).max(8)}).strict()}).required()
export type ComponentAuthor=(spec:ComponentSpec,request:string,previous:unknown,diagnostics:string[])=>Promise<unknown>
export const codexComponentAuthor:ComponentAuthor=(spec,request,previous,diagnostics)=>codexStructured<unknown>(['visual','asset'].includes(spec.type)?illustrationSchema:componentMechanicOutput,`${componentAuthorInstructions}\nContract:\n${engineContract}\nRuntime declarations:\n${runtimeDeclarations}\nInput:${JSON.stringify({spec,request,previous,diagnostics})}`)
export function matchesComponent(record:import('../../src/engine/components.ts').ComponentRecord,spec:ComponentSpec){
  const expected=['visual','asset'].includes(spec.type)?'careplay-svg-v1':'careplay-mechanic-v1'
  return record.interface===expected&&spec.capabilities.map(canonicalCapability).every(cap=>record.capabilities.map(canonicalCapability).includes(cap))&&spec.interactions.every(i=>record.interactions.includes(i))&&spec.parameters.every(p=>record.parameters.some(available=>available.key===p.key&&typeof available.default===typeof p.default))
}

export async function generateComponent(input:unknown,author:ComponentAuthor=codexComponentAuthor,root=registryRoot(),maxAttempts:1|2|3=3,onAttempt?:(attempt:number)=>void){
  const {spec,request,revise}=componentGenerationRequest.parse(input)
  for(const record of (revise?[]:await reusableComponents(root)).sort((a,b)=>Number(b.status==='approved')-Number(a.status==='approved'))){
    if(!matchesComponent(record,spec))continue
    // A previous candidate is not authority: run its exact source/tests in Docker again.
    try{await loadForReuse(record,root);return {record,reused:true,attempts:0}}catch{continue}
  }
  let previous:unknown=null,diagnostics:string[]=[],frozenTests:string|undefined
  if(revise){
    const original=await readComponent(revise,root)
    if(original.record.id!==spec.id||original.record.type!==spec.type)throw Error('Revision must preserve component ID and type.')
    previous='mechanic'in original.payload?original.payload.mechanic:original.payload.visual
    if('mechanic'in original.payload&&original.record.evidence)frozenTests=original.payload.mechanic.tests
  }
  const attempts=[]
  let authorAttempts=0
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    authorAttempts=attempt;onAttempt?.(attempt)
    previous=await author(spec,request,previous,diagnostics)
    let payload
    try{
      if(['visual','asset'].includes(spec.type))payload={visual:illustrationSchema.parse(previous)}
      else{
        let mechanic=componentMechanicOutput.parse(previous) as SourceBundle
        if(frozenTests)mechanic={...mechanic,tests:frozenTests}
        payload={mechanic};previous=mechanic
      }
    }catch{diagnostics=['Output did not match the bounded component contract.'];continue}
    const record=await saveCandidate(spec,payload,{origin:author===codexComponentAuthor?'codex':'developer',request,license:'Project-generated; developer review required'},root)
    const checked=await validateComponent(record,root);attempts.push({id:record.id,version:record.version,hash:record.hash,result:checked.result.status==='passed'?{status:'passed',testCount:checked.record.evidence?.testCount,checks:checked.record.evidence?.checks}:checked.result})
    if(checked.result.status==='passed')return {record:checked.record,reused:false,attempts:attempt,validationAttempts:attempts}
    if('mechanic'in payload&&checked.result.status==='failed'&&['tests','runtime'].includes(checked.result.phase??''))frozenTests=payload.mechanic.tests
    diagnostics=checked.result.status==='failed'?checked.result.diagnostics:['Docker validation unavailable. No execution or promotion occurred.']
    if(checked.result.status==='unavailable')break
  }
  return {record:null,reused:false,attempts:authorAttempts,diagnostics,validationAttempts:attempts}
}
