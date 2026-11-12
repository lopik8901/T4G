import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

// Trusted SDK only; never execute AI-authored source on the host.
const sdk=readFileSync(new URL('../sandbox/runtime-core.mjs',import.meta.url),'utf8').replace(/^export /gm,'')
function run(source:string){return vm.runInNewContext(sdk+'\n'+source,{}, {timeout:1000})}
test('lifecycle handles multiple rounds, completion, restart, open play and deterministic replay',()=>{
  assert.equal(run(`const r=createRuntime({mode:'rounds',rounds:3,goal:2},42);r.start();for(let n=0;n<3;n++){r.addProgress(2);if(n<2)for(let t=0;t<25;t++)r.tick(.05)}r.state.phase`),'game_complete')
  assert.equal(run(`const r=createRuntime({mode:'rounds',rounds:3,goal:2},42);r.start();r.addProgress();r.restartRound();r.state.progress`),0)
  assert.equal(run(`const r=createRuntime({mode:'single',rounds:1,goal:1},42);r.start();r.addProgress();r.replay(42);r.state.phase`),'ready')
  assert.equal(run(`const r=createRuntime({mode:'open-ended',rounds:1,goal:1});r.start();r.addProgress(8);r.state.phase`),'playing')
  assert.equal(run(`const a=createRuntime({},42),b=createRuntime({},42);JSON.stringify(a.helpers.shuffle([1,2,3,4,5]))===JSON.stringify(b.helpers.shuffle([1,2,3,4,5]))`),true)
  assert.equal(run(`const a=createRuntime({},42),b=createRuntime({},43);a.random()!==b.random()`),true)
})
test('shared context spawn events are idempotent and snapshots contain only bounded presentation data',()=>{
  assert.equal(run(`const c=createGameContext({entities:[{id:'a',kind:'fruit',x:.3,y:.4,radius:.06,state:[],assetId:'apple'}]});c.emit({type:'spawn',entityId:'a',value:{kind:'fruit',x:0,y:0,radius:.06}});c.entities.length`),1)
  assert.equal(run(`const c=createGameContext({entities:[]});c.state.secret='not a snapshot field';'state' in snapshotContext(c)`),false)
  assert.ok(Math.abs(run(`const c=createGameContext({entities:[],accessibility:{maximumSpeed:.1}});c.runtime.helpers.follow({x:0,y:0},{x:1,y:0},2,.1).x`)-.01)<1e-9)
})
