import { z } from 'zod'
import { experimentalSchema } from '../engine/scene'

export const editableSchema = z.object({
  name: z.string().trim().min(1).max(80),
  template: z.enum(['balloons', 'garden', 'memory']),
  inputs: z.array(z.enum(['hand_tracking', 'sound_detection'])).min(1).max(2).refine(v => new Set(v).size === v.length),
  object: z.enum(['balloon', 'butterfly', 'fruit', 'seed', 'photo']),
  size: z.number().min(0.8).max(2), speed: z.number().min(0.2).max(1.8), count: z.number().int().min(3).max(6),
  volume: z.number().min(0).max(0.6), sensitivity: z.number().min(1).max(2), soundThreshold: z.number().min(0.03).max(0.4),
  players: z.union([z.literal(1), z.literal(2)]), seated: z.boolean(), scoring: z.boolean(),
  difficulty: z.enum(['easy', 'gentle', 'steady']), theme: z.enum(['meadow', 'sunshine', 'ocean']), music: z.boolean(),
}).strict()
export const patchSchema = editableSchema.partial().strict()
export const gameSchema = editableSchema.extend({ id: z.string().min(1).max(100), experimental: experimentalSchema.optional() }).superRefine((g, ctx) => {
  const compatible = g.template === 'garden' ? g.object === 'seed' : g.template === 'memory' ? g.object === 'photo' : ['balloon', 'butterfly', 'fruit'].includes(g.object)
  if (!compatible) ctx.addIssue({ code: 'custom', message: 'This object does not fit the selected activity.', path: ['object'] })
})
export type GameConfig = z.infer<typeof gameSchema>
export type GamePatch = z.infer<typeof patchSchema>
export type Template = GameConfig['template']
export function templateGame(template: Template, id: string = crypto.randomUUID()): GameConfig {
  return gameSchema.parse({ id, name: { balloons: 'Balloon Pop', garden: 'Collaborative Garden', memory: 'Memory Reveal' }[template], template,
    object: { balloons: 'balloon', garden: 'seed', memory: 'photo' }[template], inputs: ['hand_tracking'], size: 1.2,
    speed: 0.65, count: template === 'balloons' ? 4 : 3, volume: 0.25, sensitivity: 1.4, soundThreshold: 0.12,
    players: template === 'garden' ? 2 : 1, seated: true, scoring: template === 'balloons', difficulty: 'gentle', theme: 'meadow', music: false })
}
export function applyPatch(config: GameConfig, patch: GamePatch) {
  return gameSchema.parse({ ...config, ...patchSchema.parse(patch) })
}
export function accessibilityNotes(config: GameConfig) {
  return [config.speed > 1.2 && 'Try a slower pace for residents with limited reach.', config.size < 1.1 && 'Larger objects may be easier to reach.', !config.seated && 'Check that residents are comfortable standing.'].filter(Boolean) as string[]
}
export const requestSchema = z.object({ prompt: z.string().trim().min(1).max(2000), config: gameSchema, action: z.enum(['create', 'edit']) }).strict()
export const agentResultSchema = z.object({ patch: patchSchema, explanation: z.string().min(1).max(600), unsupported: z.boolean() }).strict()
