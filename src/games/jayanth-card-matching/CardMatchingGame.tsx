import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useGameMirror } from './useGameMirror'
import { categories, type CardItem } from './categories'
import { instruction, messages } from './localisation'
import { createRound, type Round } from './logic'
import { newSession, updateSession, canSelect, motion, phaseDuration, gamePaces, type GamePace, type Event, type Session } from './session'
import { useHandPointer, type HandSample } from './useHandPointer'
import { useSpeech } from './useSpeech'
import { instructionKey } from './speech'
import { enableAudio, playSuccess, stopSound } from './sound'
import { decodeRound } from './images'
import { defaultCalibration, type Calibration } from './assistance'
import {defaultFraming,type Framing} from './framing'
import { TrackingPanel } from './TrackingPanel'
import { Skyline } from './Skyline'
import { journeyProgress } from './journey'
import styles from './CardMatchingGame.module.css'

type Dialog = 'pace' | 'setup' | 'staff' | 'tracking' | 'camera' | 'settings' | 'end' | 'restart' | 'calibration' | null
function Face({ item }: { item: CardItem }) {
  return <>{item.colour ? <span className={styles.swatch} style={{ background: item.colour }} aria-hidden="true" />
    : <img className={styles.art} src={item.image} alt="" decoding="async" draggable={false} />}<span className={styles.cardLabel}>{item.label}</span></>
}
function Options({ label, children }: { label: string; children: ReactNode }) {
  return <fieldset className={styles.options}><legend>{label}</legend><div>{children}</div></fieldset>
}
export default function CardMatchingGame() {
  const [framing,setFraming]=useState<Framing>(defaultFraming)
  const [assisted,setAssisted]=useState(false)
  const [pace,setPace]=useState<GamePace>('standard')
  const [memory,setMemory]=useState(false)
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([])
  const [pool,setPool]=useState('familiar')
  const [category, setCategory] = useState('animals')
  const narration='en' as const
  const [limit, setLimit] = useState(0)
  const [audio, setAudio] = useState(true)
  const [hints, setHints] = useState(true)
  const [timeout, setTimeoutSeconds] = useState(30)
  const [voiceURI, setVoiceURI] = useState('')
  const [rate, setRate] = useState(.9)
  const [volume, setVolume] = useState(.65)
  const [duration, setDuration] = useState<number>(motion.dwell)
  const [calibration, setCalibration] = useState<Calibration>(defaultCalibration)
  const [session, setSession] = useState<Session | null>(null)
  const [homeJourney, setHomeJourney] = useState(0)
  const [homeLength, setHomeLength] = useState(0)
  const current = useRef<Session | null>(null)
  const lastRevision = useRef(0)
  const upcoming = useRef<{ revision: number; round: Round } | null>(null)
  const [imagesReady, setImagesReady] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [closed, setClosed] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pausedBeforeDialog = useRef(false)
  const [cameraFailed, setCameraFailed] = useState(false)
  const [notice, setNotice] = useState('')
  const mirror = useGameMirror(2)
  const speech = useSpeech(narration, audio && !closed, voiceURI, rate, volume)

  const cursor = useRef<HTMLDivElement>(null), ring = useRef<SVGCircleElement>(null)
  const handSample = useRef<HandSample | null>(null)
  const cameraDock = useRef<HTMLDivElement>(null), homePreview = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLElement>(null), reference = useRef<HTMLElement>(null)
  const morph = useRef<Animation | null>(null)
  const pausedTransitions=useRef<Animation[]>([])
  const imagesReadyRef = useRef(false)
  const runtime = useRef({ status: mirror.status, timeout, closed, dialog })
  useEffect(() => { runtime.current = { status: mirror.status, timeout, closed, dialog }; imagesReadyRef.current = imagesReady }, [mirror.status, timeout, closed, dialog, imagesReady])
  const send = useCallback((event: Event) => {
    const old = current.current
    if (!old) return
    if ((event.type === 'advance' || event.type === 'skip') && upcoming.current?.revision === old.revision) event = { ...event, round: upcoming.current.round }
    const next = updateSession(old, event)
    current.current = next
    lastRevision.current=Math.max(lastRevision.current,next.revision)
    if (event.type === 'activity') { if (Math.floor(old.idle / 1000) > 0) setSession(next); return }
    if (next.revision !== old.revision && next.phase !== 'complete') { imagesReadyRef.current = false; setImagesReady(false) }
    // Visual motion and dwell run independently. Publish clock state only once
    // per idle second, or on a meaningful game transition.
    if (event.type !== 'tick' || next.phase !== old.phase || next.closingSoon!==old.closingSoon || Math.floor(next.idle / 1000) !== Math.floor(old.idle / 1000)) setSession(next)
  }, [])
  const activity = useCallback(() => send({ type: 'activity' }), [send])
  useHandPointer({ selector: mirror.selector, frame: mirror.frameRef, framing, immersive:!!session&&session.phase!=='complete', aligned: !!session && session.phase !== 'complete' && !dialog && !assisted, rearmAnswers:!!session?.memory&&!!session&&canSelect(session), enabled: mirror.status === 'ready' && !closed,
    scene: `${dialog ?? (closed ? 'closed' : session?.phase === 'complete' ? 'complete' : session ? 'game' : 'home')}`,
    resetKey:`${session?.revision}:${session?.cycle}:${session?.phase}:${session?.paused}`, duration:session?.memory?Math.max(motion.dwell,duration):duration, calibration, cursor, ring, sample: handSample, onActivity: activity })
  const stopToHome = useCallback(() => {
    speech.cancel(); stopSound(); morph.current?.cancel(); setHomeJourney(current.current?.journey ?? 0); setHomeLength(current.current?.limit ?? 0)
    current.current = null; upcoming.current = null; setSession(null); setDialog(null); setImageError(false)
  }, [speech.cancel])
  const endSession = useCallback(() => {
    stopToHome(); mirror.stop(); setClosed(true); setDialog(null)
  }, [stopToHome, mirror.stop])
  useEffect(() => {
    document.documentElement.lang = 'en'; document.title = 'Singapore Skyline Journey'
    void mirror.start()
    return () => { mirror.stop(); stopSound() }
  }, [mirror.start, mirror.stop])
  useEffect(() => { if (mirror.status === 'error') { setCameraFailed(true); mirror.stop() } }, [mirror.status, mirror.stop])
  useEffect(() => {
    if (!session || session.phase === 'complete') return
    let disposed = false
    setImageError(false)
    void decodeRound(session.round).then(() => {
      if (disposed) return
      imagesReadyRef.current = true; setImagesReady(true)
      const next = createRound(session.category, session.round.reference.id, Math.random, session.history,session.round.answers.findIndex(c=>c.id===session.round.reference.id))
      upcoming.current = { revision: session.revision, round: next }
      void decodeRound(next).catch(() => {})
    }).catch(() => { if (!disposed) setImageError(true) })
    return () => { disposed = true }
  }, [session?.revision, !!session])
  useEffect(() => {
    if (closed) return
    let last = performance.now()
    const timer = setInterval(() => {
      const now = performance.now(), delta = Math.min(now - last, 250); last = now
      const state = current.current, env = runtime.current
      if (!state || document.hidden || env.dialog || state.paused || env.status === 'requesting' || env.status === 'loading') return
      if (state.phase !== 'complete' && !imagesReadyRef.current) return
      if (state.phase === 'reveal' && speech.speaking.current) return
      send({ type: 'tick', delta, idle: canSelect(state)||!speech.speaking.current })
      const latest = current.current!
      if (latest.phase === 'success' && latest.successTime >= phaseDuration.success && !speech.speaking.current) send({ type: 'advance' })
      else if (env.timeout > 0 && latest.idle >= env.timeout * 1000) stopToHome()
    }, 100)
    const pause = () => { if (document.hidden) { send({ type: 'pause', value: true }); speech.cancel() } }
    document.addEventListener('visibilitychange', pause)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pause) }
  }, [closed, send, speech.cancel, speech.speaking, stopToHome])
  useEffect(() => {
    if (!session || !imagesReady || dialog) return
    if (session.paused) { speech.cancel(); return }
    const spoken = messages[narration]
    if (session.phase === 'reveal' || session.phase === 'revealingTarget') speech.speak(instruction(session.round.reference, narration), instructionKey(session.category.id, session.round.reference.id), true)
    else if (session.memory && ['falling','replaying'].includes(session.phase)) speech.speak('Look carefully at the pictures!', 'memory:preview', true)
    else if (session.phase === 'complete') speech.speak(spoken.complete, 'app:complete')
    else if (session.phase === 'success') { if (audio) playSuccess(); speech.speak(spoken.success, 'feedback:success') }
    else if ((session.phase === 'feedback'||session.phase === 'answering') && session.rejected.length) speech.speak(spoken.retry, 'feedback:retry')
  }, [session?.phase, session?.revision, session?.rejected.length, session?.paused, imagesReady, narration, audio, dialog, speech.speak, speech.cancel])
  useEffect(()=>{if(session&&['flipping','replaying'].includes(session.phase)&&session.reducedMotion&&!session.paused){for(const item of session.round.answers)send({type:session.phase==='flipping'?'flip-complete':'open-complete',id:item.id,revision:session.revision,cycle:session.cycle})}},[session?.phase,session?.revision,session?.cycle,session?.paused,send])
  const reminded = useRef(false)
  useEffect(() => {
    if (!session || session.idle < 15000) reminded.current = false
    if (session && canSelect(session) && !session.paused && !dialog && (hints || timeout > 0) && session.idle >= 15000 && !reminded.current) {
      reminded.current = true; speech.speak(messages[narration].reminder, 'app:reminder')
    }
  }, [session, hints, timeout, narration, dialog, speech.speak])
  // FLIP: layout stays at the final reference geometry; compositor transforms
  // move and scale the SAME decoded image, preserving its aspect ratio.
  useLayoutEffect(() => {
    const element = reference.current, container = stage.current
    if (!element || !container || !session || !imagesReady) return
    const reduced = session.reducedMotion
    const reset = () => {
      if (!reference.current || !stage.current) return
      const target = reference.current.getBoundingClientRect(), area = stage.current.getBoundingClientRect()
      const scale = Math.min(3, area.height * (session.memory ? .30 : .52) / target.height, area.width * .30 / target.width)
      const dx = area.left + area.width * .5 - (target.left + target.width / 2)
      const banner=container.querySelector('[data-layout="instruction"]')!.getBoundingClientRect()
      const heroY=Math.max(area.top+area.height*(session.memory ? .29 : .46),banner.bottom+16+target.height*scale/2)
      const dy = heroY - (target.top + target.height / 2)
      reference.current.style.setProperty('--reveal-waypoint',`translate3d(0,${Math.max(dy,banner.bottom+16-target.top)}px,0) scale(1)`)
      reference.current.style.setProperty('--reveal-start',`translate3d(${dx}px,${dy}px,0) scale(${scale*.94})`)
      reference.current.style.setProperty('--reveal-transform', `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`)
    }
    if (session.phase === 'reveal') {
      element.style.transform = ''; reset(); element.style.transform = 'var(--reveal-transform)'
    } else if (session.phase === 'settling' || session.phase === 'revealingTarget') {
      reset(); element.style.transform = ''
      morph.current?.cancel()
      morph.current = element.animate([{transform:'var(--reveal-start)',opacity:0},{transform:'var(--reveal-transform)',opacity:1,offset:.2}, {transform:'var(--reveal-waypoint)',opacity:1,offset:.75}, { transform: 'translate3d(0,0,0) scale(1)',opacity:1 }], { duration: reduced ? 0 : session.memory ? motion.target : phaseDuration.settling, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'none' })
      const revision=session.revision,cycle=session.cycle
      if(session.phase==='revealingTarget')morph.current.onfinish=()=>send({type:'target-complete',revision,cycle})
    }
    const resize = () => { if (current.current?.phase === 'reveal') { element.style.transform = ''; reset(); element.style.transform = 'var(--reveal-transform)' } }
    window.addEventListener('resize', resize)
    return () => {window.removeEventListener('resize', resize);morph.current?.cancel()}
  }, [session?.phase, session?.revision, session?.cycle, imagesReady])
  useLayoutEffect(()=>{
    if(session?.paused){pausedTransitions.current=stage.current?.getAnimations({subtree:true}).filter(a=>a instanceof CSSTransition&&a.playState==='running')??[];pausedTransitions.current.forEach(a=>a.pause())}
    else {pausedTransitions.current.forEach(a=>{if(a.playState==='paused')a.play()});pausedTransitions.current=[]}
  },[session?.paused])
  useEffect(() => { if (session?.paused && morph.current?.playState === 'running') morph.current.pause(); else if (!session?.paused && morph.current?.playState === 'paused') morph.current.play() }, [session?.paused])
  useEffect(() => {
    if (closed) return
    const key = (event: KeyboardEvent) => { if (event.isTrusted) activity() }
    let point: { x: number; y: number } | null = null
    const move = (event: PointerEvent) => { if (!event.isTrusted) return; if (!point || Math.hypot(event.clientX-point.x,event.clientY-point.y)>24) { if (point) activity(); point={x:event.clientX,y:event.clientY} } }
    document.addEventListener('keydown',key); document.addEventListener('pointermove',move);document.addEventListener('pointerdown',activity)
    return () => { document.removeEventListener('keydown',key); document.removeEventListener('pointermove',move);document.removeEventListener('pointerdown',activity) }
  }, [closed, activity])
  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal()
    else if (!dialog) dialogRef.current?.close()
  }, [dialog])
  const openDialog = (value: Dialog) => { activity(); if(!dialog) pausedBeforeDialog.current = current.current?.paused ?? false; send({type:'pause',value:true}); speech.cancel(); setDialog(value) }
  const closeDialog = () => { setDialog(null); if (!pausedBeforeDialog.current) send({type:'pause',value:false}); activity() }
  useEffect(() => {
    if (dialog !== 'calibration') return
    const timer = setTimeout(() => {
      const sample = handSample.current
      if (sample && performance.now()-sample.time<280) { setCalibration(old=>({...old,centerX:sample.x,centerY:sample.y}));setAssisted(true); setNotice('Pointer centred. The camera marker shows your actual mirrored palm.'); closeDialog() }
      else setNotice('No hand detected. Raise a hand and choose Recenter again.')
    }, 2200)
    return () => clearTimeout(timer)
  }, [dialog])
  const start = () => {
    speech.cancel(); if (audio) enableAudio(); morph.current?.cancel()
    const chosen=categories.find(item=>item.id===category)!
    const collection=pool==='familiar'&&chosen.items.filter(i=>i.familiar!==false).length>=4?{...chosen,items:chosen.items.filter(i=>i.familiar!==false)}:chosen
    const next = newSession(collection,limit,matchMedia('(prefers-reduced-motion: reduce)').matches,memory,pace)
    next.revision = ++lastRevision.current
    imagesReadyRef.current=false;setImagesReady(false);current.current=next;setSession(next);setDialog(null);setNotice('')
  }
  const repeat = () => { activity(); if (!session)return; const known=!session.memory||['revealingTarget','selecting','feedback','success'].includes(session.phase);speech.speak(known?instruction(session.round.reference,narration):'Look carefully at the pictures!',known?instructionKey(session.category.id,session.round.reference.id):'memory:preview',true) }
  const reconnect = () => { setCameraFailed(false); void mirror.start() }
  const fullscreen = async () => { activity(); try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { setNotice('Use your browser’s fullscreen control. A camera dwell cannot grant browser fullscreen permission.') } }
  const active = !!session && session.phase !== 'complete'
  const warning = session && timeout>0 && session.idle>=(timeout-5)*1000
  const targetKnown=!!session&&(!session.memory||['revealingTarget','selecting','feedback','success'].includes(session.phase))
  const preparing = session?.phase==='reveal'||session?.phase==='settling'
  const cameraStatus = closed ? 'Camera stopped' : cameraFailed ? 'Camera unavailable · mouse, keyboard and touch still work' : mirror.status==='ready' ? 'Hand pointer ready · hold over a control to select' : mirror.status==='requesting' ? 'Please allow camera access in your browser' : mirror.status==='loading' ? 'Preparing local hand tracking…' : 'Camera off'
  useLayoutEffect(()=>{
    const dock=cameraDock.current
    if(!dock)return
    const position=()=>{
      const rect=active?{left:0,top:0,width:innerWidth,height:innerHeight}:homePreview.current?.getBoundingClientRect()
      if(rect){Object.assign(dock.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`})}
    }
    position();const observer=new ResizeObserver(position)
    if(homePreview.current)observer.observe(homePreview.current)
    observer.observe(document.documentElement);window.addEventListener('resize',position)
    return()=>{observer.disconnect();window.removeEventListener('resize',position)}
  },[active,closed,notice,!!session])
  return <main data-camera-on={mirror.cameraOn} data-frame-x={framing.x} data-frame-y={framing.y} data-mirror-mode={active&&!dialog&&!assisted?'aligned':'assisted'} data-centred={active} style={active?{'--warmth':Math.min(session.journey,10)*.008,background:`linear-gradient(135deg, rgb(${225+Math.min(session.journey,10)*2}, ${236+Math.min(session.journey,10)}, 230), rgb(255, ${248-Math.min(session.journey,10)}, ${230-Math.min(session.journey,10)*3}))`} as CSSProperties:undefined} className={`${styles.game} ${active?styles.immersive:''} ${active&&mirror.cameraOn?styles.liveGameplay:''}`} lang="en">
    <div ref={cameraDock} data-camera-dock hidden={!mirror.cameraOn||closed||(!active&&!!session)} className={styles.cameraDock}>
      <span data-palm className={styles.palmMarker} hidden />
      <video style={{objectPosition:active?`${framing.x*100}% ${framing.y*100}%`:'50% 50%'}} ref={mirror.videoRef} autoPlay muted playsInline className={styles.cameraVideo} aria-label="Live mirrored webcam" />
    </div>
    <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">✦</span><div><p>SINGAPORE SKYLINE JOURNEY</p><h1>Little matches. Bright moments.</h1></div></div>
      {!closed && !active && <div className={styles.controls}><button data-dwell="audio" aria-pressed={audio} onClick={()=>{activity();speech.cancel();setAudio(!audio);if(!audio)enableAudio()}}>Audio: {audio?'On':'Off'}</button><button data-dwell="settings" onClick={()=>openDialog('settings')}>Staff settings</button><button data-dwell="fullscreen" onClick={()=>void fullscreen()}>Fullscreen</button></div>}
    </header>
    {notice && !active && <p className={styles.notice} role="status">{notice}</p>}
    {closed ? <section className={styles.complete}><Skyline hero /><p className={styles.eyebrow}>UNTIL NEXT TIME</p><h2>Thank you for joining the journey.</h2><p>Session ended. The camera, hand tracking and audio are stopped. You can close this tab.</p><button className={styles.start} onClick={()=>{setClosed(false);reconnect()}}>Return to Home</button></section>
    : !session ? <section className={styles.home} aria-labelledby="welcome-title"><div className={styles.welcome}><p className={styles.eyebrow}>A FAMILIAR PLACE. A LITTLE JOY.</p><h2 id="welcome-title">A small match.<br/>A brighter Singapore.</h2><p>Find the picture that looks the same.<br/>Take your time. Enjoy the journey.</p><div ref={homePreview} data-camera-preview className={styles.homePreview}>{!mirror.cameraOn&&<span>Your camera preview will appear here.</span>}</div><Skyline matches={homeJourney} sessionLength={homeLength} hero /></div>
      <div className={styles.setupPanel}><Options label="Category">{categories.map(item=><button key={item.id} data-dwell={`category:${item.id}`} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}</Options>
        <button data-dwell="game-options" className={styles.gameOptions} onClick={()=>openDialog('setup')}>Game Options · Level {memory?2:1}</button>
        <Options label="Session duration">{[0,5,10].map(value=><button key={value} data-dwell={`length:${value}`} aria-pressed={limit===value} onClick={()=>setLimit(value)}>{value?`${value} rounds`:'Continuous'}</button>)}</Options>
        <button className={styles.start} data-dwell="start" onClick={start}>Start Game <span aria-hidden="true">→</span></button>
        <p className={styles.help}>Move your open hand. Hold the pointer over a button to select. Mouse, touch and keyboard work too.</p>
        <button data-dwell="calibrate" onClick={()=>openDialog('calibration')}>Recenter hand</button>
      </div></section>
    : session.phase==='complete' ? <section className={styles.complete}><Skyline matches={session.journey} sessionLength={session.limit} hero /><p className={styles.eyebrow}>A LOVELY JOURNEY TOGETHER</p><h2>Thank you for playing!</h2><p>Your little matches brought the skyline to life.</p><div className={styles.completeActions}><button className={styles.start} data-dwell="home" onClick={stopToHome}>Return to Home</button><button data-dwell="restart" onClick={()=>openDialog('restart')}>Restart</button></div></section>
    : <><section ref={stage} style={{'--descent':`${motion.descent}ms`,'--flip':`${motion.flip}ms`,'--success':`${phaseDuration.success}ms`} as CSSProperties} data-phase={session.phase} className={`${styles.play} ${session.paused?styles.paused:''} ${session.phase==='success'?styles.roundSuccess:''}`} aria-label="Card Matching">
        <div data-game-camera role="img" className={styles.gameCamera} aria-label="Camera area" />
        <div className={styles.instructions} role="status" data-layout="instruction"><h2>{!targetKnown?'Look carefully at the pictures!':session.phase==='success'?'Well Done!':session.phase==='feedback'?'Try Again!':instruction(session.round.reference,'en')}</h2>{session.phase==='previewing'&&session.closingSoon&&<p className={styles.closingSoon} data-closing-soon>Pictures will turn over soon.</p>}</div>
        <div key={session.revision} className={`${styles.answers} ${session.phase==='falling'?styles.falling:''} ${session.phase==='flipping'?styles.flipping:''} ${session.phase==='replaying'?styles.replaying:''}`} hidden={preparing||!imagesReady} aria-label="Answer cards">{session.round.answers.map((item,index)=>{
          const concealed=session.memory&&['flipping','revealingTarget','selecting','feedback','success'].includes(session.phase)&&!session.shown.includes(item.id),rejected=session.rejected.includes(item.id)&&['selecting','feedback','success'].includes(session.phase),correct=session.phase==='success'&&item.id===session.round.reference.id
          return <button key={item.id} data-answer={item.id} data-face={concealed?'back':'front'} data-dwell={`answer:${session.revision}:${item.id}`} onAnimationEnd={event=>{if(event.target===event.currentTarget)send({type:'land-complete',id:item.id,revision:session.revision,cycle:session.cycle})}} disabled={session.paused||!canSelect(session)||session.rejected.includes(item.id)} style={{animationDelay:`${index*motion.stagger/1000}s`,'--open-start':session.openingFrom.includes(item.id)?'0deg':'180deg'} as CSSProperties} aria-label={concealed?`Choose card ${index+1}`:`Choose ${item.label}`} className={`${styles.card} ${styles.answer} ${concealed?styles.concealed:''} ${rejected?styles.rejected:''} ${correct?styles.correct:''} ${hints&&!session.memory&&session.idle>=30000&&item.id===session.round.reference.id?styles.hintCard:''}`} onClick={()=>send({type:'choose',id:item.id})}><span data-card-rotor className={styles.cardRotor} onAnimationEnd={event=>{if(event.target===event.currentTarget)send({type:session.phase==='replaying'?'open-complete':'flip-complete',id:item.id,revision:session.revision,cycle:session.cycle})}}><span data-card-front className={styles.cardFront} aria-hidden={concealed}><Face item={item}/></span><span className={styles.cardBack} aria-hidden={!concealed}>✦<span>Singapore<br/>Skyline Journey</span></span></span>{correct&&<span className={styles.matchBadge} aria-label="Correct match">✓</span>}</button>
        })}</div>
        {targetKnown&&<aside ref={reference} data-reference className={`${styles.reference} ${session.phase==='reveal'?styles.reveal:''}`} hidden={!imagesReady} aria-label="Reference card"><h3>Match This Card</h3><div className={styles.card}><Face item={session.round.reference}/></div></aside>}
        <div className={styles.feedback} data-layout="feedback"><p role="status">{session.paused?'Paused. Take your time.':''}</p>{warning&&<p className={styles.warning} role="status">Returning to Home soon. Move your hand or press a key to keep playing.</p>}{imageError&&<p role="alert">A picture could not load. Please skip this round or return Home.</p>}</div>
        <div data-journey className={`${styles.journeyMargin} ${session.phase==='success'?styles.journeyCelebration:''}`}>
          <p className={styles.journeyCaption} role="status">{session.phase==='success'?`${journeyProgress(session.journey,session.limit).name} lights up!`:`${journeyProgress(session.journey,session.limit).stage} / ${journeyProgress(session.journey,session.limit).total} lit`}</p>
          <Skyline matches={session.journey} sessionLength={session.limit}/>
        </div>
      </section><div className={styles.recenter}><button data-dwell="recenter-game" onClick={()=>openDialog('calibration')}>Recenter Hand</button></div><div className={styles.staff}><button data-dwell="staff" onClick={()=>openDialog('staff')}>Staff Controls</button></div></>}
    {!closed&&!active&&<footer className={styles.footer} data-layout="footer"><p role="status">{cameraStatus}</p><div><button data-dwell="end-session" onClick={()=>openDialog('end')}>End Session</button>{cameraFailed&&<button data-dwell="retry-camera" onClick={reconnect}>Retry camera</button>}<button data-dwell="calibrate-footer" onClick={()=>openDialog('calibration')}>Recenter hand</button><a href={new URL('./assets/PHOTO_CREDITS.md',import.meta.url).href} target="_blank" rel="noreferrer">Picture credits</a></div></footer>}
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="dialog-title" onCancel={event=>{event.preventDefault();closeDialog()}}>
      {dialog==='pace'?<><h2 id="dialog-title">Game Pace</h2><p>Choose how long Memory Peek pictures stay open. This also applies to Replay Pictures. Direct Match has no memory timer.</p><Options label="Picture preview">{(Object.keys(gamePaces) as GamePace[]).map(value=><button key={value} data-dwell={`pace:${value}`} aria-pressed={pace===value} onClick={()=>{setPace(value);send({type:'pace',value})}}>{value[0].toUpperCase()+value.slice(1)} · {gamePaces[value]/1000} seconds</button>)}</Options><button data-dwell="pace-done" onClick={closeDialog}>Done</button></>
      :dialog==='setup'?<><h2 id="dialog-title">Game Options</h2><div className={styles.modeOptions}><Options label="Level"><button data-dwell="level:1" aria-pressed={!memory} onClick={()=>setMemory(false)}>1 — Direct Match</button><button data-dwell="level:2" aria-pressed={memory} onClick={()=>setMemory(true)}>2 — Memory Peek</button></Options></div>
        <Options label="Picture collection"><button data-dwell="pool:familiar" aria-pressed={pool==='familiar'} onClick={()=>setPool('familiar')}>Familiar</button><button data-dwell="pool:all" aria-pressed={pool==='all'} onClick={()=>setPool('all')}>Extended</button></Options>
        <button data-dwell="setup-done" onClick={closeDialog}>Done</button></>
      :dialog==='staff'?<><h2 id="dialog-title">Staff Controls</h2><div className={styles.staffGrid}>
        <button data-dwell="resume" onClick={()=>{pausedBeforeDialog.current=false;closeDialog()}}>Resume</button>
        <button data-dwell="repeat" onClick={()=>{closeDialog();repeat()}}>Repeat Instruction</button>
        {session?.memory&&<button data-dwell="peek-again" disabled={session.phase!=='selecting'} onClick={()=>{closeDialog();speech.cancel();send({type:'pause',value:false});send({type:'peek'})}}>Replay Pictures</button>}
        <button data-dwell="game-pace" onClick={()=>setDialog('pace')}>Game Pace</button>
        <button data-dwell="skip" onClick={()=>{closeDialog();speech.cancel();send({type:'pause',value:false});send({type:'skip'})}}>Skip Round</button>
        <button data-dwell="restart" onClick={()=>setDialog('restart')}>Restart</button>
        <button data-dwell="audio-settings" onClick={()=>setDialog('settings')}>English Audio Settings</button>
        <button data-dwell="camera-selection" onClick={()=>{void navigator.mediaDevices.enumerateDevices().then(d=>setDevices(d.filter(v=>v.kind==='videoinput'))).catch(()=>setNotice('Camera list unavailable. Use browser camera settings.'));setDialog('camera')}}>Camera Settings</button>
        <button data-dwell="calibration" onClick={()=>setDialog('calibration')}>Recenter / Calibrate Hand</button>
        <button data-dwell="tracking" onClick={()=>setDialog('tracking')}>Select Hand / Diagnostics</button>
        <button data-dwell="inactivity" onClick={()=>setDialog('settings')}>Inactivity Settings</button>
        <button data-dwell="fullscreen" onClick={()=>void fullscreen()}>Fullscreen</button>
        <button data-dwell="home" onClick={stopToHome}>Return Home</button>
        <button data-dwell="end-session" onClick={()=>setDialog('end')}>End Session</button>
        <a data-dwell="credits" href={new URL('./assets/PHOTO_CREDITS.md',import.meta.url).href} target="_blank" rel="noreferrer">Picture Credits</a>
      </div><p role="status">{notice}</p></>
      :dialog==='tracking'?<><h2 id="dialog-title">Choose the controlling hand</h2><TrackingPanel selector={mirror.selector}/><p role="status">{notice}</p><button data-dwell="tracking-done" onClick={closeDialog}>Done</button></>
      :dialog==='camera'?<><h2 id="dialog-title">Camera Selection</h2><p>Use framing to keep the resident’s face and raised hand visible. No video is saved.</p>
        <Options label="Vertical framing">{[.1,.25,.5,.75].map((value,index)=><button key={value} data-dwell={`frame-y:${value}`} aria-pressed={framing.y===value} onClick={()=>setFraming(old=>({...old,y:value}))}>{['Top','Upper body','Centre','Lower'][index]}</button>)}</Options>
        <Options label="Horizontal framing">{[.25,.5,.75].map((value,index)=><button key={value} data-dwell={`frame-x:${value}`} aria-pressed={framing.x===value} onClick={()=>setFraming(old=>({...old,x:value}))}>{['Left','Centre','Right'][index]}</button>)}</Options>
        <Options label="Pointer mapping"><button data-dwell="mapping:aligned" aria-pressed={!assisted} onClick={()=>setAssisted(false)}>Mirror aligned</button><button data-dwell="mapping:assisted" aria-pressed={assisted} onClick={()=>setAssisted(true)}>Assisted reach</button></Options>
        <p className={styles.smallNotice}>Cover framing crops some camera edges on wide screens. The mirror-aligned pointer follows the displayed palm. Assisted reach and Recenter support smaller movements.</p><div className={styles.staffGrid}>{devices.map((device,index)=><button key={device.deviceId} data-dwell={`camera:${index}`} onClick={()=>{mirror.device.current=device.deviceId;reconnect();closeDialog()}}>{device.label||`Camera ${index+1}`}</button>)}</div><p>{notice}</p><button data-dwell="camera-done" onClick={closeDialog}>Done</button></>
      :dialog==='settings'?<><h2 id="dialog-title">Make the journey comfortable</h2><div className={styles.settingsGrid}>
        <Options label="English audio"><button data-dwell="settings-audio" onClick={()=>{speech.cancel();setAudio(!audio)}}>Audio: {audio?'On':'Off'}</button></Options>
        <Options label="Narration voice"><p>{speech.selectedVoice?`${speech.selectedVoice.name} (${speech.selectedVoice.lang})`:'No compatible voice is available.'}</p><button data-dwell="next-voice" disabled={!speech.voices.length} onClick={()=>{const index=speech.voices.findIndex(v=>v.voiceURI===speech.selectedVoice?.voiceURI);setVoiceURI(speech.voices[(index+1)%speech.voices.length].voiceURI)}}>Next voice</button><button data-dwell="test-voice" onClick={()=>{speech.refreshVoices();speech.speak(messages[narration].voiceSample,'app:preview',true)}} disabled={!audio}>Test Voice</button><p role="status" data-speech-status>{speech.status}</p></Options>
        <Options label="Speaking pace">{[.8,.9,1].map((value,i)=><button key={value} data-dwell={`rate:${value}`} aria-pressed={rate===value} onClick={()=>setRate(value)}>{['Slow','Gentle','Natural'][i]}</button>)}</Options>
        <Options label="Speech volume">{[.4,.65].map(value=><button key={value} data-dwell={`volume:${value}`} aria-pressed={volume===value} onClick={()=>setVolume(value)}>{value===.4?'Softer':'Moderate'}</button>)}</Options>
        <Options label="Hover duration">{[800,1000,1500].map(value=><button key={value} data-dwell={`dwell:${value}`} aria-pressed={duration===value} onClick={()=>setDuration(value)}>{value===1000?'1 second':`${value/1000} seconds`}</button>)}</Options>
        <Options label="Pointer reach">{[1.1,1.45,1.8].map((value,i)=><button key={value} data-dwell={`reach:${value}`} aria-pressed={calibration.reach===value} onClick={()=>setCalibration(old=>({...old,reach:value}))}>{['Standard','Comfortable','Small movements'][i]}</button>)}</Options>
        <Options label="Return Home after inactivity">{[30,60,0].map(value=><button key={value} data-dwell={`timeout:${value}`} aria-pressed={timeout===value} onClick={()=>setTimeoutSeconds(value)}>{value?`${value} seconds`:'Disabled'}</button>)}</Options>
      </div><p className={styles.smallNotice}>English narration uses local system voices or bundled recordings. No network speech is used. Human recordings are not installed. Memory Peek uses at least one second of hover.</p><div className={styles.dialogActions}><button data-dwell="hints" aria-pressed={hints} onClick={()=>setHints(!hints)}>Automatic hints: {hints?'On':'Off'}</button><button data-dwell="close-settings" className={styles.start} onClick={closeDialog}>Done</button></div></>
      :dialog==='calibration'?<><h2 id="dialog-title">Make yourself comfortable</h2><p>Hold one hand in your natural resting position. We’ll centre the pointer there after a short pause.</p><p>Recenter enables assisted reach for comfortable seated use. The small marker still follows your displayed palm. Choose Mirror aligned in Camera Settings for a literal palm-aligned pointer. Nothing is saved.</p><div className={styles.dialogActions}><button data-dwell="reset-calibration" onClick={()=>{setCalibration(defaultCalibration);closeDialog()}}>Reset hand reach</button><button data-dwell="cancel-calibration" onClick={closeDialog}>Cancel</button></div></>
      :<><p className={styles.eyebrow}>TAKE YOUR TIME</p><h2 id="dialog-title">{dialog==='restart'?'Start a fresh journey?':dialog==='end'?'End this camera session?':'Return to Home?'}</h2><p>{dialog==='end'?'Staff: this stops the camera, tracking and audio. Reopening requires a mouse, touch or keyboard.':dialog==='restart'?'This will begin a new session with the same settings.':'This game will end. Camera and hand navigation stay active on Home.'}</p><div className={styles.dialogActions}><button data-dwell="cancel-confirmation" onClick={closeDialog}>Keep playing</button><button data-dwell={`confirm:${dialog}`} className={styles.start} onClick={()=>dialog==='end'?endSession():dialog==='restart'?start():stopToHome()}>{dialog==='restart'?'Restart':dialog==='end'?'End Session':'Return to Home'}</button></div></>}
    </dialog>
    {createPortal(<div ref={cursor} hidden className={styles.pointer} role="img" aria-label="Hand pointer"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="39" className={styles.pointerOutline}/><circle cx="40" cy="40" r="35" className={styles.pointerBase}/><circle ref={ring} cx="40" cy="40" r="35" className={styles.pointerProgress} strokeDasharray="0 220"/></svg><svg className={styles.openHand} viewBox="0 0 64 72" aria-hidden="true"><path d="M18 39V17c0-7 8-7 8 0V7c0-7 9-7 9 0v10-8c0-7 9-7 9 0v16-7c0-7 8-7 8 0v25c0 18-9 25-22 25-10 0-15-6-21-17L3 40c-3-6 4-10 8-5l7 8Z"/></svg></div>, dialog && dialogRef.current ? dialogRef.current : document.body)}
  </main>
}
