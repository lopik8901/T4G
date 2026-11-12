import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { codexStructured } from '../server/codex.ts'
import { staticValidate, engineContract } from '../server/generation/validator.ts'
import { sourceBundleSchema } from '../src/engine/generation.ts'

const id = process.argv[2]
if (!/^[a-f0-9-]{36}$/.test(id ?? '')) throw new Error('Provide the UUID of an existing benchmark proposal.')
const original = JSON.parse(await readFile(join(process.cwd(), '.careplay', 'benchmarks', id, 'proposal.json'), 'utf8'))
const bundle = sourceBundleSchema.parse(original.bundle)
const adaptationSchema = z.object({ parameters: z.object({ sourceKind: z.string(), targetKind: z.string(), targetStateKey: z.string(), sourceStateKey: z.string() }).strict(), explanation: z.string().max(1500), tests: z.string().min(20).max(20000) }).strict()
const adapted = await codexStructured(adaptationSchema, `Adapt the following EXISTING mechanic to a fishing activity: residents guide fish into a pond using hands. Do not modify its source. Return only parameters, an explanation of which components are reused, and TypeScript tests importing createMechanic from './mechanic' and MechanicTest from './contract'. Export const tests: MechanicTest[]. Include a fish/pond nominal test and tracking loss. No tools, execution or external imports. This is a static-only draft, not a playable validated game. Contract:${engineContract}\nSource:${bundle.source}`)
const diagnostics = staticValidate({ ...bundle, tests: adapted.tests })
const folder = join(process.cwd(), '.careplay', 'benchmarks', randomUUID())
await mkdir(folder, { recursive: true })
await writeFile(join(folder, 'mechanic.ts'), bundle.source)
await writeFile(join(folder, 'tests.ts'), adapted.tests)
const hash = createHash('sha256').update(bundle.source).digest('hex')
const report = { case: 'fishing-reuse', originalProposal: id, sourceUnchanged: true, sourceHash: hash, parameters: adapted.parameters, explanation: adapted.explanation, diagnostics, testsExecuted: false, previewAvailable: false }
await writeFile(join(folder, 'reuse-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (diagnostics.length) process.exitCode = 1
