import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { staticValidate } from './generation/validator.ts'
import { authorProposal, type AuthoringProvider } from './generation/pipeline.ts'
import { mayPreview, sandboxAvailability } from './generation/sandbox.ts'
import { validatePromotion } from '../src/engine/registry.ts'
import { normalizedInput } from '../src/engine/input.ts'
import { templateGame } from '../src/studio/config.ts'
import type { SourceBundle, GenerationPlan } from '../src/engine/generation.ts'

const source = `import type { MechanicFactory } from './contract';
export const createMechanic: MechanicFactory = () => ({ setup(context) { context.state.ready = true; }, update(context, dt) { if (context.input.hands.length === 0) return; context.state.elapsed = Number(context.state.elapsed ?? 0) + Math.min(.05, dt); }, dispose(context) { context.state.ready = false; } });`
const tests = `import { createMechanic } from './mechanic'; import type { MechanicTest } from './contract'; export const tests: MechanicTest[] = [{ name: 'factory exists', run() { if (typeof createMechanic !== 'function') throw new Error('Missing factory'); } }];`
const bundle: SourceBundle = { name: 'Reusable hand-guidance draft', description: 'Fixture, not generated or behaviorally verified.', source, tests, assetRequests: [] }
const plan: GenerationPlan = { task: 'code_generation', summary: 'Add generic hand guidance and persistent target transformations.', reuse: ['mirror-hand-input'], missing: ['hand-following', 'object-target collision'], components: [{ id: 'hand-guidance', description: 'Entity-kind-independent following.', capabilities: ['follow-hand'] }], acceptance: ['Tracking loss releases the object.'] }

test('type-checks source and tests without executing either module', () => {
  assert.deepEqual(staticValidate(bundle), [])
  assert.ok(staticValidate({ ...bundle, source: source + '\nthrow new Error("This must never execute");' }).length === 0)
  assert.ok(staticValidate({ ...bundle, source: source.replace('context.state.ready = true', 'context.missing = true') }).length > 0)
  assert.ok(staticValidate({ ...bundle, source: `export const createMechanic = 42;` }).some(d => d.includes('MechanicFactory')))
  assert.ok(staticValidate({ ...bundle, source: source + '\nimport fs from "node:fs";' }).some(d => d.includes('imports must')))
})
test('repair loop is bounded, persists provenance and never claims runtime success', async () => {
  const previousSandbox = process.env.CAREPLAY_SANDBOX
  process.env.CAREPLAY_SANDBOX = 'disabled'
  const root = await mkdtemp(join(tmpdir(), 'careplay-pipeline-test-'))
  try {
    let attempts = 0
    const provider: AuthoringProvider = { plan: async () => plan, code: async (_request, _plan, _previous, diagnostics) => {
      attempts++; if (attempts === 2) assert.ok(diagnostics.length > 0)
      return attempts === 1 ? { ...bundle, source: 'export const createMechanic = 42;' } : bundle
    } }
    const result = await authorProposal('Butterfly Garden', templateGame('garden'), root, provider, () => {})
    assert.equal(result.report.attempts, 2)
    assert.equal(result.report.status, 'awaiting_isolation')
    assert.equal(result.report.testsExecuted, false); assert.equal(result.report.previewAvailable, false)
    assert.equal(result.report.sourceHash.length, 64)
    assert.equal(JSON.parse(await readFile(join(root, result.report.id, 'proposal.json'), 'utf8')).report.sourceHash, result.report.sourceHash)
    const failed = await authorProposal('Circle drawing', templateGame('garden'), root, { plan: async () => plan, code: async () => ({ ...bundle, source: 'export const createMechanic = 42;' }) }, () => {})
    assert.equal(failed.report.attempts, 3); assert.equal(failed.report.status, 'static_failed')
  } finally { await rm(root, { recursive: true, force: true }); if (previousSandbox === undefined) delete process.env.CAREPLAY_SANDBOX; else process.env.CAREPLAY_SANDBOX = previousSandbox }
})
test('staff approval and typechecks alone cannot unlock generated preview or library promotion', () => {
  assert.equal(sandboxAvailability.available, false)
  assert.equal(mayPreview({ sourceHash: 'a', isolated: false, typecheckPassed: true, testsPassed: true, runtimePassed: true, trackingLossPassed: true, accessibilityPassed: true, artifactHash: 'b' }, 'a'), false)
  assert.equal(validatePromotion({ sourceHash: 'a', validatedHash: 'a', isolated: true, runtimePassed: true, developerApproved: false }), false)
  assert.equal(validatePromotion({ sourceHash: 'a', validatedHash: 'b', isolated: true, runtimePassed: true, developerApproved: true }), false)
})
test('shared input normalization mirrors palms and discards stale tracking', () => {
  const frame = { time: 100, width: 640, height: 480, hands: [{ center: { x: .25, y: .5 }, points: [] }] }
  assert.deepEqual(normalizedInput(frame, 1920, 1080, 200).hands[0].position, { x: .75, y: .5 })
  assert.deepEqual(normalizedInput(frame, 1920, 1080, 500).hands, [])
})
