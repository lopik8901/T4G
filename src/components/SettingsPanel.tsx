import { Hand, Maximize, Minus, Plus, RotateCcw, SlidersHorizontal, Volume2, X } from 'lucide-react'
import { balloonSpeeds, type Settings } from '../game/logic'

type Props = { settings: Settings; onChange: (settings: Settings) => void; onReset: () => void; onFullscreen: () => void; onClose: () => void; cameraOn: boolean }
export function SettingsPanel({ settings, onChange, onReset, onFullscreen, onClose, cameraOn }: Props) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  return <>
    <div className="panel-heading"><span className="eyebrow"><SlidersHorizontal size={16} /> Staff controls</span><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={20} /></button></div>
    <h2>Make it comfortable.</h2>
    <p className="muted panel-description">Adjust the activity to suit your residents.</p>
    <div className="setting">
      <label>Game mode</label>
      <div className="segmented" aria-label="Game mode">
        <button
          aria-pressed={settings.speed === balloonSpeeds.standard}
          onClick={() => update('speed', balloonSpeeds.standard)}
        >Standard</button>
        <button
          aria-pressed={settings.speed === balloonSpeeds.veryFast}
          onClick={() => update('speed', balloonSpeeds.veryFast)}
        >Very fast</button>
      </div>
      <p className="field-note">Very fast is 16 times standard speed. Balloons are easy to miss!</p>
    </div>
    <div className="setting">
      <div className="setting-label">
        <label htmlFor="speed">Balloon speed</label>
        <span>
          {settings.speed === balloonSpeeds.standard ? 'Standard' : settings.speed === balloonSpeeds.veryFast ? 'Very fast' : 'Custom'}
        </span>
      </div>
      <input
        id="speed"
        type="range"
        min="0.3"
        max={balloonSpeeds.veryFast}
        step="0.1"
        value={settings.speed}
        onChange={event => update('speed', Number(event.target.value))}
      />
      <div className="range-labels"><span>Slower</span><span>Faster</span></div>
    </div>
    <div className="setting"><label>Balloon size</label><div className="segmented" aria-label="Balloon size">{[['Standard', 0.85], ['Large', 1.15], ['Extra large', 1.45]].map(([label, value]) => <button key={label} aria-pressed={settings.size === value} onClick={() => update('size', +value)}>{label}</button>)}</div></div>
    <div className="setting setting-row"><label htmlFor="count">Balloons on screen</label><div className="stepper"><button aria-label="Fewer balloons" disabled={settings.count <= 3} onClick={() => update('count', settings.count - 1)}><Minus size={16} /></button><output id="count">{settings.count}</output><button aria-label="More balloons" disabled={settings.count >= 6} onClick={() => update('count', settings.count + 1)}><Plus size={16} /></button></div></div>
    <div className="setting"><div className="setting-label"><label htmlFor="volume"><Volume2 size={17} /> Sound volume</label><span>{Math.round(settings.volume * 100)}%</span></div><input id="volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e => update('volume', +e.target.value)} /></div>
    <div className="setting"><div className="setting-label"><label htmlFor="sensitivity"><Hand size={17} /> Touch sensitivity</label><span>{settings.sensitivity > 1.5 ? 'Extra generous' : 'Generous'}</span></div><input id="sensitivity" type="range" min="1" max="2" step="0.1" value={settings.sensitivity} onChange={e => update('sensitivity', +e.target.value)} /><p className="field-note">Higher makes balloons easier to reach.</p></div>
    <div className="setting setting-row"><label htmlFor="indicators">Show hand glow</label><button id="indicators" type="button" className="switch" role="switch" aria-checked={settings.indicators} onClick={() => update('indicators', !settings.indicators)}><span /></button></div>
    <div className="setting"><label htmlFor="hands">Hands to track</label><select id="hands" value={settings.hands} disabled={cameraOn} onChange={e => update('hands', +e.target.value)}><option value="2">2 hands · recommended</option><option value="4">4 hands · two residents</option></select><p className="field-note">{cameraOn ? 'End this activity to change the hand limit.' : 'Use 2 hands for the smoothest experience.'}</p></div>
    <div className="panel-actions"><button className="secondary-button" onClick={onFullscreen}><Maximize size={18} /> Fullscreen</button><button className="text-button" onClick={onReset}><RotateCcw size={16} /> Reset score</button></div>
  </>
}
