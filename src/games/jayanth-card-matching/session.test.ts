import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categories } from './categories.ts'
import { newSession, updateSession, type Session } from './session.ts'
import { initialDwell, stepDwell } from './dwell.ts'
import { cardName, instruction, messages } from './localisation.ts'
import { rankVoices } from './speech.ts'

function ready(state: Session): Session {
  for(let i=0;i<3;i++){if(state.phase==='falling')for(const c of state.round.answers)state=updateSession(state,{type:'land-complete',id:c.id,revision:state.revision});state=updateSession(state,{type:'tick',delta:4000})}
  return state
}
test('all inputs are blocked until reveal, reference movement and falling finish', () => {
  let state = newSession(categories[0], 5)
  for (const phase of ['reveal', 'settling', 'falling']) {
    assert.equal(state.phase, phase)
    assert.equal(updateSession(state, { type: 'choose', id: state.round.reference.id }), state)
    if(state.phase==='falling')for(const c of state.round.answers)state=updateSession(state,{type:'land-complete',id:c.id,revision:state.revision})
    state = updateSession(state, { type: 'tick', delta: 4000 })
  }
  assert.equal(state.phase, 'answering')
})
test('wrong choices are disabled; duplicates ignored; reference retained', () => {
  let state = ready(newSession(categories[0], 5))
  const round = state.round
  const wrong = round.answers.find(item => item.id !== round.reference.id)!
  state = updateSession(state, { type: 'choose', id: wrong.id })
  assert.deepEqual(state.rejected, [wrong.id]); assert.equal(state.round, round)
  assert.equal(updateSession(state, { type: 'choose', id: wrong.id }), state)
  state = updateSession(state, { type: 'choose', id: round.reference.id })
  assert.equal(state.phase, 'success')
  assert.equal(updateSession(state, { type: 'choose', id: round.reference.id }), state)
})
test('pause freezes phase, inactivity and success clocks', () => {
  let state = ready(newSession(categories[0], 0))
  state = updateSession(state, { type: 'choose', id: state.round.reference.id })
  state = updateSession(state, { type: 'tick', delta: 700 })
  state = updateSession(state, { type: 'pause', value: true })
  assert.equal(updateSession(state, { type: 'tick', delta: 50000 }), state)
  assert.equal(updateSession(state, { type: 'skip' }), state)
  state = updateSession(state, { type: 'pause', value: false })
  assert.equal(state.successTime, 700)
  assert.equal(updateSession(state, { type: 'advance' }), state)
  state = updateSession(state, { type: 'tick', delta: 1300 })
  assert.equal(updateSession(state, { type: 'advance' }).phase, 'reveal')
})
for (const limit of [0, 5, 10]) test(`session completion: ${limit || 'continuous'}`, () => {
  let state = newSession(categories[1], limit)
  for (let i = 0; i < (limit || 20); i++) {
    state = ready(state)
    state = updateSession(state, { type: 'choose', id: state.round.reference.id })
    state = updateSession(state, { type: 'tick', delta: 2000 })
    state = updateSession(state, { type: 'advance' })
  }
  assert.equal(state.phase, limit ? 'complete' : 'reveal')
})
test('history avoids repetition until the complete catalogue is exhausted', () => {
  let state = newSession(categories[0], 0)
  const seen = new Set([state.round.reference.id])
  for (let i = 1; i < categories[0].items.length; i++) {
    state = updateSession(state, { type: 'skip' })
    assert.equal(seen.has(state.round.reference.id), false); seen.add(state.round.reference.id)
  }
})
test('inactivity survives automatic round changes and resets only on interaction', () => {
  let state = ready(newSession(categories[0], 0))
  state = updateSession(state, { type: 'tick', delta: 15000 })
  state = updateSession(state, { type: 'skip' })
  assert.equal(state.idle, 15000)
  assert.equal(updateSession(state, { type: 'activity' }).idle, 0)
})
test('REGRESSION: wrong card to adjacent valid card starts dwell without leaving card area', () => {
  let result = stepDwell(initialDwell(), 'wrong', true, true, 0)
  result = stepDwell(result.state, 'wrong', true, true, 1000)
  assert.equal(result.selection, 'wrong')
  result = stepDwell(result.state, 'wrong', true, true, 3000)
  assert.equal(result.selection, null)
  result = stepDwell(result.state, 'correct', true, true, 3100)
  assert.equal(result.progress, 0)
  result = stepDwell(result.state, 'correct', true, true, 4099)
  assert.equal(result.selection, null)
  result = stepDwell(result.state, 'correct', true, true, 4100)
  assert.equal(result.selection, 'correct')
})
test('hand loss and jitter reset progress without unlocking consumed card', () => {
  let result = stepDwell(initialDwell(), 'cat', true, true, 0)
  result = stepDwell(result.state, null, false, false, 900)
  result = stepDwell(result.state, 'cat', true, true, 1000)
  assert.equal(result.progress, 0)
  result = stepDwell(result.state, 'cat', true, true, 2000)
  assert.equal(result.selection, 'cat')
  result = stepDwell(result.state, null, false, false, 2100)
  result = stepDwell(result.state, 'cat', true, true, 5000)
  assert.equal(result.selection, null)
})
test('English covers every visible item',()=>{for(const category of categories)for(const card of category.items){assert.equal(cardName(card,'en'),card.label);assert.match(instruction(card,'en'),/^Find /)}})
test('Singapore local voices preferred; correct language fallback', () => {
  const voice = (lang: string, localService = true) => ({ lang, localService, name: lang, voiceURI: lang })
  const voices = [voice('en-US'), voice('zh-CN'), voice('en-SG'), voice('zh-SG'), voice('en-SG', false)]
  assert.equal(rankVoices(voices, 'en')[0].lang, 'en-SG')
  assert.deepEqual(rankVoices([voice('fr-FR')], 'en'), [])
})
