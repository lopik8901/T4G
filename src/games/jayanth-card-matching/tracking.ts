import type { TrackedHand } from './useGameMirror.ts'
type Track = TrackedHand & { id:number; seen:number; born:number; origin:{x:number;y:number}; motion:number; vx:number; vy:number }
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y)
/** Ephemeral geometry tracking, never identity recognition. Ambiguity fails closed. */
export class HandSelector {
  roundTripMs:number|null=null
  private awaitMotion=false
  tracks:Track[]=[]; active:number|null=null; locked=false; reason='Waiting for a visible hand'; freshness=0
  private serial=0; private last=0
  reset(){this.awaitMotion=false;this.tracks=[];this.active=null;this.locked=false;this.last=0;this.reason='Move the hand you want to use'}
  reselect(){this.awaitMotion=true;this.active=null;this.locked=false;for(const t of this.tracks){t.origin={...t.center};t.born=t.seen;t.motion=0}this.reason='Move the hand you want to use'}
  assign(id:number){if(this.tracks.some(t=>t.id===id)){this.active=id;this.locked=true;this.reason='Staff assigned this hand'}}
  update(hands:TrackedHand[],now:number):TrackedHand|undefined {
    this.freshness=now
    if(now===this.last)return this.tracks.find(t=>t.id===this.active&&t.seen===now)
    const dt=Math.max(16,now-this.last);this.last=now
    // Close/crossing palms cannot be confidently distinguished by geometry alone.
    if(hands.length>1&&distance(hands[0].center,hands[1].center)<.075){this.awaitMotion=true;this.active=null;this.locked=false;this.tracks=[];this.reason='Hands overlap: separate hands, then move the intended hand';return}
    const available=new Set(this.tracks.filter(t=>now-t.seen<280))
    const pairs=hands.flatMap((hand,index)=>[...available].map(track=>({index,track,d:distance(hand.center,{x:track.center.x+track.vx*dt,y:track.center.y+track.vy*dt})}))).sort((a,b)=>a.d-b.d)
    const matched=new Map<number,Track>()
    for(const p of pairs)if(p.d<.22&&available.has(p.track)&&!matched.has(p.index)){matched.set(p.index,p.track);available.delete(p.track)}
    this.tracks=hands.map((hand,index)=>{
      const old=matched.get(index)
      if(!old)return {...hand,id:++this.serial,seen:now,born:now,origin:{...hand.center},motion:0,vx:0,vy:0}
      const motion=distance(hand.center,old.origin)
      const result={...hand,id:old.id,seen:now,born:old.born,origin:old.origin,motion,vx:(hand.center.x-old.center.x)/dt,vy:(hand.center.y-old.center.y)/dt}
      if(now-old.born>700){result.origin={...hand.center};result.born=now;result.motion=motion*.5}
      return result
    })
    let selected=this.tracks.find(t=>t.id===this.active)
    if(!selected){if(this.active!==null)this.awaitMotion=true;this.active=null;this.locked=false}
    const moving=this.tracks.filter(t=>t.motion>.025&&now-t.born>=160).sort((a,b)=>b.motion-a.motion)[0]
    if(!this.locked&&moving&&(!selected||selected.motion<.012)){selected=moving;this.awaitMotion=false;this.active=moving.id;this.reason='Consistently moving hand selected'}
    if(!selected&&!this.awaitMotion&&this.tracks.length===1&&now-this.tracks[0].born>=240){selected=this.tracks[0];this.active=selected.id;this.reason='Only visible, consistently tracked hand'}
    if(!selected)this.reason=this.tracks.length?'Move one hand clearly to select it':'No hand detected; dwell cancelled'
    return selected
  }
}
