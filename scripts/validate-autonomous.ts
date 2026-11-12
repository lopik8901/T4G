import { join } from 'node:path'
import { authorProposal, codexAuthor } from '../server/generation/pipeline.ts'
import { getSandboxStatus } from '../server/generation/docker.ts'
import { templateGame } from '../src/studio/config.ts'

const status = await getSandboxStatus()
if (!status.available) throw Error(`Cannot validate autonomous gameplay: ${status.reason} No generated code was executed.`)
const cases = {
  butterfly: 'Build Butterfly Garden: two seated residents guide nearby butterflies with their hands toward flowers. Butterflies follow smoothly, flower collisions bloom flowers permanently with state.bloomed=true, butterflies depart, flowers remain visible after tracking loss. Use butterfly/flower appearances. No timer or scoring. Gentle sounds.',
  circles: 'Build a genuinely new mechanic: drawing a closed circle in the air with a hand creates a bubble entity with kind bubble. Straight lines must not create bubbles. Reset partial paths on tracking loss; do not repeatedly spawn without input. Test a radius .18 circle centered at .5,.5 drawn in three seconds. Large smooth objects, no score or timer.',
} as const
for (const kind of ['butterfly', 'circles'] as const) {
  const result = await authorProposal(cases[kind], templateGame('garden'), join(process.cwd(), '.careplay', 'proposals'), codexAuthor, stage => console.log(`${kind}: ${stage}`), null, kind)
  console.log(JSON.stringify(result.report, null, 2))
  if (!result.report.previewAvailable || !result.report.validation?.runtimeChecks.includes(`acceptance:${kind}`)) throw Error(`${kind} did not satisfy independent isolated acceptance after bounded repairs.`)
}
