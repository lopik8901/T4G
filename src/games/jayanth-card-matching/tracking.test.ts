import {test} from 'node:test'
import assert from 'node:assert/strict'
import {HandSelector} from './tracking.ts'
const hand=(x:number,y=.5)=>({center:{x,y},points:[{x,y}]})
test('single visible hand is acquired; unseen phone-occluded hand is never invented',()=>{const s=new HandSelector();s.update([hand(.2)],10);assert.ok(s.update([hand(.2)],260));assert.equal(s.tracks.length,1)})
test('moving second hand wins independently of array order; stationary dwell keeps identity',()=>{const s=new HandSelector();s.update([hand(.2),hand(.7)],10);s.update([hand(.74),hand(.2)],200);assert.equal(s.active,2);s.locked=true;const id=s.active;for(let t=300;t<1400;t+=80)s.update([hand(.2),hand(.74)],t);assert.equal(s.active,id)})
test('crossing/occlusion cancel safely, disappearance reacquires, staff can switch',()=>{const s=new HandSelector();s.update([hand(.2),hand(.7)],10);s.update([hand(.2),hand(.75)],200);s.locked=true;s.update([hand(.49),hand(.51)],280);assert.equal(s.active,null);s.update([],400);assert.equal(s.tracks.length,0);s.update([hand(.8)],500);s.update([hand(.85)],750);assert.ok(s.active);s.update([hand(.85),hand(.2)],830);s.assign(s.tracks[1].id);assert.equal(s.active,s.tracks[1].id);s.reselect();assert.equal(s.active,null)})
test('lost active hand never silently transfers dwell to remaining stationary hand',()=>{
 const s=new HandSelector();s.update([hand(.2),hand(.7)],10);s.update([hand(.2),hand(.75)],200);s.locked=true;assert.equal(s.active,2)
 assert.equal(s.update([hand(.2)],280),undefined);assert.equal(s.update([hand(.2)],400),undefined);assert.equal(s.active,null)
 s.update([hand(.25)],500);assert.ok(s.active)
})
