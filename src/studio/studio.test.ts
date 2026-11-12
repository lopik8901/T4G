import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyPatch, gameSchema, templateGame } from './config.ts'
import { demoAgent } from './demo.ts'
import { interact } from './rules.ts'

test('all templates validate and reject unsupported combinations and executable fields', () => {
  for (const type of ['balloons', 'garden', 'memory'] as const) assert.ok(gameSchema.safeParse(templateGame(type)).success)
  assert.throws(() => applyPatch(templateGame('garden'), { object: 'balloon' }))
  assert.throws(() => applyPatch(templateGame('garden'), { volume: 1 }))
  assert.throws(() => applyPatch(templateGame('garden'), { script: 'alert(1)' } as never))
})
test('creation and conversational edits yield playable data and preserve unrelated settings', () => {
  const base = templateGame('balloons')
  const created = applyPatch(base, demoAgent('Create a garden for two residents using their hands', base, 'create').patch)
  assert.equal(created.template, 'garden'); assert.equal(created.players, 2); assert.equal(created.scoring, false)
  const edited = applyPatch(created, demoAgent('Make the flowers twice as big and slow down the game', created, 'edit').patch)
  assert.equal(edited.size, 2); assert.ok(edited.speed < created.speed); assert.equal(edited.players, 2); assert.equal(edited.id, created.id)
  const switched = applyPatch(edited, demoAgent('Change this to a balloon game', edited, 'edit').patch)
  assert.equal(switched.template, 'balloons'); assert.equal(switched.size, edited.size)
})
test('unsupported requests leave the configuration untouched', () => {
  const config = templateGame('memory'), result = demoAgent('Add voice activation', config, 'edit')
  assert.equal(result.unsupported, true); assert.deepEqual(applyPatch(config, result.patch), config)
  const unknown = demoAgent('Build a chess tournament', config, 'create')
  assert.equal(unknown.unsupported, true); assert.deepEqual(unknown.patch, {})
})
test('memory reveals gradually and completed objects cannot score twice', () => {
  const object = { id: 0, progress: 0, done: false }, config = { ...templateGame('memory'), scoring: true }
  for (let i = 0; i < 3; i++) assert.equal(interact(object, config).points, 0)
  assert.equal(object.progress, 0.75); assert.equal(interact(object, config).points, 1)
  assert.deepEqual(interact(object, config), { changed: false, points: 0 })
})
