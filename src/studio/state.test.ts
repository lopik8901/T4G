import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useStudio } from './store.ts'

test('manual and AI changes share undo/redo and revoke staff approval', () => {
  useStudio.getState().newGame('garden')
  useStudio.getState().change({ size: 1.7 }, 'Make bigger')
  useStudio.getState().approve()
  assert.equal(useStudio.getState().approved, true)
  useStudio.getState().change({ players: 1 }, 'One participant')
  assert.equal(useStudio.getState().approved, false)
  const cursor = useStudio.getState().cursor
  useStudio.getState().travel(cursor - 1)
  assert.equal(useStudio.getState().config.players, 2)
  assert.equal(useStudio.getState().config.size, 1.7)
  useStudio.getState().travel(cursor)
  assert.equal(useStudio.getState().config.players, 1)
  useStudio.getState().travel(cursor - 1)
  useStudio.getState().change({ scoring: true }, 'Scoring')
  assert.equal(useStudio.getState().versions.length, cursor + 1)
  assert.equal(useStudio.getState().config.players, 2)
  const before = useStudio.getState().config
  assert.throws(() => useStudio.getState().change({ size: 999 }, 'Invalid edit'))
  assert.deepEqual(useStudio.getState().config, before)
})
