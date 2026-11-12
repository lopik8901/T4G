import type { HandFrame } from '../camera/useMirror'
import { mapToMirror } from '../game/logic'
import type { InputSnapshot } from './contract'

export function normalizedInput(frame: HandFrame, width: number, height: number, now: number, sound = false): InputSnapshot {
  return { time: now, sound, pointer: null, hands: now - frame.time > 280 || now < frame.time ? [] : frame.hands.map((hand, i) => ({ id: `hand-${i}`, position: mapToMirror(hand.center, frame.width, frame.height, width, height) })).filter(hand => hand.position.x >= 0 && hand.position.x <= 1 && hand.position.y >= 0 && hand.position.y <= 1) }
}
