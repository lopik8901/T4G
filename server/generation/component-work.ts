import type { ComponentRecord } from '../../src/engine/components.ts'
import type { GenerationPlan, ComponentWork } from '../../src/engine/generation.ts'
import type { ComponentRequirement } from '../../src/engine/design.ts'
import { generateComponent, matchesComponent, type ComponentAuthor } from '../components/generate.ts'
import { reusableComponents, loadForReuse, registryRoot } from '../components/registry.ts'
import { canonicalCapability, discoverComponents } from './discovery.ts'
import { generationFailureMessage } from './errors.ts'
import { trustedRuntimeHash } from './docker.ts'

type Services={list:()=>Promise<ComponentRecord[]>;generate:typeof generateComponent;load:typeof loadForReuse}
const pin=(r:ComponentRecord)=>({id:r.id,version:r.version,hash:r.hash})
const validated=(r:ComponentRecord)=>['validated','approved'].includes(r.status)&&r.evidence?.validatedHash===r.hash&&r.evidence.runtimeHash===trustedRuntimeHash
export function mergeRequirements(design:ComponentRequirement[],planned:ComponentRequirement[]=[]){
  const byId=new Map(design.map(r=>[r.id,r]))
  for(const r of planned){
    const original=byId.get(r.id)
    if(!original)byId.set(r.id,r)
    else if(original.kind===r.kind)byId.set(r.id,{...original,capabilities:[...new Set([...original.capabilities,...r.capabilities])],minimumQuality:Math.max(original.minimumQuality,r.minimumQuality)})
  }
  return [...byId.values()]
}
/** Deterministic bounded orchestration. Planner proposes reusable work, never executable dependencies. */
export async function prepareComponents(plan:GenerationPlan,requirements:ComponentRequirement[],update:(stage:string)=>void,root=registryRoot(),author?:ComponentAuthor,services?:Services){
  const io=services??{list:()=>reusableComponents(root),generate:generateComponent,load:loadForReuse}
  const work:ComponentWork[]=[],seen=new Set<string>(),attemptedMissing=new Set<string>(),blocked=new Set<string>()
  for(const task of (plan.componentTasks??[]).slice(0,2)){
    const row:ComponentWork={requirementId:task.requirementId,specId:task.spec.id,capabilities:task.spec.capabilities,status:'skipped',generatorInvoked:false,authorAttempts:0,reason:'',diagnostics:[]}
    const requirement=requirements.find(r=>r.id===task.requirementId)
    const caps=task.spec.capabilities.map(canonicalCapability)
    const key=[['visual','asset'].includes(task.spec.type)?'visual':'mechanic',...caps.slice().sort()].join(':')
    const visual=['visual','asset'].includes(task.spec.type)
    if(!requirement||!caps.every(cap=>requirement.capabilities.map(canonicalCapability).includes(cap))||requirement.kind==='input'||visual!==(requirement.kind==='visual')||(!visual&&!task.spec.parameters.length)||requirement.minimumQuality>4){
      row.reason='Planner task does not match the declared reusable requirement/interface.';work.push(row);continue
    }
    if(seen.has(key)){row.reason='This capability was already attempted in this request.';work.push(row);continue}
    seen.add(key)
    let loadingHash:string|undefined
    try{
      const current=(await io.list()).filter(validated) // Recheck immediately before each generation, not a stale pipeline snapshot.
      const compatible=current.filter(r=>matchesComponent(r,task.spec))
      const existing=compatible.find(r=>r.status==='approved')??compatible[0]
      if(existing){
        loadingHash=existing.hash
        await io.load(existing,root)
        row.status='reused';row.component=pin(existing);row.reason='Compatible exact version revalidated; Component Generator was not called.'
      }else{
        const lookup=discoverComponents([{...requirement,capabilities:task.spec.capabilities}],undefined,compatible)[0]
        if(!lookup.missingCapabilities?.length)row.reason='Trusted SDK, artwork or compatible composition already supplies this capability.'
        else if(lookup.missingCapabilities.some(cap=>attemptedMissing.has(cap)))row.reason='An overlapping missing capability was already attempted; compose the available result or author safe glue.'
        else{
          lookup.missingCapabilities.forEach(cap=>attemptedMissing.add(cap))
          update(`Creating reusable ${visual?'artwork':'behavior'}: ${task.spec.name}`)
          row.generatorInvoked=true
          const result=await io.generate({spec:task.spec,request:task.request},author,root,2,attempt=>{row.authorAttempts=attempt})
          row.authorAttempts=result.attempts
          if(!result.record){row.status='failed';row.reason='Component validation failed; safe local behavior may be authored instead.';row.diagnostics=result.diagnostics??[]}
          else{
            if(!validated(result.record))throw Error('Component Generator returned an unvalidated or incompatible version.')
            loadingHash=result.record.hash
            await io.load(result.record,root) // Do not trust an author/result object or registry state alone.
            row.status=result.reused?'reused':'generated';row.component=pin(result.record);row.reason='Exact component version validated, stored and revalidated for isolated linking.'
          }
        }
      }
    }catch(error){if(loadingHash)blocked.add(loadingHash);row.status='failed';row.reason='Component preparation failed; no unvalidated source was linked.';row.diagnostics=[generationFailureMessage(error)]}
    work.push(row)
    // Do not spend more component allowance after a provider quota/authentication/timeout failure.
    if(row.diagnostics.some(d=>/usage limit|sign in|too long|quota/i.test(d)))break
  }
  const records=(await io.list()).filter(r=>validated(r)&&!blocked.has(r.hash))
  const discovery=requirements.map(r=>{
    const relevant=(plan.componentTasks??[]).filter(t=>t.requirementId===r.id)
    const compatible=records.filter(record=>relevant.every(t=>!t.spec.capabilities.some(c=>record.capabilities.map(canonicalCapability).includes(canonicalCapability(c)))||matchesComponent(record,t.spec)))
    return discoverComponents([r],undefined,compatible)[0]
  })
  return {work,records,discovery}
}
