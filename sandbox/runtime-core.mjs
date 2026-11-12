// Trusted, data-only SDK shared by the isolated browser and Docker harness.
export function createRuntime(definition = {}, seed = 1) {
  const mode = definition.mode ?? 'open-ended', rounds = mode === 'rounds' ? definition.rounds ?? 1 : 1
  let randomState = (seed >>> 0) || 1, delay = 0
  const state = {phase:'ready',round:1,rounds,progress:0,goal:definition.goal??1,revision:0,mode,objective:definition.objective??'Move gently and explore.',message:''}
  const random = () => { randomState = (Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296 }
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
  const helpers = {
    distance,
    overlap:(a,b,padding=0)=>distance(a.position,b.position)<=a.radius+b.radius+padding,
    follow:(point,target,speed,dt)=>{const d=distance(point,target),step=Math.min(d,Math.min(Math.max(0,speed),definition.maximumSpeed??.5)*Math.min(.1,Math.max(0,dt)));return d?{x:point.x+(target.x-point.x)*step/d,y:point.y+(target.y-point.y)*step/d}:{...point}},
    shuffle:values=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out},
  }
  const completeRound=()=>{if(state.phase!=='playing'||mode==='open-ended')return;state.phase=state.round<rounds?'round_complete':'game_complete';state.message=state.phase==='game_complete'?(definition.completionMessage??'Lovely teamwork. Play again whenever you like.'):'Lovely work. A new arrangement is coming.';delay=0}
  return {
    state,helpers,random,
    start(){if(state.phase==='ready')state.phase='playing'},
    addProgress(amount=1){if(state.phase!=='playing')return;state.progress=Math.min(mode==='open-ended'?999:state.goal,state.progress+Math.max(0,Math.floor(amount)));if(mode!=='open-ended'&&state.progress>=state.goal)completeRound()},
    completeRound,
    tick(dt){if(state.phase==='round_complete'){delay+=Math.min(.1,Math.max(0,dt));if(delay>=1.2){state.round++;state.progress=0;state.revision++;state.phase='playing';state.message='';delay=0}}},
    restartRound(){state.progress=0;state.revision++;state.phase='playing';state.message='';delay=0},
    replay(nextSeed=seed){randomState=(nextSeed>>>0)||1;Object.assign(state,{phase:'ready',round:1,progress:0,revision:state.revision+1,message:''});delay=0},
    snapshot(){return {...state}},
  }
}
export function createGameContext(scene, seed = 1) {
  const runtime=createRuntime({...scene.lifecycle,maximumSpeed:scene.accessibility?.maximumSpeed??.5},seed)
  const context={
    entities:scene.entities.map(e=>({id:e.id,kind:e.kind,position:{x:e.x,y:e.y},radius:e.radius,visible:true,state:Object.fromEntries((e.state??[]).map(p=>[p.key,p.value])),...(e.assetId?{assetId:e.assetId}:{}),...(e.label?{label:e.label}:{})})),
    state:{},input:{time:0,hands:[],sound:false,pointer:null},runtime,sound:false,
    emit(o){
      if(o.type==='sound')context.sound=true
      if(o.type==='remove')context.entities=context.entities.filter(e=>e.id!==o.entityId)
      if(o.type==='spawn'&&!context.entities.some(e=>e.id===o.entityId)&&context.entities.length<64&&o.value&&typeof o.value==='object'){
        const v=o.value
        context.entities.push({id:o.entityId,kind:v.kind,position:{x:v.x,y:v.y},radius:v.radius,visible:true,state:v.state&&typeof v.state==='object'?v.state:{},...(v.assetId?{assetId:v.assetId}:{}),...(v.label?{label:v.label}:{})})
      }
    },
  }
  return context
}
export function snapshotContext(context, hasLifecycle = false) {
  return {sound:context.sound,...(hasLifecycle?{lifecycle:context.runtime.snapshot()}:{}),entities:context.entities.map(e=>({id:e.id,kind:e.kind,x:e.position.x,y:e.position.y,radius:e.radius,visible:e.visible,completed:!!(e.state.bloomed||e.state.completed),visualState:e.state.disabled?'disabled':e.state.bloomed||e.state.completed?'completed':e.state.selected?'selected':'idle',...(e.assetId?{assetId:e.assetId}:{}),...(e.label?{label:e.label}:{})}))}
}
