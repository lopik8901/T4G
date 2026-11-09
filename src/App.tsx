import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, ChevronRight, CircleHelp, Hand, Heart, Leaf, Maximize, Pause, Play, ShieldCheck, SlidersHorizontal, Sparkles, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { useMirror } from './camera/useMirror'
import { BalloonScene, PopEffects, type Pop } from './game/BalloonScene'
import { balloonSpeeds, createWorld, defaultSettings, type Settings } from './game/logic'
import { playPop, unlockSound } from './game/sound'
import { SettingsPanel } from './components/SettingsPanel'
import { RoundControls } from './components/RoundControls'
import { RoundResults, RoundStatus } from './components/RoundDisplay'
import { advanceRound, createRound, recordRoundHit, type RoundMode } from './game/round'

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [session, setSession] = useState<'setup' | 'playing' | 'paused' | 'finished'>('setup')
  const [roundMode, setRoundMode] = useState<RoundMode>('timed')
  const [roundDuration, setRoundDuration] = useState(60)
  const round = useRef(createRound())
  const [roundDisplay, setRoundDisplay] = useState(round.current)
  const [bestRoundCounts, setBestRoundCounts] = useState<Record<string, number>>({})
  const [preview, setPreview] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [pops, setPops] = useState<Pop[]>([])
  const [notice, setNotice] = useState('')
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [previewMoving, setPreviewMoving] = useState(true)
  const world = useRef(createWorld())
  const modal = useRef<HTMLDialogElement>(null)
  const helpModal = useRef<HTMLDialogElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const mirror = useMirror(settings.hands)
  const immersive = session !== 'setup'
  const playing = session === 'playing' || (preview && session === 'setup' && previewMoving)
  const ready = mirror.status === 'ready' || preview
  const onPop = useCallback((pop: Pop) => {
    if (session === 'playing') {
      if (round.current.endReason) return
      round.current = recordRoundHit(round.current)
      setRoundDisplay(round.current)
    }
    setScore(value => value + pop.points)
    setPops(value => [...value, pop])
    playPop(pop.points, settings.volume)
    const timer = setTimeout(() => {
      setPops(value => value.filter(item => item.id !== pop.id))
      timers.current = timers.current.filter(item => item !== timer)
    }, 1000)
    timers.current.push(timer)
  }, [settings.volume, session])

  const onRoundStep = useCallback((seconds: number, missedBalloons: number) => {
    const previous = round.current
    if (previous.endReason) return true
    const next = advanceRound(previous, seconds, missedBalloons)
    round.current = next
    if (next.endReason || next.misses !== previous.misses || Math.floor(next.elapsed) !== Math.floor(previous.elapsed)) {
      setRoundDisplay(next)
    }
    if (next.endReason) {
      const recordKey = next.mode === 'timed' ? `timed-${next.duration}` : 'endless'
      setBestRoundCounts(records => ({
        ...records,
        [recordKey]: Math.max(records[recordKey] ?? 0, next.hits),
      }))
      setSession('finished')
    }
    return next.endReason !== null
  }, [])

  useEffect(() => { setBest(value => Math.max(value, score)) }, [score])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(media.matches)
    media.addEventListener('change', change)
    return () => { media.removeEventListener('change', change); timers.current.forEach(clearTimeout) }
  }, [])
  useEffect(() => {
    const pause = () => { if (document.hidden) setSession(value => value === 'playing' ? 'paused' : value) }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !modal.current?.open && !helpModal.current?.open) setSession(value => value === 'playing' ? 'paused' : value)
    }
    document.addEventListener('visibilitychange', pause)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('visibilitychange', pause); document.removeEventListener('keydown', escape) }
  }, [])
  useEffect(() => {
    if (!preview && mirror.status === 'error') setSession(value => value === 'playing' ? 'paused' : value)
  }, [mirror.status, preview])

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { setNotice('Fullscreen is unavailable here. Open the game in Chrome or Edge, or use your browser’s fullscreen control.') }
  }
  const reset = () => {
    setScore(0)
    setPops([])
    world.current = createWorld()
    round.current = createRound(roundMode, roundDuration)
    setRoundDisplay(round.current)
  }
  const start = () => {
    if (!ready) return
    unlockSound()
    if (session !== 'paused') reset()
    setSession('playing')
    setPops([])
  }
  const end = () => {
    mirror.stop(); setSession('setup'); setPreview(false); reset()
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }
  const enableCamera = () => { setPreview(false); reset(); unlockSound(); void mirror.start() }
  const openSettings = () => { if (session === 'playing') setSession('paused'); setPreviewMoving(false); modal.current?.showModal() }
  const closeSettings = () => { modal.current?.close(); setPreviewMoving(true) }
  const tryPreview = () => { mirror.stop(); reset(); setPreview(true); setPreviewMoving(true); unlockSound() }
  const cameraBusy = mirror.status === 'requesting' || mirror.status === 'loading'
  const roundRecordKey = roundDisplay.mode === 'timed' ? `timed-${roundDisplay.duration}` : 'endless'

  return <div className={`app-shell ${immersive ? 'is-immersive' : ''}`}>
    <header className="site-header">
      <a href="/" className="brand" aria-label="Balloon Pop home"><img src="/balloon.svg" alt="" /><span>balloon<span className="brand-light">pop</span><span className="brand-dot">.</span></span></a>
      <span className="header-tagline">Little moments. Shared joy.</span>
      <nav aria-label="Activity help"><button className="text-button" onClick={() => helpModal.current?.showModal()}><CircleHelp size={18} /> How to play</button><span className="nav-divider" /><button className="text-button" onClick={openSettings}><SlidersHorizontal size={18} /> Staff controls</button></nav>
    </header>

    <main>
      <section className="page-intro"><div><p className="eyebrow"><Sparkles size={16} aria-hidden="true" /> A LITTLE EVERYDAY MAGIC</p><h1>A little movement. <em>A lot of joy.</em></h1></div><p>Move your hand circle over a balloon to pop it.<br />How many can you pop this round?</p></section>
      <div className="activity-layout">
        <section className={`mirror-stage ${mirror.cameraOn ? 'camera-on' : ''} ${preview ? 'preview-mode' : ''}`} aria-label="Balloon activity">
          <video ref={mirror.videoRef} className="mirror-video" autoPlay muted playsInline aria-label="Live mirrored camera" style={{ visibility: mirror.cameraOn ? 'visible' : 'hidden' }} />
          {!mirror.cameraOn && <div className="standby-background" aria-hidden="true"><div className="standby-circle circle-one" /><div className="standby-circle circle-two" /><span className="corner top-left" /><span className="corner top-right" /><span className="corner bottom-left" /><span className="corner bottom-right" /></div>}
          <BalloonScene
            world={world}
            hands={mirror.frameRef}
            settings={settings}
            playing={playing}
            preview={preview}
            reducedMotion={reducedMotion}
            onPop={onPop}
            onStep={session === 'playing' ? onRoundStep : undefined}
          />
          <PopEffects pops={pops} reducedMotion={reducedMotion} />
          <div className="stage-top">
            <span className={`status-pill ${mirror.cameraOn && mirror.status === 'ready' ? 'live' : ''}`}><span className="status-dot" />{preview ? 'Preview · no camera' : mirror.status === 'ready' ? 'Live mirror' : mirror.cameraOn ? 'Camera connected' : 'Your magic mirror'}</span>
            {(ready || immersive) ? <div className="score-display"><span>YOUR SCORE</span><strong>{score}</strong><small><Trophy size={14} /> Session best {best}</small></div> : <span className="private-label"><ShieldCheck size={15} /> Private by design</span>}
          </div>

          {immersive && session !== 'finished' && <RoundStatus round={roundDisplay} />}
          {session === 'finished' && (
            <RoundResults
              round={roundDisplay}
              score={score}
              bestHits={bestRoundCounts[roundRecordKey] ?? 0}
              ready={ready}
              onReplay={start}
              onExit={end}
            />
          )}

          {!preview && !mirror.cameraOn && <div className="camera-prompt">
            <div className="camera-emblem"><Camera size={33} strokeWidth={1.4} /><Sparkles className="emblem-spark" size={19} /></div>
            <h2>Your room.<br /><em>A little more magic.</em></h2>
            {mirror.status === 'error' ? <p className="inline-camera-error" role="alert">{mirror.error}</p> : <p>See yourself on screen and<br />bring the balloons to life.</p>}
            <button className="primary-button camera-button" onClick={enableCamera} disabled={cameraBusy}><Camera size={18} />{cameraBusy ? 'Connecting camera…' : mirror.status === 'error' ? 'Try camera again' : 'Enable camera'}{!cameraBusy && <ArrowRight size={18} />}</button>
            {cameraBusy && <button className="text-button" onClick={mirror.stop}>Cancel</button>}
            {!cameraBusy && <button className="preview-link" onClick={tryPreview}>Or try a preview <ArrowRight size={14} /></button>}
          </div>}

          {mirror.status === 'error' && mirror.cameraOn && !preview && <div className="camera-error" role="alert">{mirror.error}<button className="text-button" onClick={enableCamera}>Reconnect camera <ArrowRight size={16} /></button></div>}
          {mirror.status === 'loading' && <div className="tracking-loading" role="status"><span className="loading-dot" /> Getting hand tracking ready…</div>}
          {session === 'paused' && <div className="pause-overlay"><span className="pause-emblem"><Pause size={28} /></span><h2>Take your time.</h2><p>We’ll be right here when you’re ready.</p><button className="primary-button" onClick={start} disabled={!ready}><Play size={18} fill="currentColor" /> Continue playing</button><button className="text-button" onClick={end}><ArrowLeft size={16} /> Back to setup</button></div>}

          <div className="stage-bottom">
            <span className="stage-hint">{preview ? <><Hand size={18} /> Tap a balloon to try it</> : mirror.status === 'ready' ? <><Hand size={18} /> {mirror.handCount ? 'Move your hand circle over a balloon to pop it' : 'Lift a hand whenever you’re ready'}</> : <><Heart size={16} /> A little reach goes a long way.</>}</span>
            <div className="stage-actions">{preview && !immersive && <button className="icon-button" onClick={() => setPreviewMoving(value => !value)} aria-label={previewMoving ? 'Pause preview' : 'Resume preview'}>{previewMoving ? <Pause size={18} /> : <Play size={18} />}</button>}<button className="icon-button" onClick={() => setSettings(value => ({ ...value, volume: value.volume ? 0 : 0.3 }))} aria-label={settings.volume ? 'Mute sound' : 'Enable sound'}>{settings.volume ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen"><Maximize size={18} /></button></div>
          </div>
          {immersive && session !== 'finished' && <div className="play-controls"><button className="hud-button" onClick={() => setSession(value => value === 'paused' ? 'playing' : 'paused')} disabled={!ready}>{session === 'playing' ? <Pause size={19} /> : <Play size={19} />}{session === 'playing' ? 'Pause' : 'Resume'}</button><button className="hud-button" onClick={openSettings}><SlidersHorizontal size={19} /> Settings</button><button className="hud-button" onClick={end}><X size={19} /> Finish</button></div>}
        </section>

        <aside className="setup-panel">
          <div className="panel-title"><span className="eyebrow"><Leaf size={16} /> AT YOUR OWN PACE</span><h2>Ready, set… relax.</h2><p>A feel-good activity for one or two.<br />Sitting or standing, everyone is welcome.</p></div>
          <ol className="how-steps">
            <li><span>1</span><div><strong>Choose your round</strong><p>Beat the clock, or keep going until you miss.</p></div></li>
            <li><span>2</span><div><strong>Raise either hand</strong><p>A circle follows your palm on screen.</p></div></li>
            <li><span>3</span><div><strong>Touch a balloon with the circle</strong><p>It pops automatically. Reach for the next one!</p></div></li>
          </ol>
          <div className="quick-settings">
            <div className="section-label">
              <span>YOUR ACTIVITY</span>
              <button className="text-button" onClick={openSettings}>Adjust <SlidersHorizontal size={14} /></button>
            </div>
            <RoundControls
              mode={roundMode}
              duration={roundDuration}
              onModeChange={setRoundMode}
              onDurationChange={setRoundDuration}
            />
            <div className="quick-setting">
              <label htmlFor="quick-mode">Pace</label>
              <select
                id="quick-mode"
                value={settings.speed}
                onChange={event => setSettings(current => ({ ...current, speed: Number(event.target.value) }))}
              >
                <option value={balloonSpeeds.standard}>Standard</option>
                <option value={balloonSpeeds.veryFast}>Very fast</option>
                {settings.speed !== balloonSpeeds.standard && settings.speed !== balloonSpeeds.veryFast && (
                  <option value={settings.speed}>Custom speed</option>
                )}
              </select>
            </div>
            {settings.speed === balloonSpeeds.veryFast && (
              <p className="field-note">Balloons fly past quickly. Pop them before they leave the screen!</p>
            )}
            <div className="quick-setting">
              <label htmlFor="quick-size">Balloons</label>
              <select
                id="quick-size"
                value={settings.size}
                onChange={event => setSettings(current => ({ ...current, size: Number(event.target.value) }))}
              >
                <option value="0.85">Standard</option>
                <option value="1.15">Large & easy to reach</option>
                <option value="1.45">Extra large</option>
              </select>
            </div>
          </div>
          <button className="primary-button start-button" onClick={start} disabled={!ready}><Play size={18} fill="currentColor" /> Start {preview ? 'preview' : 'activity'}<ArrowRight size={19} /></button>
          <p className="start-note">{ready ? <><Check size={14} /> {preview ? 'Preview is ready. Tap balloons to pop.' : 'Camera is ready. Let’s make some smiles.'}</> : <><ArrowLeft size={14} /> Enable the camera to get started</>}</p>
          {mirror.cameraOn && <button className="text-button disconnect-button" onClick={mirror.stop}>Turn camera off</button>}
          {preview && <button className="text-button disconnect-button" onClick={enableCamera}><Camera size={15} /> Switch to live camera</button>}
        </aside>
      </div>

      <div className="activity-notes"><span><ShieldCheck size={18} /><span>Your camera stays <strong>yours.</strong> Nothing is recorded or uploaded.</span></span><span className="red-tip"><i /> <span>Red balloons hold a little extra joy. <strong>+3 points</strong></span></span></div>
      <footer><span>Designed for connection, one little pop at a time.</span><button className="text-button" onClick={() => helpModal.current?.showModal()}>Setting up on a TV? <ChevronRight size={16} /></button></footer>
    </main>

    <dialog ref={modal} className="settings-dialog" onCancel={() => setPreviewMoving(true)} onClick={e => { if (e.target === e.currentTarget) closeSettings() }} aria-label="Staff controls"><div className="dialog-content"><SettingsPanel settings={settings} onChange={setSettings} onReset={reset} onFullscreen={fullscreen} onClose={closeSettings} cameraOn={mirror.cameraOn} /></div></dialog>
    <dialog
      ref={helpModal}
      className="help-dialog"
      aria-labelledby="help-title"
      onClick={event => { if (event.target === event.currentTarget) helpModal.current?.close() }}
    >
      <div className="dialog-content">
        <div className="panel-heading">
          <span className="eyebrow"><Heart size={16} /> A MOMENT TOGETHER</span>
          <button className="icon-button" aria-label="Close help" onClick={() => helpModal.current?.close()}><X size={20} /></button>
        </div>
        <h2 id="help-title">A little help getting started.</h2>
        <p>Enable the camera and allow access when your browser asks. Sit or stand where you can comfortably see yourself, then start the activity.</p>
        <h3>Move your hand circle to pop</h3>
        <p>Raise either hand and move the circle over a balloon. It pops automatically when the circle touches it. You can keep your hand open and move straight to the next balloon.</p>
        <h3>Choose your challenge</h3>
        <p>Standard timed rounds give you 30, 60, or 90 seconds to pop as many balloons as possible. Endless rounds end as soon as one balloon gets away. Choose Standard or Very fast pace for either round type. Each balloon counts as one pop; red balloons give three points.</p>
        <h3>Make it comfortable</h3>
        <p>Staff controls let you make balloons larger, slow them down, lower the volume, and make touches easier. Pause for a break at any time.</p>
        <h3>Playing together on a TV</h3>
        <p>Connect your laptop to the TV with HDMI. Duplicate the display, keep the webcam facing the residents, and select Fullscreen. Use a well-lit space and keep hands in view. For two residents, choose 4 hands in Staff controls before enabling the camera.</p>
        <div className="privacy-note"><ShieldCheck size={21} /><p>Video is processed on this laptop. It is never recorded, stored, or uploaded.</p></div>
        <button className="primary-button" onClick={() => helpModal.current?.close()}>Try it out <ArrowRight size={18} /></button>
      </div>
    </dialog>
    {notice && <div className="notice" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={18} /></button></div>}
  </div>
}
