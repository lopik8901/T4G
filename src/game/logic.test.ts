import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, defaultSettings, mapToMirror, overlaps, popBalloon, stepWorld } from './logic.ts'

test('mirrors coordinates and compensates for a 4:3 camera cropped onto a 16:9 TV', () => {
  assert.deepEqual(mapToMirror({ x: 0.25, y: 0.5 }, 640, 480, 1920, 1080), { x: 0.75, y: 0.5 })
  assert.deepEqual(mapToMirror({ x: 0.5, y: 0.125 }, 640, 480, 1920, 1080), { x: 0.5, y: 0 })
  assert.deepEqual(mapToMirror({ x: 0.25, y: 0.5 }, 1920, 1080, 360, 640), { x: 1.2901234567901234, y: 0.5 })
})
test('generous collision covers the balloon edge but not a distant hand', () => {
  assert.ok(overlaps({ x: 0.56, y: 0.5 }, { x: 0.5, y: 0.5 }, 50, 1000, 600, 1.35))
  assert.ok(!overlaps({ x: 0.8, y: 0.5 }, { x: 0.5, y: 0.5 }, 50, 1000, 600, 1.35))
})
test('red awards three, other colors one, and simultaneous touches cannot double-score', () => {
  const world = createWorld()
  assert.equal(popBalloon(world, world.balloons[0]), 3)
  assert.equal(popBalloon(world, world.balloons[0]), 0)
  assert.equal(popBalloon(world, world.balloons[1]), 1)
})
test('popped balloons enter from all four edges and travel into the play area', context => {
  let draw = 0
  context.mock.method(Math, 'random', () => draw)
  for (let edge = 0; edge < 4; edge++) {
    draw = (edge + 0.5) / 4
    const world = createWorld()
    const balloon = world.balloons[0]
    popBalloon(world, balloon)
    for (let i = 0; i < 23; i++) stepWorld(world, 0.05, defaultSettings)
    assert.ok(balloon.readyAt > world.time, 'replacement waits for its cooldown')
    for (let i = 0; i < 2; i++) stepWorld(world, 0.05, defaultSettings)
    assert.equal(balloon.readyAt, 0)
    if (edge === 0) assert.ok(balloon.y > 1 && balloon.vy < 0)
    if (edge === 1) assert.ok(balloon.x > 1 && balloon.vx < 0)
    if (edge === 2) assert.ok(balloon.y < 0 && balloon.vy > 0)
    if (edge === 3) assert.ok(balloon.x < 0 && balloon.vx > 0)
    for (let i = 0; i < 500; i++) stepWorld(world, 0.05, defaultSettings)
    assert.ok(balloon.x > 0 && balloon.x < 1 && balloon.y > 0 && balloon.y < 1, 'new flight crosses the visible play area')
  }
})

test('missed balloons recycle after leaving any edge', context => {
  context.mock.method(Math, 'random', () => 0.5)
  for (const outside of [{ x: -0.26, y: 0.5 }, { x: 1.26, y: 0.5 }, { x: 0.5, y: -0.26 }, { x: 0.5, y: 1.26 }]) {
    const world = createWorld()
    const balloon = Object.assign(world.balloons[0], outside)
    stepWorld(world, 0.016, defaultSettings)
    assert.ok(balloon.x >= -0.15 && balloon.x <= 1.15 && balloon.y >= -0.15 && balloon.y <= 1.15)
    assert.equal(balloon.readyAt, 0)
  }
})

test('initial balloons have varied headings and individual gentle speeds', context => {
  let draw = 0
  context.mock.method(Math, 'random', () => { draw = (draw + 0.17) % 1; return draw })
  const { balloons } = createWorld()
  assert.ok(balloons[0].vy < 0 && balloons[1].vx < 0 && balloons[2].vy > 0 && balloons[3].vx > 0)
  assert.ok(new Set(balloons.map(balloon => balloon.speed)).size > 1)
  assert.ok(balloons.every(balloon => balloon.speed >= 0.7 && balloon.speed <= 1.3))
})

test('individual speeds and the staff pace control both scale travel', () => {
  const world = createWorld()
  const slow = Object.assign(world.balloons[0], { x: 0.5, y: 0.5, vx: 1, vy: 0, speed: 0.7 })
  const fast = Object.assign(world.balloons[1], { x: 0.5, y: 0.5, vx: 1, vy: 0, speed: 1.3 })
  const fasterPace = structuredClone(world)
  for (let i = 0; i < 20; i++) {
    stepWorld(world, 0.05, defaultSettings, true)
    stepWorld(fasterPace, 0.05, { ...defaultSettings, speed: defaultSettings.speed * 2 }, true)
  }
  assert.ok(Math.abs((fast.x - 0.5) / (slow.x - 0.5) - 1.3 / 0.7) < 1e-10)
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(fasterPace.balloons[i].x - 0.5 - (world.balloons[i].x - 0.5) * 2) < 1e-10)
})

test('horizontal and vertical speeds stay consistent on wide and portrait displays', () => {
  for (const [width, height] of [[1920, 1080], [375, 812]]) {
    const world = createWorld()
    const horizontal = Object.assign(world.balloons[0], { x: 0.5, y: 0.5, vx: 1, vy: 0, speed: 1 })
    const vertical = Object.assign(world.balloons[1], { x: 0.5, y: 0.5, vx: 0, vy: 1, speed: 1 })
    stepWorld(world, 0.05, defaultSettings, true, width / height)
    assert.ok(Math.abs((horizontal.x - 0.5) * width - (vertical.y - 0.5) * height) < 1e-10)
  }
})

test('a delayed frame does not make balloons jump across the screen', () => {
  const world = createWorld()
  const normalFrame = structuredClone(world)
  stepWorld(world, 5, defaultSettings)
  stepWorld(normalFrame, 0.05, defaultSettings)
  assert.deepEqual(world, normalFrame)
})
