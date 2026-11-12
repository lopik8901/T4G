import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceRound, createRound, recordRoundHit } from './round.ts'

test('timed rounds count balloons, tolerate misses, and stop at the time limit', () => {
  let round = createRound('timed', 30)
  round = recordRoundHit(recordRoundHit(round))
  round = advanceRound(round, 29, 3)
  assert.equal(round.hits, 2)
  assert.equal(round.misses, 3)
  assert.equal(round.endReason, null)
  round = advanceRound(round, 2, 0)
  assert.equal(round.elapsed, 30)
  assert.equal(round.endReason, 'time-up')
  assert.deepEqual(recordRoundHit(round), round, 'late pops cannot change a finished result')
  assert.deepEqual(advanceRound(round, 10, 4), round)
})

test('endless rounds have no time limit and end on the first miss', () => {
  let round = advanceRound(createRound('endless'), 600, 0)
  assert.equal(round.endReason, null)
  round = recordRoundHit(round)
  round = advanceRound(round, 0.1, 1)
  assert.equal(round.endReason, 'missed-balloon')
  assert.equal(round.hits, 1)
  assert.equal(round.misses, 1)
})

test('a new round clears time, hits, misses, and the previous end condition', () => {
  const finished = advanceRound(recordRoundHit(createRound('endless')), 8, 1)
  assert.ok(finished.endReason)
  const replay = createRound(finished.mode, finished.duration)
  assert.equal(replay.elapsed, 0)
  assert.equal(replay.hits, 0)
  assert.equal(replay.misses, 0)
  assert.equal(replay.endReason, null)
})
