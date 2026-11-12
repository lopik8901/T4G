import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { generateComponent } from '../server/components/generate.ts'
import { reusableComponents, readComponent, listComponents, validateComponent } from '../server/components/registry.ts'
import { discoverComponents } from '../server/generation/discovery.ts'
import { getSandboxStatus, validateInDocker } from '../server/generation/docker.ts'
import assert from 'node:assert/strict'

// Two real component calls, never full-game generation or substituted fixture execution.
assert.equal((await getSandboxStatus()).available,true,'Real Docker must be available before model calls.')
const examples=[
  {spec:{id:'ordered-selection',name:'Ordered selection',description:'Select generic entities in numeric order with natural hand contact.',type:'interaction',capabilities:['ordered-selection'],interactions:['hand-contact'],parameters:[{key:'targetKind',description:'Kind to select',default:'token'},{key:'padding',description:'Generous contact padding',default:.03}]},request:'Create a generic ordered-selection component. Use three targetKind tokens with state.order 0,1,2 in the fixture; keep them visible, set completed on correct contact. Include tests with a different kind and padding, simultaneous hands, wrong order, tracking loss, deterministic reset and dispose.'},
  {spec:{id:'autonomous-wandering',name:'Autonomous wandering',description:'Seeded gentle movement with radius-aware boundary reflections.',type:'mechanic',capabilities:['autonomous-wandering'],interactions:['autonomous'],parameters:[{key:'targetKind',description:'Kind to move',default:'wanderer'},{key:'speed',description:'Normalized movement speed',default:.12}]},request:'Create a generic autonomous-wandering component. Include parameterized targetKind and speed. Use runtime.random, radius-aware boundary reflection. Prove different target kinds and speed variations, deterministic replay, no-hands movement, bounded delayed updates, reset and disposal. Use three generic wanderer entities in the fixture.'},
]
const results=[]
await mkdir('artifacts',{recursive:true})
try{
  // Upgrade an existing version through real validation rather than spend model calls recreating it.
  for(const record of (await listComponents()).filter(r=>['validated','approved'].includes(r.status))){
    assert.equal((await validateComponent(record)).result.status,'passed')
  }
  for(const input of examples){
    console.log(`Generating/retrieving ${input.spec.id}`)
    const generated=await generateComponent(input)
    assert.ok(generated.record,JSON.stringify(generated))
    const record=generated.record
    const alternate=record.id==='ordered-selection'?'sequential-contact':'roaming'
    const discovered=discoverComponents([{id:'differently-worded',kind:'mechanic',description:'Differently phrased capability request',capabilities:[alternate],minimumQuality:3}],undefined,await reusableComponents())
    assert.equal(discovered[0].selected,`component:${record.id}@${record.version}`)
    const reused=await generateComponent({...input,request:`Reuse for unrelated entities; capability ${alternate}`,spec:{...input.spec,id:`another-${record.id}`,capabilities:[alternate]}},async()=>{throw Error('REUSE MUST NOT CALL THE AUTHOR')})
    assert.equal(reused.reused,true);assert.equal(reused.record?.hash,record.hash)
    const {payload}=await readComponent(record)
    assert.ok('mechanic'in payload)
    const variant=structuredClone(payload.mechanic)
    const kind=record.id==='ordered-selection'?'star':'fish'
    variant.scene!.entities.forEach(e=>e.kind=kind)
    variant.scene!.parameters=variant.scene!.parameters.map(p=>p.key==='targetKind'?{...p,value:kind}:p.key==='speed'?{...p,value:.2}:p)
    const checked=await validateInDocker(variant,undefined,record.id as 'ordered-selection'|'autonomous-wandering')
    assert.equal(checked.status,'passed',JSON.stringify(checked))
    results.push({id:record.id,version:record.version,hash:record.hash,generated,reused,discovered,variantValidation:checked.status==='passed'?{...checked,browserBundle:undefined}:checked})
    await writeFile('artifacts/component-registry-evidence.json',JSON.stringify({results},null,2))
    console.log(`${record.id}: validated, retrieved by ${alternate}, reused without author, variant ${kind} passed`)
  }
  const visualInput=JSON.parse(await readFile('scripts/component-visual-request.json','utf8'))
  const visualRecord=(await reusableComponents()).find(r=>r.id===visualInput.spec.id)
  if(visualRecord){
    const reused=await generateComponent({...visualInput,spec:{...visualInput.spec,id:'another-soft-star'}},async()=>{throw Error('VISUAL REUSE MUST NOT CALL THE AUTHOR')})
    assert.equal(reused.reused,true)
    await writeFile('artifacts/component-visual-evidence.json',JSON.stringify(reused,null,2))
  }
}catch(error){await writeFile('artifacts/component-registry-evidence.json',JSON.stringify({results,error:error instanceof Error?error.message:'Validation failed'},null,2));throw error}
