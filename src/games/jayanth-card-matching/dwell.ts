export type Dwell = { target: string | null; since: number; blocked: string | null; releasedAt: number | null }
export const initialDwell = (): Dwell => ({ target: null, since: 0, blocked: null, releasedAt: null })
export function blockDwell(id: string | null = null): Dwell { return { ...initialDwell(), blocked: id } }
// Only the consumed card is locked. A DIFFERENT valid card starts its own
// full dwell immediately, without requiring travel outside the answer area.
export function stepDwell(state: Dwell, target: string | null, visible: boolean, _overCard: boolean, now: number, duration = 1000): { state: Dwell; progress: number; selection: string | null } {
  if (!visible) return { state: { ...state, target: null, releasedAt: null }, progress: 0, selection: null }
  if (state.blocked && target !== state.blocked) {
    const releasedAt = state.releasedAt ?? now
    state = { ...state, releasedAt, blocked: now - releasedAt >= 200 ? null : state.blocked }
  } else if (target === state.blocked) state = { ...state, releasedAt: null }
  if (!target || target === state.blocked) {
    return { state: { ...state, target: null }, progress: 0, selection: null }
  }
  const since = target === state.target ? state.since : now
  const progress = Math.min(1, Math.max(0, (now - since) / Math.max(600, duration)))
  return progress >= 1 ? { state: blockDwell(target), progress: 1, selection: target }
    : { state: { ...state, target, since }, progress, selection: null }
}
