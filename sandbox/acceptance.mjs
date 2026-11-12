// Developer-owned semantic acceptance probes. These run INSIDE Docker only.
// They never implement gameplay or replace generated mechanics.
export function checkAcceptance(kind, scene, context, update, reset) {
  const assert = (condition, message) => { if (!condition) throw Error(`Independent ${kind} acceptance: ${message}`) }
  context.entities = scene.entities.map(e => ({ id:e.id,kind:e.kind,position:{x:e.x,y:e.y},radius:e.radius,visible:true,state:Object.fromEntries(e.state.map(p=>[p.key,p.value])) }))
  context.state = {}; context.input = {time:0,hands:[],sound:false,pointer:null}; reset()
  let time = 0
  const step = (positions = []) => { time+=50;context.input={time,hands:positions.map((position,i)=>({id:`resident-${i}`,position})),sound:false,pointer:null};update() }
  if (kind === 'butterfly') {
    const sourceId=scene.entities.find(e=>e.appearance==='butterfly')?.id, targetId=scene.entities.find(e=>e.appearance==='flower')?.id
    assert(sourceId&&targetId,'scene needs butterfly and flower appearances')
    const source=()=>context.entities.find(e=>e.id===sourceId), target=()=>context.entities.find(e=>e.id===targetId)
    assert(source()&&target(),'source and flower must remain identifiable after setup')
    const start={...source().position}, near={x:Math.min(.95,start.x+.07),y:start.y}, other={x:.98,y:.02}
    for(let i=0;i<60;i++)step([near,other])
    assert(source()&&Math.hypot(source().position.x-start.x,source().position.y-start.y)>.01,'nearby hand must move the butterfly')
    assert(Math.hypot(source().position.x-near.x,source().position.y-near.y)<.15,'butterfly must follow a nearby hand')
    const destination={...target().position}
    for(let i=1;i<=160;i++){const t=i/160;step([{x:near.x+(destination.x-near.x)*t,y:near.y+(destination.y-near.y)*t},other])}
    for(let i=0;i<60;i++)step([destination,other])
    const bloomed=()=>target()&&target().visible!==false&&(target().state.bloomed===true||target().state.completed===true)
    assert(bloomed(),'butterfly-to-flower contact must bloom a visible flower')
    for(let i=0;i<100;i++)step()
    assert(bloomed(),'flower must remain bloomed after hand tracking is lost')
    assert(!source()||source().visible===false||Math.hypot(source().position.x-destination.x,source().position.y-destination.y)>.12,'butterfly must depart after blooming')
  } else if(kind==='circles') {
    const count=()=>context.entities.filter(e=>e.kind==='bubble').length
    const initial=count()
    for(let i=0;i<35;i++)step([{x:.2+i*.015,y:.5}])
    assert(count()===initial,'straight line must not create bubbles')
    for(let i=0;i<20;i++)step()
    for(let i=0;i<=60;i++){const angle=i/60*Math.PI*2;step([{x:.5+Math.cos(angle)*.18,y:.5+Math.sin(angle)*.18}])}
    assert(count()>initial,'a closed hand-drawn circle must create a bubble')
    for(let i=0;i<20;i++)step()
    const after=count();for(let i=0;i<20;i++)step()
    assert(count()===after,'tracking loss must not repeatedly create bubbles')
  } else throw Error('Unknown trusted acceptance probe')
}
