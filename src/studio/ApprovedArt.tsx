import { useId } from 'react'
import type { assetIds } from '../engine/design'

type AssetId = typeof assetIds[number]
/** Project-owned vector illustrations. IDs select code; generated games never supply markup or URLs. */
export function ApprovedArt({id,completed=false}:{id:AssetId;completed?:boolean}) {
  const uid=useId().replaceAll(':','')
  const fruit=id==='apple'||id==='orange'||id==='banana'
  const basket=id.startsWith('basket')
  const tint=id==='basket-orange'?'#e5a04b':id==='basket-banana'?'#d3b35c':'#c66d72'
  return <svg viewBox="0 0 160 160" role="presentation" aria-hidden="true" className="cp-approved-art">
    <defs>
      <linearGradient id={`${uid}-red`} x2=".8" y2="1"><stop stopColor="#f79b82"/><stop offset=".5" stopColor="#e56667"/><stop offset="1" stopColor="#b94358"/></linearGradient>
      <linearGradient id={`${uid}-gold`} x2=".7" y2="1"><stop stopColor="#ffdf79"/><stop offset="1" stopColor="#f0a642"/></linearGradient>
      <linearGradient id={`${uid}-water`} x2=".8" y2="1"><stop stopColor="#e7fbff"/><stop offset="1" stopColor="#7bc0d5" stopOpacity=".7"/></linearGradient>
      <pattern id={`${uid}-weave`} width="16" height="13" patternUnits="userSpaceOnUse"><path d="M0 2h16M8 2v11" stroke="#f3ddaa" strokeWidth="3" opacity=".65"/></pattern>
    </defs>
    <ellipse cx="80" cy="143" rx={fruit?38:49} ry="6" fill="#294c4320"/>
    {id==='apple'&&<><path d="M80 44C54 24 21 45 29 91c7 39 30 51 51 40 22 11 45-2 51-40 8-46-26-67-51-47Z" fill={`url(#${uid}-red)`}/><path d="M79 45c-4-18 2-27 9-32" fill="none" stroke="#705545" strokeWidth="7" strokeLinecap="round"/><path d="M85 31c5-19 25-21 34-15-4 19-18 25-34 15Z" fill="#75a36a"/><path d="M46 61c-9 13-7 29-4 36" fill="none" stroke="#fff3db" strokeWidth="8" strokeLinecap="round" opacity=".65"/><path d="M75 126q6 4 13-1" fill="none" stroke="#a84352" strokeWidth="3"/></>}
    {id==='orange'&&<><circle cx="80" cy="85" r="51" fill={`url(#${uid}-gold)`}/><path d="M80 34c1-12 8-19 14-20" fill="none" stroke="#6f7850" strokeWidth="6" strokeLinecap="round"/><path d="M86 31c15-20 34-15 39-8-12 16-25 20-39 8Z" fill="#77a474"/><path d="M45 65q-10 13-7 26" fill="none" stroke="#fff3ce" strokeWidth="8" strokeLinecap="round" opacity=".8"/>{[[66,112],[93,119],[112,87],[107,105],[57,99],[79,105],[96,90]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.6" fill="#cd852e" opacity=".4"/>)}</>}
    {id==='banana'&&<><path d="M118 24c-1 45-35 77-81 70-9-2-14-7-17-6 1 30 29 52 62 43 41-11 62-57 49-98Z" fill={`url(#${uid}-gold)`}/><path d="M29 100c24 24 69 11 94-34" fill="none" stroke="#fff0a6" strokeWidth="9" strokeLinecap="round"/><path d="m117 25 10-5 7 16-13 4ZM20 88l11 5-4 10-10-9Z" fill="#8c7850"/><path d="M45 123q44 8 73-41" fill="none" stroke="#d8a245" strokeWidth="3"/></>}
    {basket&&<><path d="M40 66c0-58 80-58 80 0" fill="none" stroke="#a67955" strokeWidth="12"/><ellipse cx="80" cy="74" rx="60" ry="16" fill="#7c6352"/><path d="m20 73 14 59q46 19 92 0l14-59Z" fill="#cfab79"/><path d="m20 73 14 59q46 19 92 0l14-59Z" fill={`url(#${uid}-weave)`}/><path d="M23 78q57 23 114 0" fill="none" stroke="#ead09b" strokeWidth="11" strokeLinecap="round"/><rect x="54" y="92" width="52" height="33" rx="12" fill={tint}/><path d={id==='basket-banana'?'M67 104q10 16 25-2-2 20-19 16Z':id==='basket-orange'?'M70 108a10 10 0 1 0 20 0 10 10 0 1 0-20 0':'M80 103c-16-12-20 14 0 17 20-3 16-29 0-17Z'} fill="#fff7dc"/><path d="m81 102 5-6" stroke="#fff7dc" strokeWidth="3"/></>}
    {(id==='fish-coral'||id==='fish-blue')&&<><path d="m117 78 29-24v49l-28-15" fill={id==='fish-blue'?'#71b2cb':'#df9c85'}/><ellipse cx="75" cy="82" rx="48" ry="35" fill={id==='fish-blue'?'#8cc9d9':'#efb09a'}/><path d="m67 49 19-16 11 22M65 112l22 14 9-17" fill={id==='fish-blue'?'#5e9fb9':'#d48a77'}/><circle cx="48" cy="75" r="6" fill="#405e5c"/><circle cx="46" cy="73" r="2" fill="white"/><path d="M45 91q7 6 13-1M84 69q14 14 0 28" fill="none" stroke={id==='fish-blue'?'#5e9fb9':'#cd8274'} strokeWidth="4" strokeLinecap="round"/></>}
    {id==='food'&&<><ellipse cx="80" cy="125" rx="42" ry="12" fill="#d5b581"/>{[[58,83],[92,92],[78,62]].map(([x,y],i)=><g key={i}><ellipse cx={x} cy={y} rx="17" ry="13" fill={['#dfa77e','#daba85','#e8c596'][i]}/><path d={`M${x-6} ${y-4}h10`} stroke="#fff1d3" strokeWidth="3" strokeLinecap="round"/></g>)}</>}
    {id.startsWith('flower')&&<><path d="M80 140V73" stroke="#6c9b78" strokeWidth="7" strokeLinecap="round"/><path d="M79 118c-31-3-37-25-31-25 25-1 31 25 31 25M83 105c33-1 35-25 28-24-23 0-28 24-28 24" fill="#96bb8d"/>{completed?<><g fill={id==='flower-gold'?'#ecc766':'#e8a1ad'}>{[0,60,120,180,240,300].map(a=><ellipse key={a} cx="80" cy="43" rx="17" ry="28" transform={`rotate(${a} 80 68)`}/>)}</g><circle cx="80" cy="68" r="19" fill="#f8df89"/><circle cx="75" cy="62" r="5" fill="#fff0bc"/></>:<path d="M80 81c-33-20-17-52 0-44 18-9 35 24 0 44Z" fill="#a6c67d"/>}</>}
    {id==='butterfly-lilac'&&<><path d="M76 77C6 2 7 94 62 91 19 148 85 136 80 86M84 77c70-75 69 17 14 14 43 57-23 45-18-5" fill="#b8a5d5"/><path d="M33 67q12-20 27 3M100 70q15-23 27-3" fill="none" stroke="#e5d9ee" strokeWidth="13" strokeLinecap="round"/><path d="M80 66v45m0-45L69 53m11 13 12-13" stroke="#67756b" strokeWidth="5" strokeLinecap="round"/></>}
    {id==='bubble-pearl'&&<><circle cx="80" cy="78" r="54" fill={`url(#${uid}-water)`} stroke="#ffffffbb" strokeWidth="3"/><path d="M40 65q6-24 28-26" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"/><path d="M90 122q22-3 31-21" fill="none" stroke="#e9c9eaaa" strokeWidth="6" strokeLinecap="round"/></>}
  </svg>
}
