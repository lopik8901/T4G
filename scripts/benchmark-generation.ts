import { join } from 'node:path'
import { authorProposal, codexAuthor } from '../server/generation/pipeline.ts'
import { templateGame } from '../src/studio/config.ts'

const cases = {
  butterfly: 'Create a relaxing AR Butterfly Garden for elderly residents. Show residents through a mirrored webcam feed. Colourful butterflies float around. When a hand moves close, the butterfly follows that hand. Guide butterflies into flowers. The flowers bloom and remain bloomed, and butterflies fly away. Two seated residents, large interaction zones, slow movement, no scoring or timer. The hand guidance and persistent target outcome must be reusable for other entity kinds.',
  fishing: 'Create a fishing game where two seated residents guide fish into a pond with their hands. Reuse the same generic hand-guidance and target-transformation contract that works for butterflies and flowers. Use entity kinds/parameters, not game-name switches.',
  circles: 'Create a game where residents draw circles in the air with their hands to create bubbles. This recognizer is not in the current component registry; author a new gesture-recognition mechanic and tests, including tracking loss and rejecting straight lines.',
}
const name = process.argv[2] as keyof typeof cases
if (!(name in cases)) throw new Error('Choose butterfly, fishing or circles.')
const result = await authorProposal(cases[name], templateGame('garden'), join(process.cwd(), '.careplay', 'benchmarks'), codexAuthor, stage => console.log(stage))
console.log(JSON.stringify({ case: name, ...result.report }, null, 2))
if (result.report.status === 'static_failed') process.exitCode = 1
