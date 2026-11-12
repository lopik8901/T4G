import type { GameDesignSpec, VisualSpec } from '../../src/engine/design.ts'
import type { SourceBundle } from '../../src/engine/generation.ts'
import {discoverComponents} from './discovery.ts'
import type { ComponentRecord } from '../../src/engine/components.ts'
import type { GenerationPlan } from '../../src/engine/generation.ts'

export function reviewPlan(plan:GenerationPlan){
  const issues:string[]=[]
  if(!plan.requirements?.length)issues.push('Provide the structured component requirements, including canonical capabilities for reused implementations.')
  if(plan.acceptance.some(a=>/requires correction|^todo\b|^tbd\b/i.test(a)))issues.push('Replace placeholder acceptance text with concrete observable checks.')
  return issues
}

export function reviewRequestedCounts(request:string,design:Pick<GameDesignSpec,'objective'|'lifecycle'>):string[] {
  const numbers:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}
  const value=(s:string)=>numbers[s]??Number(s)
  const pattern='(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)'
  const text=request.toLowerCase()
  const explicit=(suffix:string)=>[...text.matchAll(new RegExp('(?<![\\w-])'+pattern+'(?![\\w-])'+suffix,'g'))].find(m=>{
    const prefix=text.slice(0,m.index).slice(-70)
    return !/(?:up to|at most|at least|no more than|around|about|between|avoid|not|no|instead of|rather than)\s*(?:[a-z]+\s+){0,2}$/.test(prefix)&&!new RegExp(pattern+'\\s+(?:to|or|and)\\s*$').test(prefix)
  })
  const rounds=explicit('\\s+(?:short\\s+)?rounds\\b')
  // Participants, baskets and seconds are not successful outcomes. Only bind
  // explicit outcome/object counts, never an arbitrary noun before "per round".
  const goal=explicit('\\s+(?:correct\\s+|successful\\s+)?(?:fruits?|items?|objects?|food pieces|selections?|matches|outcomes?|collections?)\\s+per round\\b')
  const issues:string[]=[]
  if(rounds&&design.lifecycle.rounds!==value(rounds[1]))issues.push(`Preserve the requested ${value(rounds[1])} rounds.`)
  if(goal&&design.lifecycle.goal!==value(goal[1]))issues.push(`Per-round goal must be ${value(goal[1])}, not ${design.lifecycle.goal}. Do not multiply it by the number of rounds.`)
  if(/\bSDK\b|\bTypeScript\b|\bAPI\b/.test(design.objective))issues.push('The objective must be a short resident-facing instruction, not implementation details.')
  return issues
}

export function reviewGame(design:GameDesignSpec,visual:VisualSpec,bundle:SourceBundle,persisted:ComponentRecord[]=[]) {
  const issues:string[]=[],warnings:string[]=[],scene=bundle.scene
  if(!scene)return {passed:false,checks:[],issues:['A playable scene is missing.'],warnings,screenshotReviewed:false as const}
  const assets=new Set(visual.assets.map(a=>a.id))
  for(const r of design.requirements.filter(r=>r.kind==='visual')){
    if(discoverComponents([r],undefined,persisted)[0].missingCapabilities?.some(c=>/-art|illustration|sprite|asset-generation|image-generation/.test(c)))issues.push(`${r.id}: no approved artwork supplies this capability. External/new asset generation is not configured; do not relabel unrelated artwork as the requested object.`)
  }
  for(const e of scene.entities){
    const state=Object.fromEntries(e.state.map(p=>[p.key,p.value]))
    if(state.role==='control'||state.action==='restartRound')warnings.push(`${e.id}: trusted UI already provides Play Again and Restart round; check whether this control is necessary.`)
    const primitive=['circle','bubble','balloon','pond'].includes(e.appearance)
    if(e.assetId?!assets.has(e.assetId):!primitive)issues.push(`${e.id}: select an approved illustrated asset ID.`)
    if(state.role==='target'&&(!e.label||e.label.length>24))warnings.push(`${e.id}: consider a short label or a clearly recognizable visual symbol.`)
    if(state.role==='target'&&e.radius<design.accessibility.minimumTargetRadius)issues.push(`${e.id}: target collision radius is too small.`)
    if(state.role==='source'&&e.radius<.045)issues.push(`${e.id}: source artwork is too small.`)
    if(e.y<.25||e.y>.85)warnings.push(`${e.id}: check the actual preview for clipping or instruction overlap; setup may reposition this object.`)
  }
  if(['match-categories','guide-to-target'].includes(design.interaction)){
    const roles=scene.entities.map(e=>Object.fromEntries(e.state.map(p=>[p.key,p.value])))
    if(!roles.some(s=>s.role==='source')||!roles.some(s=>s.role==='target'))warnings.push('Setup may spawn sources or targets; runtime checks must observe usable source/target roles and matching categories.')
    if(design.lifecycle.mode!=='open-ended'&&roles.filter(s=>s.role==='source').length!==design.lifecycle.goal)warnings.push('Initial source count differs from the goal; runtime checks must prove spawning or pooling makes the round completable.')
  }
  return {passed:issues.length===0,checks:['approved-local-art-or-safe-primitives','seated-target-size','presentation-review','runtime-goal-validation-required','design-lifecycle-attached'],issues,warnings,screenshotReviewed:false as const}
}
