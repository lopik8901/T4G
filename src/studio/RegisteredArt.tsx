import type { Illustration } from '../engine/components'

/** Closed primitives and paint tokens only; generated markup never enters React. */
export function RegisteredArt({definition,state='idle'}:{definition:Illustration;state?:keyof Illustration['states']}){
  const color=(token:string)=>token==='none'?'none':definition.palette[token as keyof Illustration['palette']]
  return <svg className="cp-approved-art" viewBox="0 0 100 100" aria-hidden="true"><g className={definition.animation==='gentle-pulse'?'cp-registered-pulse':undefined} opacity={state==='disabled'?definition.states.disabled:1} transform={`translate(50 50) scale(${definition.states[state]}) translate(-50 -50)`}>{definition.shapes.map((s,i)=>{
    const common={fill:color(s.fill),stroke:color(s.stroke),strokeWidth:s.strokeWidth}
    if(s.shape==='polygon')return <polygon key={i} points={s.points.map(p=>`${p.x},${p.y}`).join(' ')} {...common}/>
    return s.shape==='ellipse'?<ellipse key={i} cx={s.x} cy={s.y} rx={s.width/2} ry={s.height/2} {...common}/>:s.shape==='rect'?<rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={Math.min(8,s.width/4)} {...common}/>:<line key={i} x1={s.x} y1={s.y} x2={s.width} y2={s.height} {...common}/>
  })}</g></svg>
}
