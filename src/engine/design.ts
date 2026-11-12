import { z } from 'zod'

export const requirementSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  kind: z.enum(['input', 'mechanic', 'lifecycle', 'visual', 'animation']),
  description: z.string().min(1).max(200), capabilities: z.array(z.string().min(1).max(60)).min(1).max(6),
  minimumQuality: z.number().int().min(1).max(5),
}).strict()
export type ComponentRequirement = z.infer<typeof requirementSchema>
export const lifecycleSchema = z.object({
  layout:z.enum(['shuffle','fixed']).optional().describe('Use fixed for intentional repeated layouts; shuffle for new arrangements. Omitted legacy values retain shuffle checks.'),
  mode: z.enum(['rounds', 'single', 'open-ended']), rounds: z.number().int().min(1).max(8),
  goal: z.number().int().min(1).max(24).describe('Successful outcomes required in EACH round. Three fruits per round across three rounds means goal=3, not 9.'), objective: z.string().min(1).max(160).describe('The same short player-facing instruction as the design objective; no technical details.'),
  completionMessage: z.string().min(1).max(160),
}).strict()
export const designSchema = z.object({
  title: z.string().min(1).max(80), theme: z.enum(['meadow', 'sunshine', 'ocean']),
  audience: z.string().min(1).max(120), visualDirection: z.string().min(1).max(240),
  objective: z.string().min(1).max(120).describe('One complete, simple instruction for residents, e.g. Guide each fruit to the basket with its picture. No SDK/code terminology.'), interaction: z.enum(['match-categories', 'guide-to-target', 'recognize-path', 'custom']),
  rules: z.array(z.string().max(180)).min(1).max(6), coreLoop: z.array(z.string().max(160)).min(2).max(5),
  success: z.string().max(160), failureHandling: z.string().max(160), cooperation: z.string().max(160),
  lifecycle: lifecycleSchema,
  accessibility: z.object({seated:z.literal(true),players:z.union([z.literal(1),z.literal(2)]),minimumTargetRadius:z.number().min(.055).max(.15),maximumSpeed:z.number().min(.1).max(.5),noTimePressure:z.literal(true),feedback:z.string().max(160)}).strict(),
  requirements: z.array(requirementSchema).min(1).max(10),
}).strict()
export type GameDesignSpec = z.infer<typeof designSchema>
export const assetIds = ['apple', 'orange', 'banana', 'basket-apple', 'basket-orange', 'basket-banana', 'basket', 'fish-coral', 'fish-blue', 'food', 'flower-pink', 'flower-gold', 'butterfly-lilac', 'bubble-pearl'] as const
export const assetIdSchema = z.union([z.enum(assetIds),z.string().regex(/^component-[a-f0-9]{64}$/)])
export const visualSchema = z.object({
  direction:z.string().max(240), palette:z.enum(['meadow','sunshine','ocean']),
  background:z.enum(['soft-garden','warm-studio','quiet-water']), motion:z.enum(['gentle','reduced']),
  assets:z.array(z.object({id:assetIdSchema,purpose:z.string().max(120)}).strict()).max(20),
  provider:z.literal('careplay-local'), externalGeneration:z.literal(false),
}).strict()
export type VisualSpec = z.infer<typeof visualSchema>
export const lifecycleFrameSchema = z.object({
  phase:z.enum(['ready','playing','round_complete','game_complete']),round:z.number().int().min(1).max(8),rounds:z.number().int().min(1).max(8),
  progress:z.number().int().min(0).max(999),goal:z.number().int().min(1).max(24),revision:z.number().int().min(0).max(999),
  mode:z.enum(['rounds','single','open-ended']),objective:z.string().max(160),message:z.string().max(160),
}).strict()
