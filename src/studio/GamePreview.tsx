import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Hand, Maximize, Mic, Pause, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { useMirror } from '../camera/useMirror'
import { BalloonScene, PopEffects, type Pop } from '../game/BalloonScene'
import { balloonRadius, colors, createWorld, mapToMirror, overlaps, stepWorld } from '../game/logic'
import { Button } from '../components/ui/button'
import type { GameConfig } from './config'
import { useSound } from './useSound'
import { activityAudio } from './audio'
import { interact, type ActivityObject } from './rules'
import { ExperimentalPreview } from './ExperimentalPreview'

export function ObjectArt({ kind, grown = false, color = '#ec8d98' }: { kind: string; grown?: boolean; color?: string }) {
  return <svg viewBox="0 0 120 140" aria-hidden="true" className="object-art">
    {['circle', 'bubble', 'fish', 'pond'].includes(kind) && <ellipse cx="60" cy="70" rx="45" ry={kind === 'pond' ? 22 : 40} fill={color} />}
    {kind === 'balloon' && <><defs><radialGradient id={`shine-${color.replace('#', '')}`} cx="30%" cy="25%"><stop stopColor="#fff" stopOpacity=".8" /><stop offset=".2" stopColor={color} /><stop offset="1" stopColor={color} /></radialGradient></defs><ellipse cx="60" cy="53" rx="39" ry="48" fill={`url(#shine-${color.replace('#', '')})`} /><path d="m60 100-5 7h10zm0 7c-18 12 14 14 0 30" fill="none" stroke={color} strokeWidth="2" /></>}
    {kind === 'seed' && <><path d="M60 125V65" stroke="#579775" strokeWidth="5" strokeLinecap="round" /><path d="M60 103C18 100 25 72 32 74c24-1 28 29 28 29M60 89c39-3 36-28 30-26-24 0-30 26-30 26" fill="#89b48a" />{grown ? <><g fill={color}>{[0, 60, 120, 180, 240, 300].map(angle => <ellipse key={angle} cx="60" cy="35" rx="15" ry="23" transform={`rotate(${angle} 60 58)`} />)}</g><circle cx="60" cy="58" r="15" fill="#f5d27d" /></> : <ellipse cx="60" cy="62" rx="17" ry="23" fill="#a0be78" />}</>}
    {kind === 'butterfly' && <><path d="M57 65C0-8 0 84 48 83 4 130 65 131 60 76M63 65C120-8 120 84 72 83c44 47-17 48-12-7" fill={color} /><path d="M60 56v42m0-42-9-13m9 13 9-13" stroke="#667369" strokeWidth="4" strokeLinecap="round" /><circle cx="30" cy="56" r="9" fill="#fff8" /><circle cx="90" cy="56" r="9" fill="#fff8" /></>}
    {kind === 'fruit' && <><path d="M60 43c-18-20-48-4-42 33 6 45 33 48 42 38 11 10 36 6 43-38 6-37-24-53-43-33" fill={color} /><path d="M60 44c-4-22 3-27 8-33" stroke="#74624a" strokeWidth="6" /><ellipse cx="77" cy="28" rx="19" ry="9" transform="rotate(-30 77 28)" fill="#79aa7d" /><path d="M34 58q-8 18 0 32" fill="none" stroke="#fff7" strokeWidth="6" strokeLinecap="round" /></>}
    {kind === 'photo' && <><rect x="9" y="14" width="102" height="110" rx="12" fill="#f8ead1" /><rect x="18" y="24" width="84" height="77" rx="5" fill="#bbd8d0" /><circle cx="79" cy="43" r="11" fill="#f5d995" /><path d="m18 95 26-38 24 26 15-18 19 30" fill="#79a489" /><path d="M36 112h48" stroke="#d6c6aa" strokeWidth="3" /></>}
  </svg>
}

export function GamePreview({ config, photos, launched, onExit }: { config: GameConfig; photos: string[]; launched: boolean; onExit: () => void }) {
  return config.experimental ? <ExperimentalPreview key={config.experimental.id} config={config} launched={launched} onExit={onExit} /> : <TrustedGamePreview config={config} photos={photos} launched={launched} onExit={onExit} />
}
function TrustedGamePreview({ config, photos, launched, onExit }: { config: GameConfig; photos: string[]; launched: boolean; onExit: () => void }) {
  const mirror = useMirror(config.players * 2)
  const [playing, setPlaying] = useState(false), [score, setScore] = useState(0), [progress, setProgress] = useState(0), [pops, setPops] = useState<Pop[]>([]), [message, setMessage] = useState('')
  const stage = useRef<HTMLDivElement>(null), world = useRef(createWorld()), objects = useRef<ActivityObject[]>([]), targets = useRef<(HTMLButtonElement | null)[]>([])
  const handRings = useRef<(HTMLDivElement | null)[]>([])
  const audio = useRef<ReturnType<typeof activityAudio> | null>(null), cooldown = useRef<number[]>([]), timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const reduced = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches)
  const settings = { speed: config.speed, size: config.size, count: config.count, volume: config.volume, sensitivity: config.sensitivity, indicators: true, penaltyBalloons: false, hands: config.players * 2 }
  const reset = useCallback(() => { world.current = createWorld(); objects.current = Array.from({ length: 6 }, (_, id) => ({ id, done: false, progress: 0 })); cooldown.current = []; setScore(0); setProgress(0); setPops([]) }, [])
  useEffect(() => { reset() }, [config.template, config.object, reset])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => { reduced.current = media.matches }; media.addEventListener('change', change)
    const pause = () => { if (document.hidden) setPlaying(false) }; document.addEventListener('visibilitychange', pause)
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', pause); audio.current?.dispose(); timers.current.forEach(clearTimeout) }
  }, [])
  useEffect(() => { if (mirror.cameraOn) { mirror.stop(); setPlaying(false) } }, [config.players])
  useEffect(() => { audio.current?.music(playing && config.music, config.volume) }, [playing, config.music, config.volume])
  useEffect(() => { if (mirror.status === 'error') setPlaying(false) }, [mirror.status])
  const popped = (pop: Pop) => {
    if (config.scoring) setScore(v => v + pop.points)
    audio.current?.pop(config.volume)
    setPops(v => [...v, { ...pop, points: config.scoring ? pop.points : 0 }])
    const timer = setTimeout(() => { setPops(v => v.filter(p => p.id !== pop.id)); timers.current = timers.current.filter(t => t !== timer) }, 900)
    timers.current.push(timer)
  }
  const hit = (i: number) => {
    const interval = config.template === 'memory' ? 400 / config.speed : 650
    if (!playing || performance.now() - (cooldown.current[i] ?? -2000) < interval) return
    const object = objects.current[i]
    if (!object) return
    cooldown.current[i] = performance.now()
    if (config.template === 'balloons') {
      const balloon = world.current.balloons[i]
      if (balloon.readyAt > world.current.time) return
      balloon.readyAt = world.current.time + 1.2
      popped({ id: performance.now(), x: balloon.x, y: balloon.y, color: colors[balloon.color], points: config.object === 'balloon' && balloon.color === 0 ? 3 : 1 })
    } else {
      const result = interact(object, config)
      if (result.changed) { setProgress(objects.current.filter(o => o.done).length); setScore(v => v + result.points); audio.current?.pop(config.volume) }
    }
  }
  const hitRef = useRef(hit); hitRef.current = hit
  const sound = useSound(config.soundThreshold, () => {
    const index = config.template === 'balloons' ? world.current.balloons.findIndex(b => b.readyAt <= world.current.time && b.x > 0 && b.x < 1 && b.y > 0 && b.y < 1) : objects.current.slice(0, config.count).findIndex(o => !o.done)
    if (index >= 0) hitRef.current(index)
  }, playing)
  useEffect(() => { if (!config.inputs.includes('sound_detection')) sound.stop() }, [config.inputs.join(',')])
  const renderBalloon = config.template === 'balloons' && config.object === 'balloon'
  useEffect(() => {
    if (renderBalloon) return
    let frame = 0, last = performance.now()
    const update = (now: number) => {
      const rect = stage.current?.getBoundingClientRect()
      const delta = Math.min((now - last) / 1000, 0.05); last = now
      if (rect) {
        const handFrame = mirror.frameRef.current
        handRings.current.forEach((ring, i) => {
          if (!ring) return
          const hand = handFrame.hands[i]
          ring.style.display = hand && config.inputs.includes('hand_tracking') && now - handFrame.time < 280 ? 'block' : 'none'
          if (hand) { const point = mapToMirror(hand.center, handFrame.width, handFrame.height, rect.width, rect.height); ring.style.left = `${point.x * 100}%`; ring.style.top = `${point.y * 100}%` }
        })
      }
      if (rect && playing) {
        if (config.template === 'balloons') stepWorld(world.current, delta, settings, reduced.current, rect.width / rect.height)
        const handFrame = mirror.frameRef.current
        const hands = config.inputs.includes('hand_tracking') && now - handFrame.time < 280 ? handFrame.hands.map(h => mapToMirror(h.center, handFrame.width, handFrame.height, rect.width, rect.height)) : []
        targets.current.forEach((target, i) => {
          if (!target || i >= config.count) return
          const floating = config.template === 'balloons', balloon = world.current.balloons[i]
          const point = floating ? balloon : { x: [0.22, 0.5, 0.78, 0.22, 0.5, 0.78][i], y: i < 3 ? 0.4 : 0.73 }
          target.style.left = `${point.x * 100}%`; target.style.top = `${point.y * 100}%`
          target.style.visibility = floating && balloon.readyAt > world.current.time ? 'hidden' : 'visible'
          const object = objects.current[i]
          if (object) {
            target.dataset.grown = String(object.done)
            target.style.setProperty('--reveal', `${object.progress * 100}%`)
            target.setAttribute('aria-label', config.template === 'memory' ? `Reveal photo ${i + 1}, ${object.progress * 100}% revealed` : config.template === 'garden' ? `${object.done ? 'Flower' : 'Grow seed'} ${i + 1}` : `Collect ${config.object} ${i + 1}`)
          }
          if (hands.some(p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && overlaps(p, point, balloonRadius(rect.width, rect.height, config.size), rect.width, rect.height, config.sensitivity))) hitRef.current(i)
        })
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update); return () => cancelAnimationFrame(frame)
  }, [config, playing, renderBalloon])

  const toggle = () => {
    audio.current ??= activityAudio()
    audio.current.music(!playing && config.music, config.volume)
    setPlaying(v => !v)
  }
  const fullscreen = async () => { try { await stage.current?.requestFullscreen() } catch { setMessage('Fullscreen is unavailable here. Use your browser’s fullscreen control.') } }
  return <div className={`cp-preview ${launched ? 'cp-launched' : ''}`}>
    <div className="cp-preview-heading"><span><span className="cp-live-dot" /> Playable preview</span><span>All processing stays on this device</span></div>
    <div ref={stage} className={`cp-game-stage theme-${config.theme}`}>
      <video ref={mirror.videoRef} autoPlay playsInline muted className="cp-camera" style={{ visibility: mirror.cameraOn ? 'visible' : 'hidden' }} />
      {!renderBalloon && Array.from({ length: config.players * 2 }, (_, i) => <div key={i} ref={node => { handRings.current[i] = node }} className="cp-hand-glow" aria-hidden="true" />)}
      <div className="cp-stage-label">{mirror.cameraOn ? 'Live mirror' : 'Touch preview · camera off'}</div>
      {config.scoring && <div className="cp-score"><small>POINTS</small><strong>{score}</strong></div>}
      {renderBalloon ? <BalloonScene world={world} hands={mirror.frameRef} settings={settings} playing={playing} preview={!config.inputs.includes('hand_tracking')} reducedMotion={reduced.current} onPop={popped} /> : <div className="cp-object-layer">{Array.from({ length: config.count }, (_, i) => <button ref={node => { targets.current[i] = node }} key={`${config.template}-${i}`} className={`cp-game-object cp-object-${config.template}`} onClick={() => hit(i)} disabled={!playing} style={{ left: `${[22, 50, 78, 22, 50, 78][i]}%`, top: `${i < 3 ? 40 : 73}%`, width: `${(config.template === 'memory' ? 140 : 95) * config.size}px` }} aria-label={config.template === 'memory' ? `Reveal photo ${i + 1}` : `Grow seed ${i + 1}`}>
        {config.template === 'memory' ? <><div className="cp-photo">{photos[i % Math.max(1, photos.length)] ? <img src={photos[i % photos.length]} alt={`Staff-selected memory ${i + 1}`} /> : <ObjectArt kind="photo" />}</div><div className="cp-photo-cover"><span>Reach to reveal</span><Hand size={24} /></div></> : config.template === 'garden' ? <><div className="cp-seed"><ObjectArt kind="seed" color={colors[i % 5]} /></div><div className="cp-flower" style={{ transitionDuration: `${1 / config.speed}s` }}><ObjectArt kind="seed" grown color={colors[i % 5]} /></div></> : <ObjectArt kind={config.object} color={colors[i % 5]} />}
      </button>)}</div>}
      <PopEffects pops={pops.filter(p => p.points > 0)} reducedMotion={reduced.current} />
      {config.template === 'garden' && progress > 0 && <div className="cp-butterfly"><ObjectArt kind="butterfly" color="#c1a2df" /></div>}
      {!playing && <div className="cp-stage-pause"><div><Play size={28} /><h3>{score || progress ? 'A moment to pause' : 'A little play goes a long way'}</h3><p>{config.template === 'garden' ? 'Reach toward a seed and watch it bloom.' : config.template === 'memory' ? 'Touch a photo a few times to reveal a memory.' : 'Reach for a balloon. Enjoy the little pops.'}</p><Button onClick={toggle}><Play size={16} /> {score || progress ? 'Resume preview' : 'Start preview'}</Button></div></div>}
      <div className="cp-stage-instruction">{config.template === 'garden' ? `${progress} flowers grown together` : config.template === 'memory' ? `${progress} memories revealed` : mirror.handCount ? `${mirror.handCount} hands detected` : 'Reach out. Take your time.'}</div>
      {launched && <Button className="cp-exit-play" variant="outline" onClick={() => { setPlaying(false); mirror.stop(); sound.stop(); onExit() }}>Back to editor</Button>}
      <div className="cp-fullscreen-controls"><Button variant="outline" onClick={toggle}>{playing ? 'Pause' : 'Resume'}</Button><Button variant="outline" onClick={reset}>Restart</Button><Button variant="outline" onClick={() => void document.exitFullscreen()}>Exit fullscreen</Button></div>
    </div>
    <div className="cp-preview-controls"><Button variant="outline" onClick={toggle}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Start'}</Button><Button variant="ghost" onClick={reset} aria-label="Restart game"><RotateCcw size={17} /></Button><Button variant="outline" disabled={mirror.status === 'requesting' || mirror.status === 'loading'} onClick={() => { if (mirror.cameraOn) mirror.stop(); else void mirror.start() }}><Camera size={17} />{mirror.cameraOn ? 'Camera off' : 'Enable camera'}</Button>{config.inputs.includes('sound_detection') && <Button variant="outline" onClick={() => sound.active ? sound.stop() : void sound.start()}><Mic size={17} />{sound.active ? 'Mic off' : 'Enable mic'}</Button>}<Button variant="ghost" onClick={fullscreen} aria-label="Fullscreen preview"><Maximize size={17} /></Button></div>
    {(mirror.error || sound.error || message) && <p role="alert" className="cp-error">{mirror.error || sound.error || message}</p>}
    {mirror.status === 'loading' && <p role="status" className="cp-caption">Loading local hand tracking…</p>}
    <div className="cp-preview-foot"><span><ShieldCheck size={15} /> Camera & microphone stay local</span><span><Check size={15} /> {config.seated ? 'Seated play friendly' : 'Standing activity'}</span></div>
  </div>
}
