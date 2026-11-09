import { test } from 'node:test'
import assert from 'node:assert/strict'
import { illuminatedLandmarks } from './journey.ts'
import { calibratePoint, defaultCalibration } from './assistance.ts'
import { initialDwell, stepDwell } from './dwell.ts'
import { newSession, updateSession } from './session.ts'
import { instructionKey } from './speech.ts'
import { categories } from './categories.ts'

test('skyline completes six landmarks then gently starts another journey', () => {
  assert.deepEqual(Array.from({length:14},(_,i)=>illuminatedLandmarks(i)),[0,1,2,3,4,5,6,1,2,3,4,5,6,1])
})
test('one correct answer lights one landmark; incorrect and duplicate choices do not', () => {
  let state=newSession(categories[0],0,true)
  for(let i=0;i<3;i++)state=updateSession(state,{type:'tick',delta:2000})
  const wrong=state.round.answers.find(item=>item.id!==state.round.reference.id)!
  state=updateSession(state,{type:'choose',id:wrong.id});assert.equal(state.journey,0)
  state=updateSession(state,{type:'choose',id:state.round.reference.id});assert.equal(state.journey,1)
  state=updateSession(state,{type:'choose',id:state.round.reference.id});assert.equal(state.journey,1)
})
test('transitions and spoken instructions cannot consume the inactivity budget', () => {
  let state=newSession(categories[0],0,true)
  for(let i=0;i<3;i++){state=updateSession(state,{type:'tick',delta:5000});assert.equal(state.idle,0)}
  state=updateSession(state,{type:'tick',delta:15000,idle:false});assert.equal(state.idle,0)
  state=updateSession(state,{type:'tick',delta:1000});assert.equal(state.idle,1000)
})
test('comfortable reach maps natural resting position to centre and bounds edges',()=>{
  assert.deepEqual(calibratePoint({x:.4,y:.6},{centerX:.4,centerY:.6,reach:1.8}),{x:.5,y:.5})
  assert.equal(calibratePoint({x:1,y:1},defaultCalibration).x,.985)
  assert.equal(calibratePoint({x:0,y:0},defaultCalibration).y,.015)
})
test('custom dwell duration and adjacent menu controls preserve one-action-per-hover',()=>{
  let result=stepDwell(initialDwell(),'category:animals',true,true,0,1500)
  result=stepDwell(result.state,'category:animals',true,true,1000,1500);assert.equal(result.selection,null)
  result=stepDwell(result.state,'category:animals',true,true,1500,1500);assert.equal(result.selection,'category:animals')
  result=stepDwell(result.state,'category:animals',true,true,5000,1500);assert.equal(result.selection,null)
  result=stepDwell(result.state,'narration:zh',true,true,5100,800);assert.equal(result.progress,0)
  result=stepDwell(result.state,'narration:zh',true,true,5900,800);assert.equal(result.selection,'narration:zh')
})

test('recording phrase IDs distinguish orange fruit from the colour orange',()=>{
  assert.equal(instructionKey('animals','dog'),'find:animals:dog')
  assert.notEqual(instructionKey('fruits','orange'),instructionKey('colours','orange'))
})
