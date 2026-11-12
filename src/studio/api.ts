import { agentResultSchema, type GameConfig } from './config'
import { demoAgent } from './demo'
import { generationReportSchema } from '../engine/generation'
import { experimentalSchema } from '../engine/scene'

export async function askAgent(prompt: string, config: GameConfig, action: 'create' | 'edit', mode: 'live' | 'demo' | 'offline', onProgress?: (stage: string) => void) {
  if (config.experimental && mode !== 'live') throw Error('Editing experimental mechanics requires the local Codex backend and isolated rebuild. Your current version is unchanged.')
  if (mode === 'offline') return { ...demoAgent(prompt, config, action), mode: 'offline' }
  const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, config, action }), signal: AbortSignal.timeout(135000) })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Could not reach the assistant. Your activity is unchanged.')
  if (response.status === 202 && typeof body.pendingJob === 'string') {
    const deadline = Date.now() + 30 * 60 * 1000
    while (Date.now() < deadline) {
      const statusResponse = await fetch(`/api/generation/${encodeURIComponent(body.pendingJob)}`, { signal: AbortSignal.timeout(15000) })
      const job = await statusResponse.json()
      if (!statusResponse.ok || job.status === 'failed') throw new Error(job.error || 'Could not finish preparing the draft. Your activity is unchanged.')
      onProgress?.(job.stage)
      if (job.status === 'complete') {
        const generation = generationReportSchema.parse(job.report)
        let experimental
        if (generation.previewAvailable) {
          const artifactResponse = await fetch(`/api/artifacts/${generation.id}`, { signal: AbortSignal.timeout(15000) })
          if (!artifactResponse.ok) throw Error('The validated preview artifact could not be loaded.')
          experimental = experimentalSchema.parse((await artifactResponse.json()).game)
          if (experimental.id !== generation.id || experimental.artifactHash !== generation.artifactHash || experimental.sourceHash !== generation.sourceHash) throw Error('Preview evidence does not match the artifact.')
        }
        return { patch: {}, explanation: generation.summary, unsupported: !experimental, mode: 'live', generation, experimental, download: `/api/generation/${body.pendingJob}/bundle` }
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
    throw new Error('The developer draft is still processing. It remains quarantined on the local backend; your existing activity is unchanged.')
  }
  return { ...agentResultSchema.parse({ patch: body.patch, explanation: body.explanation, unsupported: body.unsupported }), mode: body.mode as string }
}
