import {test} from 'node:test'
import assert from 'node:assert/strict'
import {discoverComponents,externalCatalog,selectVisuals} from './generation/discovery.ts'
import {simpleExperimentalEdit,requiresNewDesign} from './generation/simple-edit.ts'
import {templateGame} from '../src/studio/config.ts'
import {reviewRequestedCounts} from './generation/quality.ts'

test('discovery uses real trusted SDK/art, avoids forced reuse, and reports external incompatibility',()=>{
  const result=discoverComponents([
    {id:'round-flow',kind:'lifecycle',description:'Replayable rounds',capabilities:['rounds','progress','replay'],minimumQuality:4},
    {id:'fruit-visual',kind:'visual',description:'Attractive 2D fruit',capabilities:['fruit-art','2d-illustrations'],minimumQuality:5},
    {id:'new-recognizer',kind:'mechanic',description:'An original recognizer',capabilities:['spiral-recognition'],minimumQuality:4},
    {id:'external-renderer',kind:'visual',description:'2D graphics',capabilities:['2d-rendering'],minimumQuality:3},
  ])
  assert.equal(result[0].selected,'game-runtime');assert.equal(result[0].decision,'reuse')
  assert.equal(result[1].selected,'illustrated-local-assets')
  assert.equal(result[2].decision,'generate')
  assert.equal(result[3].decision,'generate');assert.equal(result[3].candidates[0].eligible,false)
  assert.ok(externalCatalog.some(c=>c.id==='kenney-food-kit'&&c.capabilities.includes('3d-assets')))
})
test('simple edits bypass generation only for complete, narrow presentation requests',()=>{
  const game=templateGame('garden')
  assert.deepEqual(simpleExperimentalEdit('Mute the sound',game),{volume:0})
  assert.equal(simpleExperimentalEdit('Mute the sound and change the matching rules',game),null)
  assert.equal(simpleExperimentalEdit('Add a fourth round',game),null)
  assert.deepEqual(simpleExperimentalEdit('Change the colour theme to ocean',game),{theme:'ocean'})
  assert.equal(requiresNewDesign('Make collisions more forgiving'),false)
  assert.equal(requiresNewDesign('Add a fourth round'),true)
  assert.equal(requiresNewDesign('Switch to a feeding activity instead'),true)
})
test('discovery can adapt a compatible SDK subset, but cannot fake missing visual art',()=>{
  const results=discoverComponents([
    {id:'guided-matching',kind:'mechanic',description:'Follow, overlap and new category matching',capabilities:['follow-hand','overlap','category-match'],minimumQuality:4},
    {id:'tractor-art',kind:'visual',description:'Recognizable illustrated tractor',capabilities:['2d-illustrations','tractor-art'],minimumQuality:4},
  ])
  assert.equal(results[0].decision,'adapt');assert.equal(results[0].selected,'game-runtime')
  assert.equal(results[1].decision,'generate');assert.equal(results[1].selected,null)
})
test('realistic designer vocabulary composes existing input, geometry, progress and artwork instead of generating them again',()=>{
  const r=discoverComponents([
    {id:'shared-rounds',kind:'lifecycle',description:'Shared rounds',capabilities:['lifecycle','rounds','shared-progress','round-restart','geometry'],minimumQuality:3},
    {id:'friendly-art',kind:'visual',description:'Fish and food with labels',capabilities:['fish-art','food-art','2d-illustrations','large-targets'],minimumQuality:4},
    {id:'palm-follow',kind:'input',description:'Palm following with ownership',capabilities:['normalized-palm-positions','overlap','follow-hand','exclusive-selection','tracking-loss-handling'],minimumQuality:3},
  ])
  assert.equal(r[0].decision,'reuse');assert.equal(r[0].selected,'game-runtime')
  assert.equal(r[1].decision,'reuse');assert.equal(r[1].selected,'illustrated-local-assets')
  assert.equal(r[2].decision,'adapt');assert.ok(r[2].selectedComponents?.includes('mirror-hand-input'));assert.ok(r[2].selectedComponents?.includes('game-runtime'))
})
test('an approved compatible local external component is eligible after trusted options',()=>{
  const result=discoverComponents([{id:'special-animation',kind:'animation',description:'Approved effect',capabilities:['soft-confetti'],minimumQuality:4}],[{id:'vetted-external-effect',origin:'external',kind:'animation',capabilities:['soft-confetti'],quality:4,compatibility:'sdk',dependencies:[],license:'MIT',licenseVerified:true,maintenance:'Reviewed test entry',url:'https://example.invalid/reviewed',available:true}])
  assert.equal(result[0].decision,'reuse');assert.equal(result[0].selected,'vetted-external-effect')
})
test('designer cannot multiply a per-round objective by the number of rounds',()=>{
  const design={objective:'Guide each object to its matching target.',lifecycle:{mode:'rounds' as const,rounds:3,goal:9,objective:'Guide each object.',completionMessage:'Lovely work.'}}
  const request='Three short rounds with three fruits per round.'
  assert.ok(reviewRequestedCounts(request,design).some(issue=>issue.includes('Per-round goal must be 3')))
  assert.deepEqual(reviewRequestedCounts(request,{...design,lifecycle:{...design.lifecycle,goal:3}}),[])
})
