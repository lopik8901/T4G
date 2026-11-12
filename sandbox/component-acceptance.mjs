// Developer-owned probes for the two component examples, not gameplay implementations.
export function verifyComponent(kind,context,step,reset,parameters){
  if(!kind)return []
  const assert=(ok,message)=>{if(!ok)throw Error(`Component acceptance: ${message}`)}
  const hands=points=>{context.input={time:context.input.time+50,hands:points.map((position,i)=>({id:`hand-${i}`,position})),sound:false,pointer:null};step()}
  const snapshot=()=>JSON.stringify(context.entities)
  const checks=[]
  reset(7);for(let i=0;i<40;i++)hands([]);const deterministic=snapshot()
  reset(7);for(let i=0;i<40;i++)hands([]);assert(snapshot()===deterministic,'same seed/input must be deterministic');checks.push('component-determinism')
  if(kind==='ordered-selection'){
    reset(7)
    const ordered=()=>context.entities.filter(e=>e.kind===parameters.targetKind).sort((a,b)=>a.state.order-b.state.order)
    assert(ordered().length>=3,'three ordered targets required')
    hands([ordered()[1].position]);assert(!ordered().some(e=>e.state.completed),'out-of-order selection must not advance')
    hands([]);hands([ordered()[0].position,ordered()[0].position]);assert(ordered()[0].state.completed&&!ordered()[1].state.completed,'two hands cannot double-select')
    hands([]);hands([ordered()[1].position]);hands([]);hands([ordered()[2].position]);assert(ordered().every(e=>e.state.completed),'ordered sequence completes')
    reset(7);assert(!ordered().some(e=>e.state.completed),'reset clears selection');checks.push('ordered-selection','wrong-order-rejection','simultaneous-hands','component-reset')
  }else if(kind==='autonomous-wandering'){
    reset(7);const before=context.entities.map(e=>({...e.position}))
    for(let i=0;i<300;i++){hands([]);for(const e of context.entities)assert(e.position.x>=e.radius&&e.position.x<=1-e.radius&&e.position.y>=e.radius&&e.position.y<=1-e.radius,'movement respects radius/bounds')}
    assert(context.entities.some((e,i)=>Math.hypot(e.position.x-before[i].x,e.position.y-before[i].y)>.02),'wanders without hands')
    checks.push('autonomous-wandering','boundary-collision','tracking-independent')
  }else throw Error('Unknown component probe')
  return checks
}
