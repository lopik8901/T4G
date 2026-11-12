import type { GameConfig } from './config'
export type ActivityObject = { id: number; progress: number; done: boolean }
export function interact(object: ActivityObject, config: GameConfig) {
  if (object.done) return { changed: false, points: 0 }
  object.progress = Math.min(1, object.progress + (config.template === 'memory' ? 0.25 : 1))
  object.done = object.progress === 1
  return { changed: true, points: object.done && config.scoring ? 1 : 0 }
}
