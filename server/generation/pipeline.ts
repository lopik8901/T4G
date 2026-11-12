import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { GameConfig } from '../../src/studio/config.ts'
import { componentRegistry } from '../../src/engine/registry.ts'
import { planSchema, sourceBundleSchema, type GenerationPlan, type SourceBundle, type GenerationReport } from '../../src/engine/generation.ts'
import { codexStructured } from '../codex.ts'
import { engineContract, staticValidate, runtimeSource, runtimeDeclarations, missingComponentImports } from './validator.ts'
import { sandboxAvailability, mayPreview } from './sandbox.ts'
import { validateInDocker, getSandboxStatus } from './docker.ts'
import { saveArtifact, loadPreviousBundle } from './artifacts.ts'
import { generationFailureMessage } from './errors.ts'
import { designSchema, lifecycleSchema, requirementSchema, type GameDesignSpec, type VisualSpec } from '../../src/engine/design.ts'
import { sceneSchema } from '../../src/engine/scene.ts'
import { discoverComponents, selectVisuals, type DiscoveryReport } from './discovery.ts'
import { reviewGame, reviewRequestedCounts, reviewPlan } from './quality.ts'
import { gameDesignerInstructions, plannerInstructions, mechanicsInstructions } from './prompts.ts'
import {requiresNewDesign} from './simple-edit.ts'
import { reusableComponents, loadForReuse, registryRoot } from '../components/registry.ts'
import type { ComponentRecord } from '../../src/engine/components.ts'
import type { ComponentAuthor } from '../components/generate.ts'
import type { ComponentWork } from '../../src/engine/generation.ts'
import { prepareComponents, mergeRequirements } from './component-work.ts'

export type JobSnapshot = { id: string; stage: string; status: 'running' | 'complete' | 'failed'; report?: GenerationReport; error?: string }
export type AuthoringContext = {design:GameDesignSpec;discovery:DiscoveryReport;visual:VisualSpec;componentWork?:ComponentWork[];components?:{id:string;version:number;hash:string;importPath:string;parameters:ComponentRecord['parameters'];description:string;source:string}[]}
export interface AuthoringProvider {
  design?(request:string,config:GameConfig):Promise<GameDesignSpec>
  plan(request: string, config: GameConfig, design?:GameDesignSpec, discovery?:DiscoveryReport, persisted?:ComponentRecord[]): Promise<GenerationPlan>
  code(request: string, plan: GenerationPlan, previous: SourceBundle | null, diagnostics: string[], context?:AuthoringContext): Promise<SourceBundle>
}
const authorSceneSchema=z.object({instruction:sceneSchema.shape.instruction,parameters:sceneSchema.shape.parameters,entities:z.array(sceneSchema.shape.entities.element.required()).min(1).max(48)}).strict()
export const codexAuthor: AuthoringProvider = {
  design:async(request,config)=>{
    let feedback:string[]=[]
    for(let attempt=0;attempt<2;attempt++){
      const result=await codexStructured(designSchema.extend({lifecycle:lifecycleSchema.required({layout:true})}),`${gameDesignerInstructions}\nInputs:${JSON.stringify({request,config,feedback})}`)
      feedback=reviewRequestedCounts(request,result)
      if(!feedback.length)return {...result,requirements:result.requirements.map(r=>({...r,minimumQuality:Math.max(r.minimumQuality,r.kind==='visual'?4:3)})),lifecycle:{...result.lifecycle,objective:result.objective}}
    }
    throw Error('The game design did not preserve the requested round and object counts.')
  },
  plan:async(request,config,design,discovery,persisted=[])=>{
    let feedback:string[]=[]
    for(let attempt=0;attempt<2;attempt++){
      try{
        const result=await codexStructured(planSchema.required({componentTasks:true,localBehavior:true}).extend({requirements:z.array(requirementSchema).min(1).max(10)}),`${plannerInstructions}\nInput:${JSON.stringify({request,config,design,discovery,feedback,registry:componentRegistry,persistentRegistry:persisted.map(({id,version,hash,type,description,capabilities,interactions,parameters,interface:contract})=>({id,version,hash,type,description,capabilities,interactions,parameters,interface:contract}))})}`)
        feedback=reviewPlan(result);if(!feedback.length)return result
      }catch(error){if(!(error instanceof z.ZodError))throw error;feedback=[generationFailureMessage(error)]}
    }
    throw Error('The technical planner did not produce complete requirements and acceptance checks.')
  },
  code:(request,plan,previous,diagnostics,context)=>codexStructured(sourceBundleSchema.omit({linkedComponents:true}).extend({scene:authorSceneSchema}),`${mechanicsInstructions}\nContract:\n${engineContract}\nTrusted runtime declarations:\n${runtimeDeclarations}\nInputs:${JSON.stringify({request,plan,context,previous,diagnostics})}`),
}
export async function authorProposal(request: string, config: GameConfig, root: string, author: AuthoringProvider, update: (stage: string) => void, previous: SourceBundle | null = null, acceptance?: 'butterfly' | 'circles', componentOptions:{root?:string;author?:ComponentAuthor}={}): Promise<{ report: GenerationReport; bundle: SourceBundle }> {
  const id = randomUUID(), folder = join(root, id)
  await mkdir(folder, { recursive: true })
  const capture = async <T>(stage: string, operation: () => Promise<T>): Promise<T> => {
    try { return await operation() } catch (error) {
      await writeFile(join(folder, 'failure.json'), JSON.stringify({ stage, error: generationFailureMessage(error) }, null, 2)).catch(() => {})
      throw error
    }
  }
  let design:GameDesignSpec|undefined, visual:VisualSpec|undefined, discovery:DiscoveryReport=[]
  const componentRoot=componentOptions.root??registryRoot()
  let persisted=await reusableComponents(componentRoot)
  let componentWork:ComponentWork[]=[]
  const linkedComponents:NonNullable<SourceBundle['linkedComponents']>=[]
  const registeredVisuals:NonNullable<NonNullable<SourceBundle['scene']>['registeredVisuals']>=[]
  const selectedRecords:ComponentRecord[]=[]
  if(author.design){
    const retained=previous&&config.experimental?.design&&!requiresNewDesign(request)?config.experimental.design:undefined
    update(retained?'Preserving the current design while planning your mechanic edit':'Designing the objective, accessible gameplay loop and replay')
    design=retained?{...retained,title:config.name,theme:config.theme,accessibility:{...retained.accessibility,players:config.players}}:designSchema.parse(await capture('design',()=>author.design!(request,config)))
    design={...design,requirements:design.requirements.map(r=>({...r,minimumQuality:Math.max(r.minimumQuality,r.kind==='visual'?4:3)}))}
    await writeFile(join(folder,'design.json'),JSON.stringify(design,null,2))
    update('Discovering trusted components and evaluating approved external references')
    discovery=discoverComponents(design.requirements,undefined,persisted)
  }
  update('Planning reusable mechanics, lifecycle and acceptance checks')
  const plan = await capture('planning', async () => planSchema.parse(await author.plan(request, config,design,discovery,persisted)))
  await writeFile(join(folder,'plan.json'),JSON.stringify(plan,null,2))
  if(design){
    const requirements=mergeRequirements(design.requirements,plan.requirements)
    discovery=discoverComponents(requirements,undefined,persisted)
    await writeFile(join(folder,'discovery-before-components.json'),JSON.stringify(discovery,null,2))
    const prepared=await prepareComponents(plan,requirements,update,componentRoot,componentOptions.author)
    persisted=prepared.records;discovery=prepared.discovery;componentWork=prepared.work
    visual=selectVisuals(design)
    const selected=new Set(discovery.flatMap(d=>d.selectedComponents??[]))
    for(const record of persisted.filter(r=>selected.has(`component:${r.id}@${r.version}`)).slice(0,6)){
      update(`Revalidating reusable component ${record.name} v${record.version}`)
      let loaded:Awaited<ReturnType<typeof loadForReuse>>
      try{loaded=await loadForReuse(record,componentRoot)}catch(error){
        componentWork.push({requirementId:'link-validation',specId:record.id,capabilities:record.capabilities,status:'failed',generatorInvoked:false,authorAttempts:0,reason:'Component failed final linking validation; author safe local behavior instead.',diagnostics:[generationFailureMessage(error)]})
        persisted=persisted.filter(r=>r.hash!==record.hash)
        discovery=discoverComponents(requirements,undefined,persisted)
        continue
      }
      const {payload}=loaded
      selectedRecords.push(record)
      if('mechanic'in payload)linkedComponents.push({id:record.id,version:record.version,hash:record.hash,source:payload.mechanic.source})
      else if(registeredVisuals.length<4){
        const assetId=`component-${record.hash}`
        registeredVisuals.push({assetId,definition:payload.visual});visual.assets.push({id:assetId,purpose:record.description.slice(0,120)})
      }
    }
    await Promise.all([writeFile(join(folder,'discovery.json'),JSON.stringify(discovery,null,2)),writeFile(join(folder,'visual.json'),JSON.stringify(visual,null,2)),writeFile(join(folder,'component-generation.json'),JSON.stringify(componentWork,null,2))])
  }
  let bundle: SourceBundle | null = previous, diagnostics: string[] = [], attempts = 0
  let frozenTests:string|undefined, quality:ReturnType<typeof reviewGame>|undefined
  let isolated: Awaited<ReturnType<typeof validateInDocker>> | null = null
  do {
    isolated=null
    update(attempts ? `Repairing the draft after validation feedback (attempt ${attempts + 1}/3)` : 'Drafting the missing behavior and tests')
    bundle = await capture('authoring', async () => sourceBundleSchema.parse(await author.code(request, plan, bundle, diagnostics,design&&visual?{design,visual,discovery,componentWork,components:selectedRecords.filter(r=>r.interface==='careplay-mechanic-v1').map(r=>({id:r.id,version:r.version,hash:r.hash,importPath:`./component-${r.hash}`,parameters:r.parameters,description:r.description,source:linkedComponents.find(c=>c.hash===r.hash)!.source}))}:undefined)))
    // The model cannot choose source/dependency versions or attach arbitrary art definitions.
    bundle={...bundle,linkedComponents}
    if(frozenTests)bundle={...bundle,tests:frozenTests}
    if(design&&visual&&bundle.scene)bundle={...bundle,name:design.title,scene:{...bundle.scene,registeredVisuals,instruction:design.objective,lifecycle:design.lifecycle,visual,interaction:design.interaction,accessibility:{maximumSpeed:design.accessibility.maximumSpeed,minimumTargetRadius:design.accessibility.minimumTargetRadius}}}
    attempts++
    await writeFile(join(folder, 'mechanic.ts'), bundle.source)
    await writeFile(join(folder, 'tests.ts'), bundle.tests)
    await writeFile(join(folder, 'contract.ts'), engineContract)
    const availability = await getSandboxStatus()
    update(availability.available ? 'Building and checking TypeScript inside the restricted container' : 'Checking draft TypeScript only; isolated execution is unavailable')
    // With a configured validator even compilation belongs inside its resource boundary.
    // The historical static-only fallback never executes the generated modules.
    quality=design&&visual?reviewGame(design,visual,bundle,persisted):undefined
    diagnostics=quality?.issues.length?quality.issues:availability.available?[]:staticValidate(bundle)
    diagnostics.push(...missingComponentImports(bundle.source,linkedComponents))
    if (!diagnostics.length) {
      update('Checking isolated build environment and running generated tests when available')
      isolated = await validateInDocker(bundle, acceptance)
      if (isolated.status === 'failed')diagnostics=isolated.diagnostics
      if(isolated.status==='passed'||isolated.status==='failed'&&['tests','runtime'].includes(isolated.phase??''))frozenTests=bundle.tests
    }
    await writeFile(join(folder, `attempt-${attempts}.json`), JSON.stringify({bundle,diagnostics,validation:isolated?{status:isolated.status,...(isolated.status==='failed'?{phase:isolated.phase}:{} )}:null},null,2))
  } while (diagnostics.length && attempts < 3)
  const sourceHash = createHash('sha256').update(JSON.stringify({ source: bundle.source, tests: bundle.tests, linkedComponents, contract: engineContract, scene: bundle.scene, design:design??null, runtime:runtimeSource+runtimeDeclarations })).digest('hex')
  const ready = isolated?.status === 'passed' && mayPreview({sourceHash, isolated:true, typecheckPassed:!diagnostics.length, testsPassed:true, runtimePassed:true, trackingLossPassed:isolated.runtimeChecks.includes('tracking-loss-no-crash'), artifactHash:isolated.artifactHash}, sourceHash)
  const report: GenerationReport = { id, componentWork, status: diagnostics.length ? isolated?.status === 'failed' ? 'runtime_failed' : 'static_failed' : ready ? 'preview_ready' : 'awaiting_isolation', name: bundle.name, summary: diagnostics.length ? 'Validation failed after bounded repairs. Your previous activity is preserved.' : ready ? 'Your new activity is ready to try. Preview its instructions, progress and replay before residents play.' : isolated?.status === 'unavailable' ? isolated.reason : sandboxAvailability.reason, sourceHash, plan, diagnostics, attempts, testsExecuted: ready, previewAvailable: ready, developerApproved: false, ...(design?{design,visual,discovery,quality}:{}) }
  if (ready && isolated?.status === 'passed' && bundle.scene) {
    report.artifactHash = isolated.artifactHash
    report.validation = { imageId: isolated.imageId, testCount: isolated.testCount, runtimeChecks: isolated.runtimeChecks }
    await saveArtifact(folder, { id, name: bundle.name, sourceHash, artifactHash: isolated.artifactHash, scene: bundle.scene, ...(design?{design}:{}) }, isolated.browserBundle)
  }
  await writeFile(join(folder, 'proposal.json'), JSON.stringify({ report, bundle }, null, 2))
  return { report, bundle }
}

const jobs = new Map<string, JobSnapshot>()
const bundles = new Map<string, SourceBundle>()
export function getJob(id: string) { return jobs.get(id) }
export function getBundle(id: string) { return bundles.get(id) }
export function startGeneration(request: string, config: GameConfig) {
  if ([...jobs.values()].some(j => j.status === 'running')) throw new Error('Another activity draft is being prepared. Please wait for it to finish.')
  const trackingId = randomUUID()
  if (jobs.size >= 50) { const oldest = jobs.keys().next().value; if (oldest) { jobs.delete(oldest); bundles.delete(oldest) } }
  jobs.set(trackingId, { id: trackingId, stage: 'Planning new mechanics', status: 'running' })
  void (async () => {
    const previous = config.experimental ? await loadPreviousBundle(config.experimental.id) : null
    return authorProposal(request, config, join(process.cwd(), '.careplay', 'proposals'), codexAuthor, stage => jobs.set(trackingId, { id: trackingId, stage, status: 'running' }), previous)
  })().then(({ report, bundle }) => {
    bundles.set(trackingId, bundle); jobs.set(trackingId, { id: trackingId, stage: report.previewAvailable ? 'Experimental preview ready' : 'Developer draft prepared; not playable', status: 'complete', report })
  }).catch(error => jobs.set(trackingId, { id: trackingId, stage: 'Draft creation failed', status: 'failed', error: `${generationFailureMessage(error)} Your current activity is unchanged.` }))
  return trackingId
}


