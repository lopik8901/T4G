import { readFile } from 'node:fs/promises'
import { generateComponent } from '../server/components/generate.ts'
import { listComponents, validateComponent, reviewComponent } from '../server/components/registry.ts'
import { previewComponent } from '../server/components/preview.ts'

const [action,...args]=process.argv.slice(2)
try{
  let result
  if(action==='list')result=await listComponents()
  else if(action==='generate')result=await generateComponent(JSON.parse(await readFile(args[0],'utf8')))
  else if(['validate','approve','reject','preview'].includes(action)){
    const [id,version,hash,...reason]=args,ref={id,version:Number(version),hash}
    result=action==='validate'?await validateComponent(ref):action==='preview'?await previewComponent(ref):await reviewComponent(ref,action as 'approve'|'reject',reason.join(' '))
  }else throw Error('Usage: components list | generate request.json | validate|preview|approve|reject ID VERSION HASH [developer review reason]')
  console.log(JSON.stringify(result,(key,value)=>key==='browserBundle'?undefined:value,2))
  if(result&&'record'in result&&!result.record)process.exitCode=1
  if(result&&'result'in result&&result.result.status!=='passed')process.exitCode=1
}catch(error){console.error(error instanceof Error?error.message:'Component operation failed.');process.exitCode=1}
