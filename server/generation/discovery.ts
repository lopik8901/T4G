import { z } from 'zod'
import { componentRegistry } from '../../src/engine/registry.ts'
import type { ComponentRequirement, GameDesignSpec, VisualSpec } from '../../src/engine/design.ts'
import { assetIds, visualSchema, requirementSchema } from '../../src/engine/design.ts'
import type { ComponentRecord } from '../../src/engine/components.ts'

export type CatalogEntry = {id:string;origin:'careplay'|'external';kind:string;capabilities:readonly string[];quality:number;compatibility:'sdk'|'host'|'adapter-required';dependencies:string[];license:string;licenseVerified:boolean;maintenance:string;url:string;available:boolean;status?:'approved'|'validated'}
/** Developer-reviewed catalog, not an internet crawler or code-install permission. */
export const externalCatalog:readonly CatalogEntry[] = [
  {id:'phaser',origin:'external',kind:'renderer',capabilities:['scenes','tweens','physics','sprite-animation'],quality:4,compatibility:'adapter-required',dependencies:['Phaser browser renderer/game loop'],license:'MIT',licenseVerified:true,maintenance:'Active upstream; reviewed 2026-11-09',url:'https://github.com/phaserjs/phaser',available:false},
  {id:'pixijs',origin:'external',kind:'renderer',capabilities:['sprites','textures','filters','2d-rendering'],quality:4,compatibility:'adapter-required',dependencies:['PixiJS WebGL/WebGPU renderer'],license:'MIT',licenseVerified:true,maintenance:'Active upstream docs; reviewed 2026-11-09',url:'https://github.com/pixijs/pixijs',available:false},
  {id:'kenney-food-kit',origin:'external',kind:'visual',capabilities:['food-art','fruit-art','3d-assets'],quality:4,compatibility:'adapter-required',dependencies:['3D model loader or reviewed offline 2D conversion'],license:'CC0-1.0',licenseVerified:true,maintenance:'Pack revision 2.0 inspected 2026-11-09; recheck per imported file',url:'https://kenney.nl/assets/food-kit',available:false},
  {id:'roseblox',origin:'external',kind:'engine',capabilities:['entity-lifecycle','scene-management','asset-cache','3d-animation'],quality:4,compatibility:'adapter-required',dependencies:['Three.js','Rapier','Miniplex','camera-controls'],license:'MIT',licenseVerified:true,maintenance:'Public source inspected 2026-11-09',url:'https://github.com/rosebudai/roseblox',available:false},
  {id:'rosebud-cli',origin:'external',kind:'asset-provider',capabilities:['asset-generation','image-generation','asset-download'],quality:4,compatibility:'adapter-required',dependencies:['Node 22+','approved Rosebud login','model-specific credits and license'],license:'Apache-2.0 (CLI; model outputs have separate licenses)',licenseVerified:true,maintenance:'CLI 0.2.0 source inspected 2026-11-09',url:'https://github.com/rosebudai/rosebud-cli',available:false},
]
export const discoverySchema = z.array(z.object({requirementId:z.string(),decision:z.enum(['reuse','adapt','generate']),selected:z.string().nullable(),selectedComponents:z.array(z.string()).optional(),missingCapabilities:z.array(z.string()).optional(),reason:z.string(),candidates:z.array(z.object({id:z.string(),score:z.number(),eligible:z.boolean(),reason:z.string()}))}))
export type DiscoveryReport = z.infer<typeof discoverySchema>
export const discoveryRequestSchema=z.object({requirements:z.array(requirementSchema).min(1).max(20)}).strict()
const capabilityAliases:Record<string,string>={
  'palm-positions':'hand-position','normalized-palm-positions':'hand-position','hand-smoothing':'smoothing',
  'tracking-loss-handling':'tracking-loss','tracking-loss-recovery':'tracking-loss',
  'shared-progress':'progress','round-progress':'progress','restart-round':'round-restart',
  'entity-lifecycle':'lifecycle','hand-following':'follow-hand',
  'apple-art':'fruit-art','orange-art':'fruit-art','banana-art':'fruit-art',
  'sequential-contact':'ordered-selection','ordered-touch':'ordered-selection','sequence-selection':'ordered-selection',
  'wandering':'autonomous-wandering','roaming':'autonomous-wandering','autonomous-movement':'autonomous-wandering',
  'dwell-contact':'dwell-selection','sustained-contact':'dwell-selection','hold-to-select':'dwell-selection','sustained-hand-contact':'dwell-selection',
  'sustained-contact-selection':'dwell-selection','continuous-contact-selection':'dwell-selection','tracking-loss-detection':'tracking-loss',
  'completion-deduplication':'single-completion',
  'labels':'large-labels','generous-overlap':'overlap','tracking-loss-reset':'tracking-loss',
}
export const canonicalCapability=(cap:string)=>capabilityAliases[cap]??cap
const canonical=canonicalCapability
export function discoverComponents(requirements:ComponentRequirement[], external:readonly CatalogEntry[]=externalCatalog,persisted:readonly ComponentRecord[]=[]):DiscoveryReport {
  const local:CatalogEntry[]=componentRegistry.filter(c=>c.trust==='trusted').map(c=>({id:c.id,origin:'careplay',kind:c.kind??'mechanic',capabilities:c.capabilities,quality:c.quality??3,compatibility:c.execution??'host',dependencies:[],license:'CarePlay project-owned',licenseVerified:true,maintenance:'Maintained with this application',url:c.source??'',available:true}))
  for(const c of persisted.filter(c=>['approved','validated'].includes(c.status)&&c.evidence?.validatedHash===c.hash))local.push({id:`component:${c.id}@${c.version}`,origin:'careplay',kind:c.type,capabilities:c.capabilities,quality:4,compatibility:'sdk',dependencies:[],license:c.provenance.license,licenseVerified:c.status==='approved',maintenance:`Immutable ${c.hash}; ${c.status}; isolated revalidation required`,url:'',available:true,status:c.status as 'approved'|'validated'})
  return requirements.map(r=>{
    const needed=[...new Set(r.capabilities.map(canonical))]
    const candidates=[...local,...external].map(c=>{
      const provided=new Set(c.capabilities.map(canonical))
      const covered=needed.filter(cap=>provided.has(cap))
      const coverage=covered.length/needed.length
      const overlap=covered.length
      const quality=c.quality>=r.minimumQuality
      const adaptable=coverage>=.5&&coverage<1&&c.compatibility==='sdk'&&['mechanic','lifecycle','animation'].includes(r.kind)
      const reviewed=c.licenseVerified||c.status==='validated'
      const eligible=(coverage===1||adaptable)&&quality&&c.available&&reviewed&&c.compatibility!=='adapter-required'
      const score=coverage*50+c.quality*5-(c.dependencies.length*3)+(c.origin==='careplay'?10:0)
      const reason=!overlap?'No required capabilities.':!quality?'Visual/function quality below requirement.':!reviewed?'Specific license/revision not approved.':!c.available?'Reviewed reference only; no vetted local implementation or assets installed.':c.compatibility==='adapter-required'?'Requires a new renderer/provider adapter outside the current contract.':c.status==='validated'?'Validated reusable candidate, not developer-approved or trusted host code. Pin this version and revalidate in isolation; provenance/licensing still requires developer review.':coverage<1?`Adapt the existing SDK subset; generate missing capabilities: ${needed.filter(cap=>!provided.has(cap)).join(', ')}.`:`${c.license}; ${c.maintenance}; ${c.compatibility} boundary; ${c.dependencies.length} extra dependencies.`
      return {entry:c,id:c.id,score,eligible,reason,coverage,covered,usable:quality&&c.available&&reviewed&&c.compatibility!=='adapter-required'}
    }).filter(c=>c.coverage>0).sort((a,b)=>(a.entry.status==='validated'?1:0)-(b.entry.status==='validated'?1:0)||b.score-a.score)
    const missingCapabilities=needed.filter(cap=>!candidates.some(c=>c.usable&&c.covered.includes(cap)))
    // Priority applies only to suitable candidates; poor quality or incompatible code never wins by origin.
    const fullLocal=candidates.find(c=>c.eligible&&c.coverage===1&&c.entry.origin==='careplay')
    const remaining=new Set(needed),composition:typeof candidates=[]
    for(const c of candidates.filter(c=>c.usable&&c.entry.origin==='careplay')){
      if(c.covered.some(cap=>remaining.has(cap))){composition.push(c);c.covered.forEach(cap=>remaining.delete(cap))}
    }
    const missingArt=[...remaining].some(cap=>/(?:-art|illustration|sprite|texture)/.test(cap))
    const unsupportedInput=r.kind==='input'&&[...remaining].some(cap=>/voice|speech|body|pose|gaze|eye/.test(cap))
    if(!fullLocal&&composition.length&&remaining.size<needed.length&&((remaining.size===0)||((needed.length-remaining.size)/needed.length>=.5&&!missingArt&&!unsupportedInput))){
      return {requirementId:r.id,missingCapabilities,decision:'adapt',selected:composition.map(c=>c.id).join(' + '),selectedComponents:composition.map(c=>c.id),reason:`Compose compatible registered capabilities from ${composition.map(c=>c.id).join(', ')}. ${remaining.size?`Generate only the missing behavior: ${[...remaining].join(', ')}.`:'No new dependency or renderer is needed.'} Host input/HUD remain delegated to trusted UI; generated code uses the SDK/data interface.`,candidates:candidates.map(({id,score,eligible,reason})=>({id,score,eligible:eligible||composition.some(c=>c.id===id),reason:composition.some(c=>c.id===id)?`${reason} Eligible as part of the selected composition.`:reason}))}
    }
    const selected=fullLocal??candidates.find(c=>c.eligible&&c.entry.origin==='careplay')??candidates.find(c=>c.eligible&&c.coverage===1)??candidates.find(c=>c.eligible)
    return {requirementId:r.id,missingCapabilities,decision:selected?selected.entry.compatibility==='sdk'&&selected.coverage===1?'reuse':'adapt':'generate',selected:selected?.id??null,selectedComponents:selected?[selected.id]:[],reason:selected?`${selected.reason} ${selected.entry.compatibility==='host'?'Adapt the data algorithm or delegate to trusted host rendering; do not import host UI into generated code.':selected.entry.status?'Use only the pinned isolated component interface.':'Use the existing trusted runtime/asset interface.'}`:'No candidate covers the requirements at the requested quality within the current interface. Generate within the contract; do not force an engine/dependency migration.',candidates:candidates.map(({id,score,eligible,reason})=>({id,score,eligible,reason}))}
  })
}
/** A deterministic visual role that selects real rendered artwork, not descriptions of unavailable assets. */
export function selectVisuals(design:GameDesignSpec):VisualSpec {
  return visualSchema.parse({direction:design.visualDirection,palette:design.theme,background:design.theme==='ocean'?'quiet-water':design.theme==='sunshine'?'warm-studio':'soft-garden',motion:'gentle',assets:assetIds.map(id=>({id,purpose:`Approved illustrated ${id.replaceAll('-',' ')}`})),provider:'careplay-local',externalGeneration:false})
}


