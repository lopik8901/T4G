import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isHandClosed, type HandLandmark } from './handGestures.ts'

function handWithCurledFingers(curled: number): HandLandmark[] {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6 }))
  hand[0] = { x: 0.5, y: 0.8 }
  for (const [finger, base] of [5, 9, 13, 17].entries()) {
    const x = 0.44 + finger * 0.04
    hand[base] = { x, y: 0.6 }
    hand[base + 1] = { x, y: 0.5 }
    hand[base + 3] = { x, y: finger < curled ? 0.65 : 0.3 }
  }
  return hand
}

test('an open hand and one or two bent fingers do not count as a fist', () => {
  for (const curled of [0, 1, 2]) assert.equal(isHandClosed(handWithCurledFingers(curled)), false)
})

test('three or four curled fingers count as a fist at different scales and orientations', () => {
  for (const curled of [3, 4]) {
    const hand = handWithCurledFingers(curled)
    assert.equal(isHandClosed(hand), true)
    const rotated = hand.map(point => ({ x: 0.9 - point.y * 0.5, y: point.x * 0.5 }))
    assert.equal(isHandClosed(rotated), true)
  }
})

test('hysteresis keeps a nearly closed fist from repeatedly opening and closing', () => {
  const hand = handWithCurledFingers(4)
  for (const tip of [8, 12, 16, 20]) hand[tip].y = 0.49
  assert.equal(isHandClosed(hand, 1, false), false)
  assert.equal(isHandClosed(hand, 1, true), true)
})

test('missing or collapsed landmarks cannot create a grab', () => {
  assert.equal(isHandClosed([]), false)
  assert.equal(isHandClosed(Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }))), false)
})
