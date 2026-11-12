import {useEffect,useState,type RefObject} from 'react'
import type {HandSelector} from './tracking'
export function TrackingPanel({selector}:{selector:RefObject<HandSelector>}){
 const [,render]=useState(0)
 useEffect(()=>{const timer=setInterval(()=>render(n=>n+1),250);return()=>clearInterval(timer)},[])
 const s=selector.current,fresh=performance.now()-s.freshness<280
 return <section aria-label="Tracking diagnostics"><h3>Tracking diagnostics</h3><p>{fresh?s.tracks.length:0} detected hands · {fresh?'Fresh':'Stale / no input'} · Active: {s.active??'none'}</p><p>{s.reason}</p><p data-worker-roundtrip>{fresh&&s.roundTripMs!==null?`Latest capture/worker round trip: ${s.roundTripMs.toFixed(1)} ms (includes transfer; not pure inference).`:'No fresh timing sample.'}</p><p>Model confidence is not supplied by the existing worker. Movement is geometric, not identity recognition.</p><div>{fresh&&s.tracks.map(t=><button key={t.id} data-dwell={`assign:${t.id}`} onClick={()=>s.assign(t.id)}>Use hand {t.id} · {t.motion>.025?'moving':'stationary'} · {t.id===s.active?'controlling':'not selected'}</button>)}</div><button data-dwell="reselect-hand" onClick={()=>s.reselect()}>Reselect active hand</button></section>
}
