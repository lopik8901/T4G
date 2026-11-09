export type Point = { x: number; y: number }
export type Settings = { speed: number; size: number; count: number; volume: number; sensitivity: number; indicators: boolean; hands: number }
export const defaultSettings: Settings = {
  speed: 1.5, // The former Lively pace is now the standard speed.
  size: 1.15,
  count: 4,
  volume: 0.3,
  sensitivity: 1.35,
  indicators: true,
  hands: 2,
}
export const colors = ['#ed6973', '#73b1e6', '#efc75c', '#7bbd98', '#a48dd1']
export const colorNames = ['red', 'blue', 'yellow', 'green', 'purple']
export type Balloon = { id: number; x: number; y: number; vx: number; vy: number; speed: number; phase: number; color: number; readyAt: number }
export type World = { time: number; balloons: Balloon[] }

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
export function createWorld(): World {
  return { time: 0, balloons: Array.from({ length: 6 }, (_, id) => {
    const balloon: Balloon = {
      id, x: [0.16, 0.81, 0.25, 0.75, 0.5, 0.43][id],
      y: [0.34, 0.31, 0.76, 0.73, 0.19, 0.85][id], phase: id * 1.8, color: id % 5, readyAt: 0,
      vx: 0, vy: 0, speed: 1,
    }
    setFlight(balloon, id % 4)
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
function respawn(balloon: Balloon) {
  const edge = Math.floor(Math.random() * 4)
  const position = 0.2 + Math.random() * 0.6
  balloon.x = [position, 1.15, position, -0.15][edge]
  balloon.y = [1.15, position, -0.15, position][edge]
  balloon.readyAt = 0
  balloon.color = Math.floor(Math.random() * colors.length)
  setFlight(balloon, edge)
}
export function popBalloon(world: World, balloon: Balloon): number {
  if (balloon.readyAt > world.time) return 0
  balloon.readyAt = world.time + 1.2
  return balloon.color === 0 ? 3 : 1
}
export function stepWorld(world: World, delta: number, settings: Settings, reducedMotion = false, aspectRatio = 1) {
  const dt = Math.min(delta, 0.05)
  const previous = world.time
  world.time += dt
  for (const balloon of world.balloons.slice(0, settings.count)) {
    if (balloon.readyAt > world.time) continue
    if (balloon.readyAt > 0) respawn(balloon)
    const distance = dt * 0.023 * settings.speed * balloon.speed
    const sway = reducedMotion ? 0 : (Math.sin(world.time * 0.6 + balloon.phase) - Math.sin(previous * 0.6 + balloon.phase)) * 0.008
    // Use the shorter screen dimension so horizontal travel stays gentle on a TV.
    balloon.x += (balloon.vx * distance - balloon.vy * sway) * Math.min(1, 1 / aspectRatio)
    balloon.y += (balloon.vy * distance + balloon.vx * sway) * Math.min(1, aspectRatio)
    if (balloon.x < -0.25 || balloon.x > 1.25 || balloon.y < -0.25 || balloon.y > 1.25) respawn(balloon)
  }
}
