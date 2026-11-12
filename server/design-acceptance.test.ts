import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

const source=readFileSync(new URL('../sandbox/design-acceptance.mjs',import.meta.url),'utf8').replace('export function verifyDesign','function verifyDesign')
type Entity={position:{x:number;y:number};visible:boolean;state:{role:string;category:string;collected:boolean}}
function fixture(brokenReplay=false,options:{pool?:boolean;delay?:number;rounds?:number;contentChanges?:boolean}={}){
  const context={entities:[] as Entity[],input:{time:0,hands:[] as {id:string;position:{x:number;y:number}}[],sound:false,pointer:null},runtime:{state:{round:1,rounds:1,goal:3,progress:0,phase:'playing'}}}
  let resets=0
  let delay=0,picked=false,transition=0
  const arrange=()=>{
    const category=options.contentChanges?`category-${context.runtime.state.round}`:'same'
    context.entities=[...Array.from({length:options.pool?1:3},(_,i)=>({position:{x:.2+i*.15,y:.35},visible:i===0&&!options.delay,state:{role:'source',category,collected:false}})),{position:{x:.65,y:.75},visible:true,state:{role:'target',category,collected:false}}]
    delay=options.delay??0;picked=false
  }
  const reset=()=>{resets++;context.runtime.state={round:1,rounds:options.rounds??1,goal:3,progress:0,phase:'playing'};arrange()}
  const step=()=>{
    const runtime=context.runtime.state
    if(runtime.phase==='round_complete'){if(++transition>=25){runtime.round++;runtime.progress=0;runtime.phase='playing';arrange()}return}
    if(delay>0&&--delay===0){const next=context.entities.find(e=>e.state.role==='source'&&!e.state.collected);if(next)next.visible=true}
    const s=context.entities.find(e=>e.state.role==='source'&&e.visible&&!e.state.collected),target=context.entities.find(e=>e.state.role==='target')!,hand=context.input.hands[0]
    if(s&&hand&&Math.hypot(hand.position.x-s.position.x,hand.position.y-s.position.y)<.06)picked=true
    if(s&&hand&&picked&&Math.hypot(hand.position.x-target.position.x,hand.position.y-target.position.y)<.05){
      s.state.collected=true;s.visible=false;context.runtime.state.progress++
      picked=false
      if(!(brokenReplay&&resets===2)){
        if(options.pool)s.state.collected=false
        const next=context.entities.find(e=>e.state.role==='source'&&!e.state.collected)
        if(next){if(options.delay)delay=options.delay;else next.visible=true}
      }
      if(context.runtime.state.progress===3){context.runtime.state.phase=runtime.round<runtime.rounds?'round_complete':'game_complete';transition=0}
    }
  }
  return {context,reset,step}
}
test('replay accepts sequential visibility and still requires every hidden source to become playable',()=>{
  const scope=vm.createContext({});vm.runInContext(source,scope)
  const good=fixture();assert.ok(scope.verifyDesign({lifecycle:{},interaction:'guide-to-target'},good.context,good.step,good.reset).includes('replay-playable'))
  const bad=fixture(true);assert.throws(()=>scope.verifyDesign({lifecycle:{},interaction:'guide-to-target'},bad.context,bad.step,bad.reset),/reveal every remaining source/)
})
test('delayed pooled spawning is validated by completing every outcome, not by initial entity count',()=>{
  const scope=vm.createContext({});vm.runInContext(source,scope)
  const f=fixture(false,{pool:true,delay:20})
  assert.ok(scope.verifyDesign({lifecycle:{layout:'fixed'},interaction:'guide-to-target'},f.context,f.step,f.reset).includes('replay-playable'))
})
test('runtime acceptance still rejects a scene that never creates selectable sources',()=>{
  const scope=vm.createContext({});vm.runInContext(source,scope)
  const f=fixture()
  const reset=()=>{f.reset();f.context.entities=f.context.entities.filter(e=>e.state.role==='target')}
  assert.throws(()=>scope.verifyDesign({lifecycle:{layout:'fixed'},interaction:'guide-to-target'},f.context,f.step,reset),/no selectable source/)
})
test('fixed repeated layouts and shuffled content on fixed positions are both legitimate',()=>{
  const scope=vm.createContext({});vm.runInContext(source,scope)
  const fixed=fixture(false,{rounds:2})
  assert.ok(scope.verifyDesign({lifecycle:{layout:'fixed'},interaction:'guide-to-target'},fixed.context,fixed.step,fixed.reset).includes('fixed-layout-supported'))
  const varied=fixture(false,{rounds:2,contentChanges:true})
  assert.ok(scope.verifyDesign({lifecycle:{layout:'shuffle'},interaction:'guide-to-target'},varied.context,varied.step,varied.reset).includes('new-round-arrangements'))
  const stuck=fixture(false,{rounds:2})
  assert.throws(()=>scope.verifyDesign({lifecycle:{layout:'shuffle'},interaction:'guide-to-target'},stuck.context,stuck.step,stuck.reset),/new arrangement or content/)
})
