import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reviewRequestedCounts,reviewGame} from './generation/quality.ts'
import type {GameDesignSpec,VisualSpec} from '../src/engine/design.ts'
import type {SourceBundle} from '../src/engine/generation.ts'
import {staticValidate} from './generation/validator.ts'

const design:GameDesignSpec={title:'Shape matching',theme:'meadow',audience:'Seated residents',visualDirection:'Large shapes',objective:'Guide shapes to their matching target.',interaction:'match-categories',rules:['Match shapes.'],coreLoop:['Select.','Guide.'],success:'Targets collected.',failureHandling:'Try again.',cooperation:'Shared activity.',lifecycle:{mode:'rounds',rounds:3,goal:3,objective:'Match shapes.',completionMessage:'Lovely work.'},accessibility:{seated:true,players:2,minimumTargetRadius:.055,maximumSpeed:.3,noTimePressure:true,feedback:'Gentle.'},requirements:[{id:'shape-matching',kind:'mechanic',description:'Match categories',capabilities:['category-matching'],minimumQuality:3}]}
const visual:VisualSpec={direction:'Large shapes',palette:'meadow',background:'soft-garden',motion:'gentle',assets:[],provider:'careplay-local',externalGeneration:false}
const bundle:SourceBundle={name:'Fixture',description:'Trusted quality fixture',source:'export const createMechanic=()=>({});',tests:'export const tests=[];',assetRequests:[],scene:{instruction:'Match shapes.',parameters:[],entities:[{id:'source',kind:'shape',x:.5,y:.1,radius:.06,appearance:'circle',color:'#88AA99',state:[{key:'role',value:'source'},{key:'category',value:'shape'}]},{id:'target',kind:'receiver',x:.5,y:.94,radius:.06,appearance:'circle',color:'#88AA99',label:'A perfectly understandable target label',state:[{key:'role',value:'target'},{key:'category',value:'shape'}]}]}}
test('count checks distinguish completion goals from participants, receivers and durations',()=>{
  for(const text of ['Two players per round.','Five baskets per round.','Ten seconds per round.','Between two and four rounds.','Up to five rounds.','Avoid three rounds.','Three to five rounds.','Use 3-5 rounds.','Keep going with no rounds.'])assert.deepEqual(reviewRequestedCounts(text,design),[],text)
  assert.ok(reviewRequestedCounts('Three short rounds with four fruits per round.',design).some(s=>s.includes('goal must be 4')))
  assert.ok(reviewRequestedCounts('Four rounds.',design).some(s=>s.includes('4 rounds')))
})
test('safe primitives, pooled sources and presentation suggestions do not block valid games',()=>{
  const review=reviewGame(design,visual,bundle)
  assert.equal(review.passed,true,JSON.stringify(review.issues))
  assert.ok(review.warnings.length>=3)
  const spawned=structuredClone(bundle);spawned.scene!.entities=spawned.scene!.entities.filter(e=>e.id==='target')
  assert.equal(reviewGame(design,visual,spawned).passed,true,'Setup-created source entities must be checked at runtime, not rejected from the initial manifest.')
})
test('relaxed presentation checks retain approved-art and generous-target requirements',()=>{
  const bad=structuredClone(bundle);bad.scene!.entities[1].assetId=`component-${'a'.repeat(64)}`;bad.scene!.entities[1].radius=.02
  const review=reviewGame(design,visual,bad)
  assert.equal(review.passed,false);assert.ok(review.issues.some(s=>s.includes('approved')));assert.ok(review.issues.some(s=>s.includes('radius')))
})
test('static fallback accepts compatible export aliases and still rejects external modules and missing factories',()=>{
  const source=`import type {MechanicFactory} from './contract';const factory:MechanicFactory=()=>({setup(){},update(){},dispose(){}});export {factory as createMechanic};`
  const tests=`import type {MechanicTest} from './contract';const cases:MechanicTest[]=[];export {cases as tests};`
  assert.deepEqual(staticValidate({...bundle,source,tests}),[])
  assert.ok(staticValidate({...bundle,source:source.replace("'./contract'","'https://example.invalid/x'"),tests}).length>0)
  assert.ok(staticValidate({...bundle,source:'export const differentFactory=1;',tests}).length>0)
})
