export type RoundMode = 'timed' | 'endless'

export type Round = {
  mode: RoundMode
  duration: number
  elapsed: number
  hits: number
  misses: number
  endReason: 'time-up' | 'missed-balloon' | null
}

export function createRound(mode: RoundMode = 'timed', duration = 60): Round {
  return { mode, duration, elapsed: 0, hits: 0, misses: 0, endReason: null }
}

// Called only during active play. Pausing therefore freezes the round clock.
export function advanceRound(round: Round, seconds: number, missedBalloons: number): Round {
  if (round.endReason) return round

  const elapsed = round.elapsed + Math.max(0, seconds)
  const misses = round.misses + missedBalloons
  if (round.mode === 'timed') {
    return {
      ...round,
      elapsed: Math.min(round.duration, elapsed),
      misses,
      endReason: elapsed >= round.duration ? 'time-up' : null,
    }
  }

  return { ...round, elapsed, misses, endReason: misses > 0 ? 'missed-balloon' : null }
}

export function recordRoundHit(round: Round): Round {
  return round.endReason ? round : { ...round, hits: round.hits + 1 }
}
