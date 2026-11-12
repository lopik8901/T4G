import { useState } from 'react'
import { ChevronDown, ImagePlus, SlidersHorizontal } from 'lucide-react'
import { useStudio } from './store'
import { accessibilityNotes, templateGame, type GamePatch, type Template } from './config'
import { Button } from '../components/ui/button'

export function StudioSettings() {
  const { config: c, change, photos, setPhotos } = useStudio(), [error, setError] = useState('')
  const update = (patch: GamePatch) => { try { change(patch, 'Updated activity settings'); setError('') } catch { setError('Please choose a valid setting.') } }
  const upload = async (files: FileList | null) => {
    if (!files) return
    try {
      const selected = Array.from(files)
      if (selected.length > 6 || selected.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024)) throw new Error('Choose up to 6 JPEG, PNG, or WebP photos, each under 5 MB.')
      const images = await Promise.all(selected.map(async file => {
        const image = await createImageBitmap(file)
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height)), canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height); image.close()
        return canvas.toDataURL('image/jpeg', 0.85)
      }))
      setPhotos(images); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read these photos.') }
  }
  const range = (label: string, key: 'size' | 'speed' | 'count' | 'volume' | 'sensitivity' | 'soundThreshold', min: number, max: number, step: number) => <label className="cp-setting"><span>{label}<output>{key === 'volume' ? `${Math.round(c[key] * 100)}%` : c[key].toFixed(key === 'count' ? 0 : 1)}</output></span><input type="range" aria-label={label} value={c[key]} min={min} max={max} step={step} onChange={e => update({ [key]: +e.target.value })} /></label>
  return <aside className="cp-settings"><div className="cp-panel-title"><SlidersHorizontal size={17} /><h2>Activity settings</h2></div><p className="cp-caption">Small adjustments. A better fit.</p>
    <label className="cp-setting">Activity title<input value={c.name} maxLength={80} onChange={e => { if (e.target.value.trim()) update({ name: e.target.value }) }} /></label>
    {!c.experimental && <><label className="cp-setting">Activity type<select value={c.template} onChange={e => { const t = e.target.value as Template, defaults = templateGame(t); update({ template: t, object: defaults.object, scoring: defaults.scoring }) }}><option value="balloons">Balloon Pop</option><option value="garden">Collaborative Garden</option><option value="memory">Memory Reveal</option></select></label>
    {c.template === 'balloons' && <label className="cp-setting">Objects<select value={c.object} onChange={e => update({ object: e.target.value as GamePatch['object'] })}><option value="balloon">Balloons</option><option value="butterfly">Butterflies</option><option value="fruit">Fruit</option></select></label>}
    </>}
    {c.experimental && <p className="cp-caption">Ask the assistant to change objects, collision zones or game rules. Changes rebuild an isolated preview.</p>}
    <label className="cp-setting">Interaction<select value={c.inputs.join(',')} onChange={e => update({ inputs: e.target.value.split(',') as typeof c.inputs })}><option value="hand_tracking">Hand tracking</option><option value="sound_detection">Sound detection</option><option value="hand_tracking,sound_detection">Hands + sound</option></select></label>
    {!c.experimental && range('Object size', 'size', 0.8, 2, 0.1)}{range('Movement speed', 'speed', 0.2, 1.8, 0.1)}{!c.experimental && range('Number of objects', 'count', 3, 6, 1)}
    <label className="cp-setting">Participants<select value={c.players} onChange={e => update({ players: +e.target.value as 1 | 2 })}><option value="1">One resident</option><option value="2">Two residents · together</option></select></label>
    <label className="cp-setting">Difficulty<select value={c.difficulty} onChange={e => { const difficulty = e.target.value as typeof c.difficulty; update({ difficulty, ...(difficulty === 'easy' ? { size: 1.6, speed: 0.4, sensitivity: 1.8 } : difficulty === 'gentle' ? { size: 1.2, speed: 0.65, sensitivity: 1.4 } : { size: 1, speed: 1, sensitivity: 1.2 }) }) }}><option value="easy">Extra gentle</option><option value="gentle">Gentle</option><option value="steady">Steady</option></select></label>
    <label className="cp-setting">Colour theme<select value={c.theme} onChange={e => update({ theme: e.target.value as typeof c.theme })}><option value="meadow">Soft meadow</option><option value="sunshine">Warm sunshine</option><option value="ocean">Quiet ocean</option></select></label>
    {range('Sound volume', 'volume', 0, 0.6, 0.05)}{!c.experimental && range('Hand sensitivity', 'sensitivity', 1, 2, 0.1)}
    {c.inputs.includes('sound_detection') && <>{range('Sound threshold', 'soundThreshold', 0.03, 0.4, 0.01)}<p className="cp-caption">Lower responds to softer sounds. Use headphones if game audio triggers the microphone.</p></>}
    {(['scoring', 'seated', 'music'] as const).filter(key => !c.experimental || key !== 'scoring').map(key => <label className="cp-check" key={key}><span>{key === 'scoring' ? 'Show points' : key === 'seated' ? 'Seated activity' : 'Gentle background music'}</span><input type="checkbox" checked={c[key]} onChange={e => update({ [key]: e.target.checked })} /></label>)}
    {c.template === 'memory' && <div className="cp-upload"><ImagePlus size={22} /><label htmlFor="photos">Add familiar photos</label><p>Up to 6 images. Kept on this device.</p><input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => void upload(e.target.files)} /><span>{photos.length ? `${photos.length} photos selected` : 'Illustrated sample cards until photos are added'}</span>{photos.length > 0 && <Button variant="ghost" onClick={() => setPhotos([])}>Remove photos</Button>}</div>}
    {accessibilityNotes(c).map(note => <p className="cp-warning" key={note}>{note}</p>)}
    {error && <p className="cp-error" role="alert">{error}</p>}
    <details className="cp-advanced"><summary>Advanced configuration <ChevronDown size={14} /></summary><pre>{JSON.stringify(c, null, 2)}</pre></details>
  </aside>
}
