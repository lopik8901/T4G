import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { componentRecordSchema, componentSpecSchema, componentRefSchema, illustrationSchema, type ComponentRecord, type ComponentSpec } from '../../src/engine/components.ts'
import { sourceBundleSchema, type SourceBundle } from '../../src/engine/generation.ts'
import { trustedRuntimeHash, validateInDocker } from '../generation/docker.ts'

export const registryRoot=()=>join(process.cwd(),'.careplay','components')
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const objectSchema=sourceBundleSchema
type Payload={mechanic:SourceBundle}|{visual:ReturnType<typeof illustrationSchema.parse>}
const fingerprint=(spec:ComponentSpec,payload:Payload)=>digest({interface:'careplay-components-v1',type:spec.type,parameters:spec.parameters,payload})
async function json(path:string){return JSON.parse(await readFile(path,'utf8'))}
async function atomic(path:string,value:unknown){const temp=`${path}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,path)}
// Serialize mutations in this local single-server service; version files are also created exclusively.
let mutation=Promise.resolve()
function serialize<T>(operation:()=>Promise<T>):Promise<T>{const pending=mutation.then(operation);mutation=pending.then(()=>{},()=>{});return pending}
export async function listComponents(root=registryRoot()):Promise<ComponentRecord[]>{
  let names:string[];try{names=await readdir(join(root,'metadata'))}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error}
  const records=await Promise.all(names.filter(n=>/^[a-z][a-z0-9-]+\.v\d+\.json$/.test(n)).map(async n=>componentRecordSchema.parse(await json(join(root,'metadata',n)))))
  return records.sort((a,b)=>a.id.localeCompare(b.id)||b.version-a.version)
}
const filename=(root:string,record:{id:string;version:number})=>join(root,'metadata',`${record.id}.v${record.version}.json`)
export async function readComponent(ref:unknown,root=registryRoot()){
  const pin=componentRefSchema.strip().parse(ref),record=componentRecordSchema.parse(await json(filename(root,pin)))
  if(record.hash!==pin.hash)throw Error('Component version/hash mismatch.')
  const raw=await json(join(root,'objects',`${record.hash}.json`))
  const payload:Payload=record.interface==='careplay-svg-v1'?{visual:illustrationSchema.parse(raw.visual)}:{mechanic:objectSchema.parse(raw.mechanic)}
  if(fingerprint(record,payload)!==record.hash)throw Error('Component content integrity check failed.')
  return {record,payload}
}
export async function saveCandidate(input:unknown,payloadInput:Payload,provenance:ComponentRecord['provenance'],root=registryRoot()){
  const spec=componentSpecSchema.parse(input)
  const payload:Payload='visual'in payloadInput?{visual:illustrationSchema.parse(payloadInput.visual)}:{mechanic:objectSchema.parse(payloadInput.mechanic)}
  if(('visual'in payload)!==['visual','asset'].includes(spec.type))throw Error('Component type and payload disagree.')
  if('mechanic'in payload&&payload.mechanic.linkedComponents?.length)throw Error('Standalone reusable components cannot contain hidden component dependencies.')
  return serialize(async()=>{
    await mkdir(join(root,'metadata'),{recursive:true});await mkdir(join(root,'objects'),{recursive:true})
    const records=await listComponents(root),hash=fingerprint(spec,payload),duplicate=records.find(r=>r.hash===hash)
    if(duplicate)return duplicate
    const version=1+Math.max(0,...records.filter(r=>r.id===spec.id).map(r=>r.version))
    const record=componentRecordSchema.parse({...spec,version,hash,createdAt:new Date().toISOString(),interface:'visual'in payload?'careplay-svg-v1':'careplay-mechanic-v1',inputs:'visual'in payload?['palette','size','state']:['MechanicContext','parameters','deltaSeconds'],outputs:'visual'in payload?['trusted SVG primitives']:['bounded entity state','outcomes'],dependencies:[],provenance,runtime:'careplay-worker-v1',status:'candidate',evidence:null,review:null})
    try{await writeFile(join(root,'objects',`${hash}.json`),JSON.stringify(payload),{flag:'wx'})}catch(error){
      if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error
      const existing=await json(join(root,'objects',`${hash}.json`))
      if(digest(existing)!==digest(payload))throw Error('Existing component object conflicts with its content hash.')
    }
    await writeFile(filename(root,record),JSON.stringify(record,null,2),{flag:'wx'})
    return record
  })
}
export async function validateComponent(ref:unknown,root=registryRoot()){
  const {record,payload}=await readComponent(ref,root)
  if(record.status==='rejected')throw Error('Rejected components cannot be loaded or validated; create a new version.')
  const probe=record.capabilities.includes('ordered-selection')?'ordered-selection':record.capabilities.includes('autonomous-wandering')?'autonomous-wandering':undefined
  const result='mechanic'in payload?await validateInDocker(payload.mechanic,undefined,probe):null
  const history={at:new Date().toISOString(),status:result?.status??'passed' as const,diagnostics:result?.status==='failed'?result.diagnostics:result?.status==='unavailable'?[result.reason]:[]}
  if(result&&result.status!=='passed'){
    const updated=await serialize(async()=>{
      const fresh=(await readComponent(ref,root)).record
      const next=componentRecordSchema.parse({...fresh,...(result.status==='failed'&&fresh.status!=='rejected'?{status:'candidate',evidence:null,review:null}:{}),validationHistory:[...fresh.validationHistory.slice(-11),history]})
      await atomic(filename(root,next),next);return next
    })
    return {record:updated,result}
  }
  const evidence={validatedHash:record.hash,runtimeHash:trustedRuntimeHash,imageId:result?.status==='passed'?result.imageId:'trusted-schema-renderer-v1',testCount:result?.status==='passed'?result.testCount:1,checks:result?.status==='passed'?result.runtimeChecks:['bounded-shapes','closed-paint-tokens','no-markup-or-urls','finite-state-transforms'],validatedAt:new Date().toISOString()}
  const updated=await serialize(async()=>{
    const fresh=(await readComponent(ref,root)).record
    if(fresh.status==='rejected')throw Error('Component was rejected during validation.')
    const next=componentRecordSchema.parse({...fresh,status:fresh.status==='approved'?'approved':'validated',evidence,validationHistory:[...fresh.validationHistory.slice(-11),history]})
    await atomic(filename(root,next),next);return next
  })
  return {record:updated,result:result??{status:'passed' as const}}
}
export async function reviewComponent(ref:unknown,action:'approve'|'reject',reason:string,root=registryRoot()){
  return serialize(async()=>{
    const {record}=await readComponent(ref,root)
    if(action==='approve'&&(record.status!=='validated'||record.evidence?.validatedHash!==record.hash||record.evidence.runtimeHash!==trustedRuntimeHash))throw Error('Approval requires current successful validation of this exact version.')
    const next=componentRecordSchema.parse({...record,status:action==='approve'?'approved':'rejected',review:{action,reason,at:new Date().toISOString()}})
    await atomic(filename(root,next),next);return next
  })
}
export async function reusableComponents(root=registryRoot()){
  return (await listComponents(root)).filter(r=>['validated','approved'].includes(r.status)&&r.evidence?.validatedHash===r.hash&&r.evidence.runtimeHash===trustedRuntimeHash)
}
/** Registry status never permits host execution. Revalidate candidates before isolated reuse. */
export async function loadForReuse(ref:unknown,root=registryRoot()){
  const {record}=await readComponent(ref,root)
  if(!['validated','approved'].includes(record.status)||record.evidence?.runtimeHash!==trustedRuntimeHash)throw Error('Component is rejected, unvalidated or runtime-incompatible.')
  const checked=await validateComponent(ref,root)
  if(checked.result.status!=='passed')throw Error('Component failed reuse validation.')
  return readComponent(ref,root)
}
