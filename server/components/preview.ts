import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadForReuse, digest } from './registry.ts'
import { validateInDocker } from '../generation/docker.ts'
import { saveArtifact } from '../generation/artifacts.ts'

/** Tiny integration scene: exact module import plus trusted glue, never another model game call. */
export async function previewComponent(ref:unknown,visualRef?:unknown){
  const {record,payload}=await loadForReuse(ref)
  if(!('mechanic'in payload)||!payload.mechanic.scene)throw Error('A mechanic fixture is required.')
  const bundle=structuredClone(payload.mechanic)
  bundle.source=`export {createMechanic} from './component-${record.hash}';`
  bundle.linkedComponents=[{id:record.id,version:record.version,hash:record.hash,source:payload.mechanic.source}]
  if(visualRef){
    const visual=await loadForReuse(visualRef)
    if(!('visual'in visual.payload))throw Error('Visual component required.')
    const assetId=`component-${visual.record.hash}`
    bundle.scene!.registeredVisuals=[{assetId,definition:visual.payload.visual}]
    bundle.scene!.entities.forEach(e=>e.assetId=assetId)
  }
  const result=await validateInDocker(bundle)
  if(result.status!=='passed')throw Error('Linked component preview failed Docker validation.')
  const id=randomUUID(),folder=join(process.cwd(),'.careplay','proposals',id)
  const game={id,name:`Component preview: ${record.name}`,sourceHash:digest(bundle),artifactHash:result.artifactHash,scene:bundle.scene!}
  await mkdir(folder,{recursive:true});await saveArtifact(folder,game,result.browserBundle)
  await writeFile(join(folder,'proposal.json'),JSON.stringify({bundle,component:{id:record.id,version:record.version,hash:record.hash},report:{previewAvailable:true,componentSmoke:true}}))
  return {game,browserBundle:result.browserBundle}
}
