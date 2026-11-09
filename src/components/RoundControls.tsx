import type { RoundMode } from '../game/round'

type Props = {
  mode: RoundMode
  duration: number
  onModeChange: (mode: RoundMode) => void
  onDurationChange: (seconds: number) => void
}

export function RoundControls({ mode, duration, onModeChange, onDurationChange }: Props) {
  return <>
    <div className="quick-setting">
      <label htmlFor="round-mode">Round type</label>
      <select id="round-mode" value={mode} onChange={event => onModeChange(event.target.value as RoundMode)}>
        <option value="timed">Standard (timed)</option>
        <option value="endless">Endless</option>
      </select>
    </div>
    {mode === 'timed' && (
      <div className="quick-setting">
        <label htmlFor="round-duration">Time limit</label>
        <select id="round-duration" value={duration} onChange={event => onDurationChange(Number(event.target.value))}>
          <option value="30">30 seconds</option>
          <option value="60">60 seconds</option>
          <option value="90">90 seconds</option>
        </select>
      </div>
    )}
    <p className="field-note">
      {mode === 'timed'
        ? 'Pop as many balloons as you can before time runs out. Misses do not end the round.'
        : 'Start empty, then balloons arrive one after another. Missing a regular or rainbow balloon ends the round. Let penalty balloons pass.'}
    </p>
  </>
}
