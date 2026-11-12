import { randomUUID } from 'node:crypto'
import { generateComponent } from './generate.ts'
import { generationFailureMessage } from '../generation/errors.ts'

const jobs=new Map<string,{id:string;status:'running'|'complete'|'failed';result?:Awaited<ReturnType<typeof generateComponent>>;error?:string}>()
export const getComponentJob=(id:string)=>jobs.get(id)
export function startComponentJob(input:unknown){
  if([...jobs.values()].some(j=>j.status==='running'))throw Error('Another component job is running.')
  const id=randomUUID()
  if(jobs.size>=50)jobs.delete(jobs.keys().next().value!)
  jobs.set(id,{id,status:'running'})
  void generateComponent(input).then(result=>jobs.set(id,{id,status:'complete',result})).catch(error=>jobs.set(id,{id,status:'failed',error:generationFailureMessage(error)}))
  return id
}
