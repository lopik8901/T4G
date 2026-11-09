import type { Language } from './localisation.ts'
export type VoiceInfo = { voiceURI: string; name: string; lang: string; localService: boolean }
export function compatibleVoice(voice: VoiceInfo, language: Language): boolean {
  const tag = voice.lang.replaceAll('_','-').toLowerCase()
  return language==='en'&&/^en(?:-|$)/.test(tag)
}
export function rankVoices<T extends VoiceInfo>(voices: readonly T[], language: Language): T[] {
  const score = (voice: T) => (voice.localService ? 100 : 0) + (/[-_]SG$/i.test(voice.lang) ? 60 : 0)
    + (/Samantha|Daniel|Karen/i.test(voice.name) ? 20 : 0)
  return voices.filter(voice => voice.localService === true && compatibleVoice(voice,language) && !/Albert|Bad News|Good News|Bahh|Bells|Boing|Bubbles|Cellos|Jester|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox/i.test(voice.name))
    .sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name))
}
// Approved human recordings take priority. No human recordings are installed.
export const recordedClips: Partial<Record<Language,Record<string,string>>> = {}
export function instructionKey(categoryId: string, cardId: string): string { return `find:${categoryId}:${cardId}` }
/** Bundled audio may use only the application origin, never an external TTS/audio URL. */
export function localRecording(path:string|undefined,base:string):string|undefined {
  if(!path)return
  try{const url=new URL(path,base),origin=new URL(base);return url.origin===origin.origin&&/^https?:$/.test(url.protocol)?path:undefined}catch{return}
}
