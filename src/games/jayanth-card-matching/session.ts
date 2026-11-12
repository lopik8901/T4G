import type { Category } from './categories.ts'
import { createRound, isMatch, type Round } from './logic.ts'
export type Phase = 'reveal' | 'settling' | 'falling' | 'replaying' | 'previewing' | 'flipping' | 'revealingTarget' | 'selecting' | 'feedback' | 'answering' | 'success' | 'complete'
// Milliseconds; CSS receives these values through custom properties.
export const motion = { descent:1500, stagger:400, flip:900, flipStagger:0, target:1500, reduced:100, dwell:1000 } as const
export const phaseDuration = { reveal:1800, settling:motion.target, falling:motion.descent+3*motion.stagger, previewing:10000, flipping:motion.flip+3*motion.flipStagger, revealingTarget:motion.target, feedback:1200, success:2000 }
export const gamePaces = { relaxed:14000, standard:10000, brisk:8000 } as const
export type GamePace = keyof typeof gamePaces
export const closingSoonDuration = 3000
export type Session = {
  pace:GamePace; cycle:number; opened:string[]; shown:string[]; openingFrom:string[]; closingSoon:boolean;
  targetSettled:boolean; memory:boolean; selected:string|null; closed:string[]; landed:string[];
  category:Category; limit:number; number:number; round:Round; phase:Phase;
  paused:boolean; rejected:string[]; idle:number; successTime:number; revision:number;
  journey:number; phaseTime:number; history:string[]; reducedMotion:boolean
}
export type Event = {type:'choose';id:string}|{type:'tick';delta:number;idle?:boolean}|
  {type:'pace';value:GamePace}|{type:'open-complete';id:string;revision:number;cycle?:number}|{type:'target-complete';revision:number;cycle?:number}|{type:'land-complete';id:string;revision:number;cycle?:number}|{type:'flip-complete';id:string;revision:number;cycle?:number}|{type:'peek'}|{type:'pause';value:boolean}|
  {type:'activity'}|{type:'advance';round?:Round}|{type:'skip';round?:Round}
export function canSelect(state:Session){return !state.paused&&(state.phase==='answering'||state.phase==='selecting')}
export function newSession(category:Category,limit:number,reducedMotion=false,memory=false,pace:GamePace='standard'):Session {
  const round=createRound(category)
  return {pace,cycle:0,opened:[],shown:[],openingFrom:[],closingSoon:false,targetSettled:false,memory,selected:null,closed:[],landed:[],category,limit,number:1,round,phase:memory?'falling':'reveal',paused:false,rejected:[],idle:0,successTime:0,revision:0,journey:0,phaseTime:0,history:[round.reference.id],reducedMotion}
}
export function updateSession(state:Session,event:Event):Session {
  if(event.type==='pace')return {...state,pace:event.value,closingSoon:state.phase==='previewing'&&state.phaseTime>=gamePaces[event.value]-closingSoonDuration}
  if('cycle' in event&&event.cycle!==undefined&&event.cycle!==state.cycle)return state
  if(event.type==='open-complete'){
    if(state.phase!=='replaying'||event.revision!==state.revision||state.opened.includes(event.id)||!state.round.answers.some(c=>c.id===event.id))return state
    return {...state,opened:[...state.opened,event.id]}
  }
  if(event.type==='pause')return state.phase==='complete'?state:{...state,paused:event.value}
  if(event.type==='target-complete')return state.phase==='revealingTarget'&&event.revision===state.revision?{...state,targetSettled:true}:state
  if(event.type==='land-complete'){
    if(state.phase!=='falling'||event.revision!==state.revision||state.landed.includes(event.id)||!state.round.answers.some(c=>c.id===event.id))return state
    return {...state,landed:[...state.landed,event.id]}
  }
  if(event.type==='flip-complete'){
    if(state.phase!=='flipping'||event.revision!==state.revision||state.closed.includes(event.id)||!state.round.answers.some(c=>c.id===event.id))return state
    return {...state,closed:[...state.closed,event.id]}
  }
  if(state.paused)return state
  if(event.type==='activity')return {...state,idle:0}
  if(event.type==='peek')return state.memory&&state.phase==='selecting'?{...state,phase:'replaying',cycle:state.cycle+1,opened:[],openingFrom:state.shown,shown:[],closingSoon:false,phaseTime:0,idle:0,selected:null,closed:[],targetSettled:false}:state
  if(state.phase==='complete')return event.type==='tick'&&event.idle!==false?{...state,idle:state.idle+event.delta}:state
  if(event.type==='tick'){
    const delta=Math.max(0,event.delta),elapsed=state.phaseTime+delta
    const next={...state,phaseTime:elapsed,idle:state.idle+(canSelect(state)&&event.idle!==false?delta:0),successTime:state.successTime+(state.phase==='success'?delta:0)}
    if(state.phase==='reveal'&&elapsed>=phaseDuration.reveal)return {...next,phase:'settling',phaseTime:0}
    if(state.phase==='settling'&&elapsed>=(state.reducedMotion?motion.reduced:phaseDuration.settling))return {...next,phase:'falling',phaseTime:0}
    if(state.phase==='falling'&&elapsed>=(state.reducedMotion?motion.reduced:phaseDuration.falling)&&(state.reducedMotion||state.landed.length===4))return {...next,phase:state.memory?'previewing':'answering',phaseTime:0}
    if(state.phase==='replaying'&&elapsed>=motion.flip&&state.opened.length===4)return {...next,phase:'previewing',phaseTime:0}
    if(state.phase==='previewing'&&elapsed>=gamePaces[state.pace])return {...next,phase:'flipping',phaseTime:0,closed:[]}
    // Both the state clock AND every actual card animation must finish.
    if(state.phase==='previewing'&&elapsed>=gamePaces[state.pace]-closingSoonDuration)return {...next,closingSoon:true}
    if(state.phase==='flipping'&&elapsed>=phaseDuration.flipping&&state.closed.length===state.round.answers.length)return {...next,phase:'revealingTarget',phaseTime:0,targetSettled:false}
    if(state.phase==='revealingTarget'&&elapsed>=phaseDuration.revealingTarget&&state.targetSettled)return {...next,phase:'selecting',phaseTime:0,idle:0}
    if(state.phase==='feedback'&&elapsed>=phaseDuration.feedback)return {...next,phase:'selecting',phaseTime:0,selected:null}
    return next
  }
  if(event.type==='choose'){
    if(!canSelect(state)||state.rejected.includes(event.id)||!state.round.answers.some(c=>c.id===event.id))return state
    return isMatch(state.round,event.id)?{...state,phase:'success',shown:[...state.shown,event.id],selected:event.id,journey:state.journey+1,idle:0,successTime:0,phaseTime:0}:
      {...state,phase:state.memory?'feedback':'answering',shown:[...state.shown,event.id],selected:event.id,rejected:[...state.rejected,event.id],phaseTime:0,idle:0}
  }
  if(event.type==='advance'&&(state.phase!=='success'||state.successTime<phaseDuration.success))return state
  if(event.type==='advance'||event.type==='skip'){
    if(state.limit&&state.number>=state.limit)return {...state,phase:'complete',idle:0,revision:state.revision+1}
    const prepared=event.round&&event.round.reference.id!==state.round.reference.id&&event.round.answers.findIndex(c=>c.id===event.round!.reference.id)!==state.round.answers.findIndex(c=>c.id===state.round.reference.id)?event.round:undefined
    const round=prepared??createRound(state.category,state.round.reference.id,Math.random,state.history,state.round.answers.findIndex(c=>c.id===state.round.reference.id))
    return {...state,number:state.number+1,round,phase:state.memory?'falling':'reveal',cycle:state.cycle+1,shown:[],opened:[],openingFrom:[],closingSoon:false,targetSettled:false,rejected:[],closed:[],landed:[],selected:null,successTime:0,phaseTime:0,revision:state.revision+1,history:[...state.history,round.reference.id].slice(-200)}
  }
  return state
}
