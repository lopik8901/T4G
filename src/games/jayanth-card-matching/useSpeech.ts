import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from './localisation'
import { rankVoices, recordedClips, localRecording } from './speech'
type Request = { text: string; contentId?: string; language: Language }
type Playback = 'idle' | 'speaking' | 'finished' | 'blocked' | 'error'
export function useSpeech(language: Language, enabled: boolean, selectedURI = '', rate = .9, volume = .65) {
  const [allVoices,setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [playback,setPlayback] = useState<Playback>('idle')
  const [error,setError] = useState('')
  const [source,setSource]=useState('local speech')
  const [clipError,setClipError] = useState(false)
  const voices = rankVoices(allVoices,language)
  const voice = voices.find(item=>item.voiceURI===selectedURI) ?? voices[0]
  const current = useRef({language,enabled,voice,rate,volume})
  current.current = {language,enabled,voice,rate,volume}
  const pending = useRef<Request | null>(null)
  const clip = useRef<HTMLAudioElement | null>(null)
  const last = useRef({text:'',language,time:0})
  const generation = useRef(0), speaking = useRef(false)
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancel = useCallback(()=>{
    generation.current++;pending.current=null;clearTimeout(watchdog.current);speaking.current=false
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    clip.current?.pause();clip.current=null
    setPlayback(old=>old==='speaking'?'idle':old)
  },[])
  const refreshVoices=useCallback(()=>{if ('speechSynthesis' in window) setVoices(window.speechSynthesis.getVoices())},[])
  useEffect(()=>{
    if (!('speechSynthesis' in window)) return
    const update=refreshVoices
    update();window.speechSynthesis.addEventListener('voiceschanged',update)
    // Chrome may populate voices late without delivering the first event to a
    // newly mounted listener. Bounded refreshes supplement voiceschanged.
    const timers=[250,1000,2500].map(delay=>setTimeout(update,delay))
    return ()=>{timers.forEach(clearTimeout);window.speechSynthesis.removeEventListener('voiceschanged',update)}
  },[refreshVoices])
  useEffect(()=>{cancel();setPlayback('idle');setError('');setClipError(false);return cancel},[language,enabled,selectedURI,cancel])
  const play = useCallback((request: Request)=>{
    const env=current.current
    if (!env.enabled || env.language!==request.language) return
    const candidate=request.contentId?recordedClips[env.language]?.[request.contentId]:undefined
    const path=localRecording(candidate,location.href)
    if (!path && !env.voice) {setClipError(!!candidate);pending.current=request;return}
    cancel();setError('');setClipError(!!candidate&&!path);setSource(path?'a bundled recording':env.voice?.name??'local speech');const run=generation.current
    let settled=false
    const finish=()=>{if(run===generation.current&&!settled){settled=true;speaking.current=false;clearTimeout(watchdog.current);setPlayback('finished')}}
    const fail=(code:string)=>{
      if(run!==generation.current||settled)return
      settled=true;speaking.current=false;clearTimeout(watchdog.current);setError(code)
      setPlayback(code==='not-allowed'?'blocked':code==='canceled'||code==='interrupted'?'idle':'error')
    }
    let fallbackStarted=false
    const browserSpeech=()=>{
      if(fallbackStarted||run!==generation.current||settled)return
      fallbackStarted=true;setSource(env.voice?.name??'local speech');clearTimeout(watchdog.current)
      if(path){clip.current?.pause();clip.current=null;setClipError(true)}
      if(!env.voice||!('speechSynthesis' in window)){fail('no-compatible-voice');return}
      const utterance=new SpeechSynthesisUtterance(request.text)
      utterance.voice=env.voice;utterance.lang=env.voice.lang.replaceAll('_','-');utterance.rate=env.rate;utterance.volume=env.volume
      speaking.current=true;setPlayback('speaking')
      utterance.onend=finish
      utterance.onerror=event=>fail(event.error)
      utterance.onstart=()=>{if(run===generation.current&&!settled){clearTimeout(watchdog.current);watchdog.current=setTimeout(()=>{if(run===generation.current){window.speechSynthesis.cancel();fail('playback-timeout')}},30000)}}
      watchdog.current=setTimeout(()=>{if(run===generation.current){window.speechSynthesis.cancel();fail('speech-start-timeout')}},15000)
      try {window.speechSynthesis.resume?.();window.speechSynthesis.speak(utterance)} catch {fail('speech-api-error')}
    }
    if(path){
      const audio=new Audio(path);clip.current=audio;audio.volume=env.volume;speaking.current=true;setPlayback('speaking')
      audio.onended=finish;audio.onerror=browserSpeech
      watchdog.current=setTimeout(()=>{if(run===generation.current){audio.pause();fail('playback-timeout')}},15000)
      void audio.play().catch(browserSpeech)
    }else browserSpeech()
  },[cancel])
  const speak=useCallback((text:string,contentId?:string,force=false)=>{
    const env=current.current
    if(!env.enabled)return
    const now=performance.now()
    if(!force&&last.current.text===text&&last.current.language===env.language&&now-last.current.time<5000)return
    cancel();last.current={text,language:env.language,time:now}
    play({text,contentId,language:env.language})
  },[cancel,play])
  useEffect(()=>{
    // Retry only the latest still-current request. Language changes/cancel/next
    // round discard old requests; never resume an obsolete instruction.
    if(voice&&pending.current&&pending.current.language===language&&enabled)play(pending.current)
  },[voice,language,enabled,play])
  const name='English'
  const available=!!voice||!!recordedClips[language]?.['app:preview']
  const baseStatus=!enabled?'Audio is off.':!available?`No local ${name} voice is available. Download a ${name} system voice in your computer’s accessibility/speech settings, restart Chrome and click Test Voice.`
    :playback==='blocked'?`${name} audio did not start. Click Test Voice directly to allow speech, and check Chrome’s sound permission.`
    :playback==='error'?`${name} speech did not play. ${error==='speech-start-timeout'?'The local voice did not start in time. ':''}Check the installed voice and speaker output, then click Test Voice. Restart Chrome after downloading a voice.`
    :playback==='speaking'?`${name} speech requested using ${source}.`
    :playback==='finished'?`${name} playback ended; audibility is unverified. Staff must listen using Test Voice.`
    :`${name} voice ready: ${voice?.name??'recorded preview'}${voice?` (${voice.lang})`:''}. Local system speech; no network TTS.`
  const status=(clipError?'The local recording could not load. Trying a compatible local voice. ':'')+baseStatus
  return {speak,cancel,available,voices,speaking,selectedVoice:voice,status,playback,refreshVoices}
}
