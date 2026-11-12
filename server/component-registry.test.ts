import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { illustrationSchema } from '../src/engine/components.ts'
import { saveCandidate, validateComponent, readComponent, listComponents, reviewComponent, loadForReuse } from './components/registry.ts'
import { generateComponent } from './components/generate.ts'
import { discoverComponents } from './generation/discovery.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RegisteredArt } from '../src/studio/RegisteredArt.tsx'

const visual={palette:{primary:'#77AACC',secondary:'#EEDD99',accent:'#FFFFFF',outline:'#334455'},shapes:[{shape:'ellipse' as const,x:50,y:50,width:70,height:60,fill:'primary' as const,stroke:'outline' as const,strokeWidth:2}],states:{idle:1,selected:1.05,completed:1.1,disabled:.5},animation:'none' as const}
const spec={id:'sample-art',name:'Sample art',description:'Trusted test data, not AI generation evidence',type:'visual' as const,capabilities:['sample-art'],interactions:[],parameters:[]}
const provenance={origin:'developer' as const,request:'Fixture',license:'Project-owned test fixture'}
test('registry persists separately from objects, deduplicates, pins versions and requires explicit promotion',async()=>{
  const root=await mkdtemp(join(tmpdir(),'careplay-registry-'))
  try{
    const first=await saveCandidate(spec,{visual},provenance,root)
    assert.equal(first.status,'candidate');await assert.rejects(loadForReuse(first,root))
    assert.equal((await saveCandidate(spec,{visual},provenance,root)).hash,first.hash)
    assert.equal((await listComponents(root)).length,1)
    await assert.rejects(reviewComponent(first,'approve','Reviewed fixture',root))
    const validated=await validateComponent(first,root);assert.equal(validated.record.status,'validated')
    const recommendation=discoverComponents([{id:'need-art',kind:'visual',description:'New requested artwork',capabilities:['sample-art'],minimumQuality:3}],[],[validated.record])
    assert.equal(recommendation[0].selected,'component:sample-art@1')
    const reused=await generateComponent({spec,request:'Reuse the illustration'},async()=>{throw Error('Author must not run')},root)
    assert.equal(reused.reused,true)
    await assert.rejects(generateComponent({spec:{...spec,parameters:[{key:'unsupportedMode',description:'Not supplied by stored interface',default:true}]},request:'Require a different interface'},async()=>{throw Error('Incompatible parameters correctly reached generation')},root),/Incompatible parameters correctly/)
    const approved=await reviewComponent(first,'approve','Developer reviewed shape safety and appearance',root)
    assert.equal(approved.status,'approved')
    const second=await saveCandidate(spec,{visual:{...visual,animation:'gentle-pulse'}},provenance,root)
    assert.equal(second.version,2);assert.notEqual(second.hash,first.hash)
    assert.equal((await readComponent(first,root)).record.status,'approved')
    const module=fileURLToPath(new URL('./components/registry.ts',import.meta.url))
    const out=await new Promise<string>((resolve,reject)=>execFile(process.execPath,['--import','tsx','--input-type=module','-e',`import {listComponents} from ${JSON.stringify(new URL(`file:///${module.replaceAll('\\','/')}`).href)};console.log(JSON.stringify(await listComponents(process.argv[1])))`,root],{windowsHide:true},(err,stdout)=>err?reject(err):resolve(stdout)))
    assert.equal(JSON.parse(out).length,2,'fresh process must find persisted registry')
    await reviewComponent(first,'reject','Developer rejected after review',root)
    await assert.rejects(loadForReuse(first,root));await assert.rejects(validateComponent(first,root))
    assert.equal(discoverComponents([{id:'need-art',kind:'visual',description:'Any art',capabilities:['sample-art'],minimumQuality:3}],[],await listComponents(root))[0].decision,'generate')
    const metadata=JSON.parse(await readFile(join(root,'metadata','sample-art.v2.json'),'utf8'))
    assert.equal('source'in metadata,false);assert.equal('visual'in metadata,false)
    const secondValidated=await validateComponent(second,root)
    await writeFile(join(root,'metadata','sample-art.v2.json'),JSON.stringify({...secondValidated.record,evidence:{...secondValidated.record.evidence,runtimeHash:'0'.repeat(64)}}))
    await assert.rejects(loadForReuse(second,root),/incompatible/)
    await writeFile(join(root,'objects',`${second.hash}.json`),JSON.stringify({visual:{...visual,animation:'none'}}))
    await assert.rejects(readComponent(second,root),/integrity/)
    await assert.rejects(readComponent({...first,id:'../escape'},root))
  }finally{await rm(root,{recursive:true,force:true})}
})
test('visual contract rejects active content, excessive complexity and unbounded states',()=>{
  assert.equal(illustrationSchema.safeParse({...visual,markup:'<script/>'}).success,false)
  assert.equal(illustrationSchema.safeParse({...visual,palette:{...visual.palette,primary:'url(https://evil)'}}).success,false)
  assert.equal(illustrationSchema.safeParse({...visual,shapes:Array(33).fill(visual.shapes[0])}).success,false)
  assert.equal(illustrationSchema.safeParse({...visual,states:{...visual.states,selected:10000}}).success,false)
  assert.equal(illustrationSchema.safeParse({...visual,shapes:[{...visual.shapes[0],onclick:'alert(1)'}]}).success,false)
  for(const state of ['idle','selected','completed','disabled'] as const){
    const svg=renderToStaticMarkup(createElement(RegisteredArt,{definition:illustrationSchema.parse(visual),state}))
    assert.match(svg,/<ellipse/);assert.ok(!/href=|<script|<foreignObject|onload=|url\(/.test(svg));assert.match(svg,new RegExp(`scale\\(${visual.states[state]}\\)`))
  }
})
