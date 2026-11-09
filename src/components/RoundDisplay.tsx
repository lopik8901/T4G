import { ArrowLeft, Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Round } from '../game/round'

export function RoundStatus({ round }: { round: Round }) {
  return <div className="round-status" aria-label="Round progress">
    <span>{round.mode === 'timed' ? 'Standard timed round' : 'Endless · one miss ends the round'}</span>
    <strong>{round.hits} {round.hits === 1 ? 'balloon' : 'balloons'} popped</strong>
    <span>
      {round.mode === 'timed'
        ? `${Math.ceil(round.duration - round.elapsed)} seconds left`
        : `${Math.floor(round.elapsed)} seconds survived`}
    </span>
  </div>
}

type ResultsProps = {
  round: Round
  score: number
  bestHits: number
  ready: boolean
  onReplay: () => void
  onExit: () => void
}

export function RoundResults({ round, score, bestHits, ready, onReplay, onExit }: ResultsProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  return <div className="pause-overlay round-results" role="region" aria-labelledby="results-title">
    <h2 id="results-title" tabIndex={-1} ref={heading}>
      {round.endReason === 'time-up' ? 'Time’s up!' : 'Round over'}
    </h2>
    <p>{round.endReason === 'time-up' ? 'Your timed round is complete.' : 'A balloon got away. Try to beat your total next round!'}</p>
    <dl className="round-totals">
      <div><dt>Balloons popped</dt><dd>{round.hits}</dd></div>
      <div><dt>Points</dt><dd>{score}</dd></div>
      <div><dt>Time played</dt><dd>{Math.floor(round.elapsed)}s</dd></div>
    </dl>
    <p className="round-record">
      Best {round.mode === 'timed' ? `${round.duration}-second timed` : 'Endless'} round this visit: {bestHits} {bestHits === 1 ? 'balloon' : 'balloons'}.
    </p>
    <p>Every balloon counts as one pop. Red balloons give three points.</p>
    <button className="primary-button" onClick={onReplay} disabled={!ready}><Play size={18} /> Play again</button>
    <button className="text-button" onClick={onExit}><ArrowLeft size={16} /> Back to setup</button>
  </div>
}
