import { useEffect, useRef, useState } from 'react'
import { useMirror } from '../camera/useMirror'
import { normalizedInput } from '../engine/input'
import { safeInput, safeRuntimeFrame } from '../engine/runtime'
import { isolatedFrame } from '../engine/isolated-frame'
import { experimentalSchema, type RuntimeFrame } from '../engine/scene'
import type { GameConfig } from './config'
import { ObjectArt } from './GamePreview'
import { Button } from '../components/ui/button'
import { useSound } from './useSound'
import { activityAudio } from './audio'
import { ApprovedArt } from './ApprovedArt'
import { RegisteredArt } from './RegisteredArt'
import { assetIds } from '../engine/design'
import runtimeCore from '../../sandbox/runtime-core.mjs?raw'

export function ExperimentalPreview({ config, launched, onExit }: { config: GameConfig; launched: boolean; onExit(): void }) {
  const game = config.experimental!
  const mirror = useMirror(config.players * 2), iframe = useRef<HTMLIFrameElement>(null), stage = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(''), [error, setError] = useState(''), [frame, setFrame] = useState<RuntimeFrame>({ entities: [] }), [playing, setPlaying] = useState(false), [restart, setRestart] = useState(0)
  const channel = useRef<MessagePort | null>(null), pending = useRef(false), running = useRef(false)
  const resetRound = useRef(false)
  const playAfterReset = useRef(false)
  const soundPulse = useRef(false), audio = useRef<ReturnType<typeof activityAudio> | null>(null), lastSound = useRef(0), currentConfig = useRef(config)
  currentConfig.current = config
  const sound = useSound(config.soundThreshold, () => { soundPulse.current = true }, playing)
  useEffect(() => { if (!config.inputs.includes('sound_detection')) sound.stop() }, [config.inputs.join(',')])
  useEffect(() => () => audio.current?.dispose(), [])
  useEffect(() => { audio.current?.music(playing && config.music, config.volume) }, [playing, config.music, config.volume])
  useEffect(() => { mirror.stop(); setPlaying(false) }, [config.players])
  running.current = playing
  useEffect(() => {
    let alive = true; setHtml(''); setError(''); setFrame({ entities: [] }); setPlaying(false)
    void fetch(`/api/artifacts/${game.id}`).then(async r => { if (!r.ok) throw Error('Validated bundle unavailable. Start the local backend and rebuild this activity.'); return r.json() }).then(async artifact => {
      const metadata = experimentalSchema.parse(artifact.game)
      if (metadata.artifactHash !== game.artifactHash || metadata.sourceHash !== game.sourceHash || metadata.id !== game.id || JSON.stringify(metadata.scene) !== JSON.stringify(game.scene) || typeof artifact.browserBundle !== 'string' || artifact.browserBundle.length > 300000) throw Error('Artifact does not match this saved activity.')
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(artifact.browserBundle)))].map(b => b.toString(16).padStart(2, '0')).join('')
      if (hash !== game.artifactHash) throw Error('Bundle integrity check failed.')
      if (alive) setHtml(isolatedFrame(artifact.browserBundle, game.scene, runtimeCore, restart+1))
    }).catch(e => { if (alive) setError(e.message) })
    return () => { alive = false; channel.current?.postMessage({shutdown:true}); channel.current?.close(); channel.current = null }
  }, [game.id, game.artifactHash, restart])
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false) }; document.addEventListener('visibilitychange', pause)
    const timer = setInterval(() => {
      if (!running.current || pending.current || !channel.current || !stage.current) return
      const rect = stage.current.getBoundingClientRect(), now = performance.now()
      if(resetRound.current){resetRound.current=false;pending.current=true;channel.current.postMessage({control:'restart-round'});return}
      const input = normalizedInput(mirror.frameRef.current, rect.width, rect.height, now, soundPulse.current)
      soundPulse.current = false
      if (!config.inputs.includes('hand_tracking')) input.hands = []
      pending.current = true; channel.current.postMessage({ input: safeInput(input), delta: .05 * currentConfig.current.speed / .65 })
    }, 50)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pause) }
  }, [config.inputs.join(',')])
  const connect = () => {
    channel.current?.postMessage({shutdown:true}); channel.current?.close(); const pair = new MessageChannel(); channel.current = pair.port1; pending.current = true
    pair.port1.onmessage = e => {
      pending.current = false
      const result = safeRuntimeFrame(e.data)
      if (!result) { setError('The experimental mechanic returned an invalid response or stopped. Restart to try again.'); setPlaying(false); channel.current?.close(); return }
      setFrame(result)
      if(playAfterReset.current){playAfterReset.current=false;setPlaying(true)}
      if (result.sound && running.current && performance.now() - lastSound.current > 700) { audio.current?.pop(currentConfig.current.volume); lastSound.current = performance.now() }
    }
    iframe.current?.contentWindow?.postMessage('connect', '*', [pair.port2])
  }
  return <section className={launched ? 'cp-preview cp-launched' : 'cp-preview'}>
    <div className={`cp-preview-stage cp-background-${config.theme==='ocean'?'quiet-water':config.theme==='sunshine'?'warm-studio':'soft-garden'}`} ref={stage} style={{ position: 'relative', minHeight: 440, overflow: 'hidden' }}>
      <video ref={mirror.videoRef} muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      {html && <iframe key={`${game.id}-${restart}`} ref={iframe} title="Isolated experimental mechanic" sandbox="allow-scripts" allow="camera 'none'; microphone 'none'; geolocation 'none'" referrerPolicy="no-referrer" srcDoc={html} onLoad={connect} style={{ display: 'none' }} />}
      <div className="cp-scene-wash" aria-hidden="true" />
      {frame.entities.filter(e => e.visible).map(e => { const art = game.scene.entities.find(s => s.id === e.id) ?? game.scene.entities.find(s => s.kind === e.kind); const asset=e.assetId??art?.assetId;const registered=game.scene.registeredVisuals?.find(v=>v.assetId===asset);return <div className={`cp-experimental-object ${e.completed ? 'completed' : ''}`} data-entity-id={e.id} data-kind={e.kind} data-completed={e.completed} data-asset-id={asset} key={e.id} style={{ position: 'absolute', left: `${e.x * 100}%`, top: `${e.y * 100}%`, width: `${e.radius * 200}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>{registered?<RegisteredArt definition={registered.definition} state={e.visualState??(e.completed?'completed':'idle')}/>:asset?<ApprovedArt id={asset as typeof assetIds[number]} completed={e.completed}/>:<ObjectArt kind={art?.appearance === 'flower' ? 'seed' : art?.appearance ?? 'circle'} grown={e.completed} color={art?.color} />}{(e.label??art?.label)&&<span className="cp-entity-label">{e.label??art?.label}</span>}</div> })}
      <div className="cp-game-objective"><span>OUR SHARED ACTIVITY</span><p>{frame.lifecycle?.objective??game.scene.instruction}</p></div>
      {frame.lifecycle&&['round_complete','game_complete'].includes(frame.lifecycle.phase)&&<div className="cp-completion-message" role="status"><strong>{frame.lifecycle.message}</strong>{frame.lifecycle.phase==='game_complete'&&<Button onClick={()=>{playAfterReset.current=true;setRestart(v=>v+1)}}>Play Again</Button>}</div>}
    </div>
      {frame.lifecycle&&<div className="cp-lifecycle-hud" aria-live="polite"><span>{frame.lifecycle.mode==='rounds'?`Round ${frame.lifecycle.round} of ${frame.lifecycle.rounds}`:'Together, at your pace'}</span><strong>{frame.lifecycle.progress}{frame.lifecycle.mode==='open-ended'?' moments shared':` of ${frame.lifecycle.goal}`}</strong>{frame.lifecycle.mode!=='open-ended'&&<progress aria-label="Round progress" max={frame.lifecycle.goal} value={frame.lifecycle.progress}/>}</div>}
    <p role="status">{error || mirror.error || sound.error || 'Experimental preview · camera stays local · normalized events only'}</p>
    <div className="cp-preview-controls"><Button onClick={() => mirror.cameraOn ? mirror.stop() : void mirror.start()}>{mirror.cameraOn ? 'Stop camera' : 'Enable camera'}</Button><Button disabled={!html || !!error} onClick={() => { audio.current ??= activityAudio(); setPlaying(v => !v) }}>{playing ? 'Pause' : 'Play'}</Button>{config.inputs.includes('sound_detection') && <Button onClick={() => sound.active ? sound.stop() : void sound.start()}>{sound.active ? 'Mic off' : 'Enable mic'}</Button>}{game.scene.lifecycle&&<Button onClick={()=>{resetRound.current=true;setPlaying(true)}}>Restart round</Button>}<Button onClick={() => setRestart(v => v + 1)}>Restart</Button>{launched && <Button onClick={onExit}>Exit activity</Button>}</div>
  </section>
}


