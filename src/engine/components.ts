import { z } from 'zod'

export const componentId = z.string().regex(/^[a-z][a-z0-9-]{2,63}$/)
export const contentHash = z.string().regex(/^[a-f0-9]{64}$/)
export const componentInterface = 'careplay-mechanic-v1' as const
export const componentSpecSchema = z.object({
  id:componentId,name:z.string().min(1).max(80),description:z.string().min(1).max(500),
  type:z.enum(['mechanic','interaction','animation','visual','asset']),
  capabilities:z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,59}$/)).min(1).max(12),
  interactions:z.array(z.string().max(60)).max(8),
  parameters:z.array(z.object({key:z.string().regex(/^[a-z][a-zA-Z0-9]{0,39}$/),description:z.string().max(160),default:z.union([z.number().finite(),z.string().max(100),z.boolean()])}).strict()).max(12),
}).strict()
export type ComponentSpec = z.infer<typeof componentSpecSchema>
// Finite declarative SVG, never SVG/HTML strings, arbitrary attributes or CSS.
const coordinate=z.number().finite().min(0).max(100)
const paint=z.enum(['primary','secondary','accent','outline','none'])
export const illustrationSchema=z.object({
  palette:z.object({primary:z.string().regex(/^#[a-fA-F0-9]{6}$/),secondary:z.string().regex(/^#[a-fA-F0-9]{6}$/),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/),outline:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).strict(),
  shapes:z.array(z.union([
    z.object({shape:z.enum(['ellipse','rect','line']),x:coordinate,y:coordinate,width:coordinate,height:coordinate,fill:paint,stroke:paint,strokeWidth:z.number().min(0).max(5)}).strict(),
    z.object({shape:z.literal('polygon'),points:z.array(z.object({x:coordinate,y:coordinate}).strict()).min(3).max(16),fill:paint,stroke:paint,strokeWidth:z.number().min(0).max(5)}).strict(),
  ])).min(1).max(32),
  states:z.object({idle:z.number().min(.5).max(1),selected:z.number().min(.5).max(1.1),completed:z.number().min(.5).max(1.1),disabled:z.number().min(.2).max(1)}).strict(),
  animation:z.enum(['none','gentle-pulse']),
}).strict()
export type Illustration=z.infer<typeof illustrationSchema>
export const componentRefSchema=z.object({id:componentId,version:z.number().int().positive(),hash:contentHash}).strict()
export const linkedMechanicSchema=componentRefSchema.extend({source:z.string().min(20).max(50000)}).strict()
export const registeredVisualSchema=z.object({assetId:z.string().regex(/^component-[a-f0-9]{64}$/),definition:illustrationSchema}).strict()
export const componentRecordSchema=componentSpecSchema.extend({
  version:z.number().int().positive(),hash:contentHash,createdAt:z.string().datetime(),
  interface:z.enum(['careplay-mechanic-v1','careplay-svg-v1']),
  inputs:z.array(z.string().max(100)).max(8),outputs:z.array(z.string().max(100)).max(8),
  dependencies:z.array(componentRefSchema).max(8),
  provenance:z.object({origin:z.enum(['codex','developer']),request:z.string().max(2000),license:z.string().min(1).max(120)}).strict(),
  runtime:z.literal('careplay-worker-v1'),status:z.enum(['candidate','validated','approved','rejected']),
  validationHistory:z.array(z.object({at:z.string().datetime(),status:z.enum(['passed','failed','unavailable']),diagnostics:z.array(z.string().max(2000)).max(30)}).strict()).max(12).default([]),
  evidence:z.object({validatedHash:contentHash,runtimeHash:contentHash,imageId:z.string().max(100),testCount:z.number().int().nonnegative(),checks:z.array(z.string().max(100)).max(40),validatedAt:z.string().datetime()}).strict().nullable(),
  review:z.object({action:z.enum(['approve','reject']),reason:z.string().min(5).max(500),at:z.string().datetime()}).strict().nullable(),
}).strict()
export type ComponentRecord=z.infer<typeof componentRecordSchema>
