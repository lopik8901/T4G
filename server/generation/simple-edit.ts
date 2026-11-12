import type { GameConfig, GamePatch } from '../../src/studio/config.ts'

/** Narrow, explicit presentation edits bypass all generation roles; mixed/mechanics requests do not. */
export function simpleExperimentalEdit(prompt:string,config:GameConfig):GamePatch|null {
  const text=prompt.trim().toLowerCase().replace(/[.!]$/,'')
  if(/^(mute|mute (the )?(game|sound|audio))$/.test(text))return {volume:0}
  if(/^(unmute|unmute (the )?(game|sound|audio))$/.test(text))return {volume:.25}
  if(/^(slow down|slow down the game|make (it|the game) slower)$/.test(text))return {speed:Math.max(.2,Math.round(config.speed*.7*100)/100)}
  if(/^(speed up|make (it|the game) faster)$/.test(text))return {speed:Math.min(1.8,Math.round(config.speed*1.2*100)/100)}
  if(/^(two players|two residents|make it suitable for two players)$/.test(text))return {players:2}
  if(/^(one player|one resident)$/.test(text))return {players:1}
  const theme=text.match(/^change (?:the )?(?:(?:colour|color) )?theme to (meadow|ocean|sunshine)$/)?.[1]
  if(theme)return {theme:theme as GameConfig['theme']}
  const name=prompt.trim().match(/^rename (?:it|the game|the activity) to ["']?([^\n]{1,80}?)["']?$/i)?.[1]
  if(name)return {name}
  return null
}
export function requiresNewDesign(request:string):boolean {
  return /\b(rounds?|stages?|objectives?|goals?|open.ended|completion|new game|new activity|different game|instead|switch)\b|^(?:create|build|replace|turn .* into)\b/i.test(request)
}
