import type { Entity, InputSnapshot } from './contract'
import { runtimeFrameSchema, type RuntimeFrame } from './scene'

export function safeRuntimeFrame(raw: unknown): RuntimeFrame | null {
  const parsed = runtimeFrameSchema.safeParse(raw)
  return parsed.success && new Set(parsed.data.entities.map(e => e.id)).size === parsed.data.entities.length ? parsed.data : null
}
export function entitiesFromScene(scene: import('./scene').Scene): Entity[] {
  return scene.entities.map(e => ({ id: e.id, kind: e.kind, position: { x: e.x, y: e.y }, radius: e.radius, visible: true, state: Object.fromEntries(e.state.map(p => [p.key, p.value])) }))
}
export function safeInput(input: InputSnapshot): InputSnapshot {
  const finite = (p: { x: number; y: number }) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
  return { time: Number.isFinite(input.time) ? input.time : 0, hands: input.hands.filter(h => finite(h.position)).slice(0, 4).map(h => ({ id: h.id.slice(0, 64), position: { x: h.position.x, y: h.position.y } })), sound: !!input.sound, pointer: input.pointer && finite(input.pointer) ? input.pointer : null }
}
