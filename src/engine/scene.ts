import { z } from 'zod'
import { assetIdSchema, lifecycleSchema, lifecycleFrameSchema, visualSchema, designSchema } from './design'
import { registeredVisualSchema } from './components'

const scalar = z.union([z.string().max(100), z.number().finite(), z.boolean(), z.null()])
export const propertiesSchema = z.array(z.object({ key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,50}$/), value: scalar }).strict()).max(32)
export const sceneSchema = z.object({
  registeredVisuals:z.array(registeredVisualSchema).max(4).optional(),
  interaction:z.enum(['match-categories','guide-to-target','recognize-path','custom']).optional(),
  lifecycle: lifecycleSchema.optional(), visual: visualSchema.optional(),
  accessibility:z.object({maximumSpeed:z.number().min(.1).max(.5),minimumTargetRadius:z.number().min(.055).max(.15)}).strict().optional(),
  instruction: z.string().min(1).max(240), parameters: propertiesSchema,
  entities: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), kind: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    x: z.number().min(0).max(1), y: z.number().min(0).max(1), radius: z.number().min(0.015).max(0.2),
    appearance: z.enum(['balloon', 'butterfly', 'flower', 'fish', 'pond', 'bubble', 'fruit', 'circle']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/), state: propertiesSchema,
    assetId:assetIdSchema.optional(),label:z.string().max(80).optional(),
  }).strict()).min(1).max(48),
}).strict().superRefine((scene, ctx) => {
  if (new Set(scene.entities.map(e => e.id)).size !== scene.entities.length) ctx.addIssue({ code: 'custom', message: 'Entity identifiers must be unique.' })
})
export type Scene = z.infer<typeof sceneSchema>
export const experimentalSchema = z.object({
  design:designSchema.optional(),
  id: z.string().uuid(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/), artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().max(80), scene: sceneSchema,
}).strict()
export type ExperimentalGame = z.infer<typeof experimentalSchema>
export const runtimeFrameSchema = z.object({
  lifecycle:lifecycleFrameSchema.optional(),
  sound: z.boolean().optional(),
  entities: z.array(z.object({
    id: z.string().max(64), kind: z.string().max(64), x: z.number().finite().min(-0.5).max(1.5), y: z.number().finite().min(-0.5).max(1.5),
    radius: z.number().finite().min(0.005).max(0.3), visible: z.boolean(), completed: z.boolean(),
    visualState:z.enum(['idle','selected','completed','disabled']).optional(),
    assetId:assetIdSchema.optional(),label:z.string().max(80).optional(),
  }).strict()).max(64),
}).strict()
export type RuntimeFrame = z.infer<typeof runtimeFrameSchema>
