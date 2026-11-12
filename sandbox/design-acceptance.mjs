// Independent generic interaction/lifecycle probes. No game-name branches or gameplay implementation.
export function verifyDesign(scene, context, stepMechanic, reset) {
  if(!scene.lifecycle||!['match-categories','guide-to-target'].includes(scene.interaction)||scene.lifecycle.mode==='open-ended')return []
  const assert=(ok,text)=>{if(!ok)throw Error(`Design acceptance: ${text}`)}
  let time=0
  const step=(hand)=>{time+=50;context.input={time,hands:hand?[{id:'one',position:hand},{id:'two',position:{x:.99,y:.02}}]:[],sound:false,pointer:null};stepMechanic()}
  const sources=()=>context.entities.filter(e=>e.state.role==='source'&&e.visible&&e.state.collected!==true)
  const targets=()=>context.entities.filter(e=>e.state.role==='target'&&e.visible)
  const waitFor=(read)=>{for(let i=0;i<100&&!read()&&context.runtime.state.phase==='playing';i++)step();return read()}
  const guide=(source,target,done)=>{
    let from={...source.position}
    for(let i=0;i<12&&!done();i++)step(from)
    for(const waypoint of [{x:target.position.x,y:.5},{...target.position}]){
      for(let i=1;i<=120&&!done();i++){const t=i/120;step({x:from.x+(waypoint.x-from.x)*t,y:from.y+(waypoint.y-from.y)*t})}
      from=waypoint
    }
    for(let i=0;i<200&&!done();i++)step(from)
  }
  reset(1)
  let wrongChecked=false,arrangement=''
  for(let round=1;round<=context.runtime.state.rounds;round++){
    assert(context.runtime.state.round===round,'round transitions must advance exactly once')
    assert(waitFor(()=>sources()[0]),'round has no selectable source before its goal is met')
    const initial=JSON.stringify(sources().map(e=>({position:e.position,category:e.state.category,assetId:e.assetId})))
    if(round>1&&scene.lifecycle.layout!=='fixed')assert(initial!==arrangement,'shuffled rounds need a new arrangement or content; declare layout fixed for intentional repetition')
    arrangement=initial
    for(let n=0;n<context.runtime.state.goal;n++){
      const source=waitFor(()=>sources()[0])
      assert(source,'round has no selectable source before its goal is met')
      const target=waitFor(()=>targets().find(e=>e.state.category===source.state.category))
      assert(target,'every source needs a compatible target category')
      if(!wrongChecked&&scene.interaction==='match-categories'){
        const wrong=targets().find(e=>e.state.category!==source.state.category)
        if(wrong){
          const before=context.runtime.state.progress
          guide(source,wrong,()=>false)
          assert(context.runtime.state.progress===before,'incorrect matching must not increase progress')
          for(let i=0;i<15;i++)step()
          wrongChecked=true
        }
      }
      const before=context.runtime.state.progress
      guide(source,target,()=>context.runtime.state.progress>before||context.runtime.state.phase!=='playing')
      assert(context.runtime.state.progress===before+1,'guiding a matching source to its target must increment progress once')
      for(let i=0;i<4;i++)step()
    }
    const expected=round<context.runtime.state.rounds?'round_complete':'game_complete'
    assert(context.runtime.state.phase===expected,'goal must lead to a visible round/game completion state')
    if(expected==='round_complete'){for(let i=0;i<30;i++)step();assert(context.runtime.state.progress===0,'new round must reset progress')}
  }
  assert(context.runtime.state.phase==='game_complete','final completion was not reached')
  reset(2)
  assert(context.runtime.state.round===1&&context.runtime.state.progress===0,'replay must reset lifecycle without generating code')
  assert(waitFor(()=>sources()[0]),'replay must restore selectable objects')
  // Sequential games intentionally reveal one source at a time. Exercise the
  // entire replay batch instead of equating visibility with availability.
  for(let n=0;n<context.runtime.state.goal;n++){
    const source=waitFor(()=>sources()[0])
    assert(source,'replay must reveal every remaining source')
    const target=waitFor(()=>targets().find(e=>e.state.category===source.state.category))
    assert(target,'replay source needs a compatible target')
    const before=context.runtime.state.progress
    guide(source,target,()=>context.runtime.state.progress>before||context.runtime.state.phase!=='playing')
    assert(context.runtime.state.progress===before+1,'replay must be playable, not just reset its labels')
    for(let i=0;i<4;i++)step()
  }
  return ['full-design-lifecycle',scene.lifecycle.layout==='fixed'?'fixed-layout-supported':'new-round-arrangements','completion','replay-playable',...(wrongChecked?['wrong-target-no-progress']:[])]
}
