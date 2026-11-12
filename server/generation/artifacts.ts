import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { experimentalSchema, type ExperimentalGame } from '../../src/engine/scene.ts'
import { sourceBundleSchema } from '../../src/engine/generation.ts'

export async function loadArtifact(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid experimental artifact identifier.')
  const folder = join(process.cwd(), '.careplay', 'proposals', id)
  const record = JSON.parse(await readFile(join(folder, 'artifact.json'), 'utf8'))
  const game = experimentalSchema.parse(record.game)
  if (typeof record.browserBundle !== 'string' || record.browserBundle.length > 300000 || createHash('sha256').update(record.browserBundle).digest('hex') !== game.artifactHash) throw new Error('Experimental artifact integrity check failed.')
  return { game, browserBundle: record.browserBundle as string }
}
export async function loadPreviousBundle(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid proposal identifier.')
  const record = JSON.parse(await readFile(join(process.cwd(), '.careplay', 'proposals', id, 'proposal.json'), 'utf8'))
  return sourceBundleSchema.parse(record.bundle)
}
export async function saveArtifact(folder: string, game: ExperimentalGame, browserBundle: string) {
  experimentalSchema.parse(game)
  await writeFile(join(folder, 'artifact.json'), JSON.stringify({ game, browserBundle }))
}
