import { z } from 'zod'
import { sceneSchema } from './scene'
import { designSchema, requirementSchema, visualSchema } from './design'
import { linkedMechanicSchema, componentSpecSchema, componentRefSchema } from './components'

const identifier = z.string().regex(/^[a-z][a-z0-9-]{2,63}$/)
export const componentTaskSchema=z.object({requirementId:identifier,spec:componentSpecSchema,request:z.string().min(1).max(1200),rationale:z.string().min(10).max(300)}).strict()
export const componentWorkSchema=z.object({
  requirementId:z.string(),specId:z.string(),capabilities:z.array(z.string()),status:z.enum(['generated','reused','skipped','failed']),
  generatorInvoked:z.boolean(),authorAttempts:z.number().int().nonnegative(),reason:z.string(),diagnostics:z.array(z.string()),component:componentRefSchema.optional(),
}).strict()
export type ComponentWork=z.infer<typeof componentWorkSchema>
export const planSchema = z.object({
  componentTasks:z.array(componentTaskSchema).max(2).optional(),
  localBehavior:z.array(z.string().max(200)).max(6).optional(),
  requirements:z.array(requirementSchema).max(10).optional(),
  task: z.enum(['configuration', 'code_generation']), summary: z.string().min(1).max(1500),
  reuse: z.array(z.string().max(100)).max(16), missing: z.array(z.string().max(150)).max(12),
  components: z.array(z.object({ id: identifier, description: z.string().max(500), capabilities: z.array(z.string().max(100)).max(12) }).strict()).max(6),
  acceptance: z.array(z.string().max(300)).min(1).max(16),
}).strict()
export const sourceBundleSchema = z.object({
  linkedComponents:z.array(linkedMechanicSchema).max(6).optional(),
  name: z.string().min(1).max(80), description: z.string().max(1500),
  source: z.string().min(20).max(50000), tests: z.string().min(20).max(40000),
  assetRequests: z.array(z.object({ name: z.string().max(80), kind: z.enum(['sprite', 'sound']), description: z.string().max(500) }).strict()).max(8),
  scene: sceneSchema.optional(),
}).strict()
export type GenerationPlan = z.infer<typeof planSchema>
export type SourceBundle = z.infer<typeof sourceBundleSchema>
export const generationReportSchema = z.object({
  componentWork:z.array(componentWorkSchema).optional(),
  design:designSchema.optional(),visual:visualSchema.optional(),
  discovery:z.array(z.object({requirementId:z.string(),decision:z.enum(['reuse','adapt','generate']),selected:z.string().nullable(),selectedComponents:z.array(z.string()).optional(),missingCapabilities:z.array(z.string()).optional(),reason:z.string(),candidates:z.array(z.object({id:z.string(),score:z.number(),eligible:z.boolean(),reason:z.string()}))})).optional(),
  quality:z.object({passed:z.boolean(),checks:z.array(z.string()),issues:z.array(z.string()),warnings:z.array(z.string()).optional(),screenshotReviewed:z.literal(false)}).optional(),
  id: z.string().uuid(), status: z.enum(['awaiting_isolation', 'static_failed', 'runtime_failed', 'preview_ready']),
  name: z.string(), summary: z.string(), sourceHash: z.string(),
  plan: planSchema, diagnostics: z.array(z.string()), attempts: z.number().int(),
  testsExecuted: z.boolean(), previewAvailable: z.boolean(), developerApproved: z.literal(false),
  artifactHash: z.string().optional(), validation: z.object({ imageId: z.string(), testCount: z.number(), runtimeChecks: z.array(z.string()) }).optional(),
})
export type GenerationReport = z.infer<typeof generationReportSchema>

