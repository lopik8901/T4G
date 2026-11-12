import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { generationFailureMessage } from './generation/errors.ts'
import { authorProposal } from './generation/pipeline.ts'
import { templateGame } from '../src/studio/config.ts'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('generation failures retain safe provider causes and validation fields without leaking raw errors', () => {
  const timeout='Codex took too long. Please try a shorter request.'
  assert.equal(generationFailureMessage(new Error(timeout)),timeout)
  const validation=z.object({scene:z.number()}).safeParse({scene:'private payload'})
  assert.equal(validation.success,false)
  if (!validation.success) {
    const message=generationFailureMessage(validation.error)
    assert.ok(message.includes('scene (invalid_type)'))
    assert.ok(!message.includes('private payload'))
  }
  assert.equal(generationFailureMessage(new Error('secret provider stderr')),'The coding assistant could not prepare a valid draft.')
})

test('an authoring failure persists its stage and safe cause before propagating', async () => {
  const root=await mkdtemp(join(tmpdir(),'careplay-failed-draft-'))
  const message='Codex took too long. Please try a shorter request.'
  try {
    const author={plan:async()=>({task:'code_generation' as const,summary:'Test plan',reuse:[],missing:['sorting'],components:[],acceptance:['Objects can be sorted.']}),code:async()=>{throw Error(message)}}
    await assert.rejects(()=>authorProposal('Sort fruit',templateGame('balloons'),root,author,()=>{}),{message})
    const [id]=await readdir(root)
    assert.deepEqual(JSON.parse(await readFile(join(root,id,'failure.json'),'utf8')),{stage:'authoring',error:message})
  } finally {await rm(root,{recursive:true,force:true})}
})
