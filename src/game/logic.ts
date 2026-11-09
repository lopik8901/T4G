export type Point = { x: number; y: number }
export type Settings = {
  speed: number
  size: number
  count: number
  volume: number
  sensitivity: number
  indicators: boolean
  hands: number
  penaltyBalloons: boolean
}

// Both screens use these same speeds so the mode controls stay in sync.
export const balloonSpeeds = {
  standard: 1.5,
  veryFast: 24, // Sixteen times standard: balloons cross the screen in a few seconds.
}

export const defaultSettings: Settings = {
  speed: balloonSpeeds.standard,
  size: 1.15,
  count: 4,
  volume: 0.3,
  sensitivity: 1.35,
  indicators: true,
  hands: 2,
  penaltyBalloons: false,
}
export const colors = ['#ed6973', '#73b1e6', '#efc75c', '#7bbd98', '#a48dd1']
export const colorNames = ['rainbow', 'blue', 'yellow', 'green', 'purple']
export type Balloon = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  phase: number
  color: number
  readyAt: number
  penalty: boolean
}
export type World = { time: number; balloons: Balloon[] }

export function balloonPoints(balloon: Balloon): number {
  if (balloon.penalty) return -3
  return balloon.color === 0 ? 3 : 1
}

// Match object-fit: cover before mirroring; this also handles portrait and TV crops.
export function mapToMirror(point: Point, videoWidth: number, videoHeight: number, width: number, height: number): Point {
  const scale = Math.max(width / videoWidth, height / videoHeight)
  return {
    x: 1 - (point.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width,
    y: (point.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height,
  }
}
export function balloonRadius(width: number, height: number, size: number) {
  return Math.max(30, Math.min(88, Math.min(width, height) * 0.073)) * size
}
export function overlaps(point: Point, balloon: Point, radius: number, width: number, height: number, sensitivity: number) {
  return ((point.x - balloon.x) * width / (radius * sensitivity)) ** 2 +
    ((point.y - balloon.y) * height / (radius * 1.23 * sensitivity)) ** 2 <= 1
}
type WorldOptions = { startEmpty?: boolean; penaltyBalloons?: boolean }

export function createWorld({ startEmpty = false, penaltyBalloons = false }: WorldOptions = {}): World {
  return { time: 0, balloons: Array.from({ length: 6 }, (_, id) => {
    const balloon: Balloon = {
      id, x: [0.16, 0.81, 0.25, 0.75, 0.5, 0.43][id],
      y: [0.34, 0.31, 0.76, 0.73, 0.19, 0.85][id], phase: id * 1.8, color: id % 5, readyAt: 0,
      vx: 0, vy: 0, speed: 1,
      penalty: penaltyBalloons && id === 2,
    }
    setFlight(balloon, id % 4)
    // Endless starts empty, then releases each balloon from an edge in turn.
    // Once released, every balloon keeps returning after a pop as usual.
    if (startEmpty) balloon.readyAt = 1 + id * 0.6
    return balloon
  }) }
}
function setFlight(balloon: Balloon, edge: number) {
  const drift = (Math.random() - 0.5) * 0.5
  const direction = [[drift, -1], [-1, drift], [drift, 1], [1, drift]][edge]
  const length = Math.hypot(...direction)
  balloon.vx = direction[0] / length
  balloon.vy = direction[1] / length
  balloon.speed = 0.7 + Math.random() * 0.6
}
function respawn(balloon: Balloon, penaltyBalloons: boolean) {
  const edge = Math.floor(Math.random() * 4)
  const position = 0.2 + Math.random() * 0.6
  balloon.x = [position, 1.15, position, -0.15][edge]
  balloon.y = [1.15, position, -0.15, position][edge]
  balloon.readyAt = 0
  balloon.color = Math.floor(Math.random() * colors.length)
  // When enabled, roughly one in five returning balloons should be dodged.
  balloon.penalty = penaltyBalloons && Math.random() < 0.2
  setFlight(balloon, edge)
}
export function popBalloon(world: World, balloon: Balloon): number {
  if (balloon.readyAt > world.time) return 0
  balloon.readyAt = world.time + 1.2
  return balloonPoints(balloon)
}
export function stepWorld(world: World, delta: number, settings: Settings, reducedMotion = false, aspectRatio = 1) {
  let missedBalloons = 0
  const dt = Math.min(delta, 0.05)
  const previous = world.time
  world.time += dt
  for (const balloon of world.balloons.slice(0, settings.count)) {
    if (!settings.penaltyBalloons) balloon.penalty = false
    if (balloon.readyAt > world.time) continue
    if (balloon.readyAt > 0) respawn(balloon, settings.penaltyBalloons)
    const distance = dt * 0.023 * settings.speed * balloon.speed
    const sway = reducedMotion ? 0 : (Math.sin(world.time * 0.6 + balloon.phase) - Math.sin(previous * 0.6 + balloon.phase)) * 0.008
    // Use the shorter screen dimension so horizontal travel stays gentle on a TV.
    balloon.x += (balloon.vx * distance - balloon.vy * sway) * Math.min(1, 1 / aspectRatio)
    balloon.y += (balloon.vy * distance + balloon.vx * sway) * Math.min(1, aspectRatio)
    if (balloon.x < -0.25 || balloon.x > 1.25 || balloon.y < -0.25 || balloon.y > 1.25) {
      // Dodging a penalty is safe, including in Endless.
      if (!balloon.penalty) missedBalloons++
      respawn(balloon, settings.penaltyBalloons)
    }
  }
  return missedBalloons
}
