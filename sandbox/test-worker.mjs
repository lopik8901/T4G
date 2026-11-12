import { parentPort, workerData } from 'node:worker_threads'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { createGameContext } from './runtime-core.mjs'

const { scene, acceptance,componentProbe } = workerData
let phase='tests'
try {
  // This VM is a defense-in-depth harness INSIDE the resource-limited container, not the host isolation boundary.
  const testContext = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } })
  vm.runInContext(await readFile('/tmp/tests.mjs', 'utf8'), testContext, { timeout: 1000 })
  const testCount = vm.runInContext('CarePlayTests.tests.length', testContext, { timeout: 100 })
  if (!Number.isInteger(testCount) || testCount < 3 || testCount > 40) throw new Error('Export 3–40 generated behavior tests.')
  for (let i = 0; i < testCount; i++) {
    try { vm.runInContext(`if(typeof CarePlayTests.tests[${i}].name!=='string')throw Error('Invalid test'); if(CarePlayTests.tests[${i}].run()?.then)throw Error('Tests must be synchronous');`, testContext, { timeout: 1000 }) }
    catch(error){throw Error(`Generated test ${i+1}: ${error.message}`)}
  }
  const code = await readFile('/tmp/mechanic-browser.js', 'utf8')
  const sandbox = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } })
  vm.runInContext(code, sandbox, { timeout: 1000 })
  phase='runtime'
  const context=createGameContext(scene,1)
  sandbox.context = context; sandbox.parameters = Object.fromEntries(scene.parameters.map(p => [p.key, p.value]))
  vm.runInContext('mechanic = CarePlayMechanic.createMechanic(parameters); mechanic.setup(context)', sandbox, { timeout: 500 })
  const finite = () => {
    if (!Array.isArray(context.entities) || context.entities.length > 64) throw new Error('Scene exceeded 64 entities.')
    if (new Set(context.entities.map(e=>e.id)).size !== context.entities.length) throw Error('Duplicate entity identifiers cannot be previewed.')
    for (const e of context.entities) if (typeof e.id!=='string'||e.id.length>64||typeof e.kind!=='string'||e.kind.length>64||typeof e.visible!=='boolean'||!Number.isFinite(e.position?.x)||e.position.x<-.5||e.position.x>1.5||!Number.isFinite(e.position?.y)||e.position.y<-.5||e.position.y>1.5||!Number.isFinite(e.radius)||e.radius<.005||e.radius>.3) throw new Error('Entity output violates the browser preview contract.')
    for(const e of context.entities)if(e.assetId && !scene.visual?.assets.some(a=>a.id===e.assetId) && !scene.entities.some(a=>a.assetId===e.assetId))throw Error('Unapproved asset ID');
    if (JSON.stringify(context).length > 100000) throw new Error('Runtime state exceeded 100 KB.')
  }
  context.runtime.start()
  for (let i = 0; i < 100; i++) {
    context.input = { time: i * 50, hands: i < 30 ? [{ id: 'one', position: { x: .3, y: .4 } }, { id: 'two', position: { x: .7, y: .4 } }] : [], sound: false, pointer: null }
    context.runtime.tick(.05);if(!scene.lifecycle||context.runtime.state.phase==='playing')vm.runInContext('mechanic.update(context, .05)', sandbox, { timeout: 100 }); finite()
  }
  const reset=(seed=1)=>{
    vm.runInContext('mechanic.dispose(context)',sandbox,{timeout:100})
    const fresh=createGameContext(scene,seed)
    context.entities=fresh.entities;context.state=fresh.state;context.input=fresh.input;context.runtime=fresh.runtime;context.sound=false
    vm.runInContext('mechanic=CarePlayMechanic.createMechanic(parameters);mechanic.setup(context)',sandbox,{timeout:500});context.runtime.start()
  }
  const {verifyDesign}=await import('./design-acceptance.mjs')
  const {verifyComponent}=await import('./component-acceptance.mjs')
  const componentChecks=verifyComponent(componentProbe,context,()=>{vm.runInContext('mechanic.update(context,.05)',sandbox,{timeout:100});finite()},reset,sandbox.parameters)
  const designChecks=verifyDesign(scene,context,()=>{context.runtime.tick(.05);if(context.runtime.state.phase==='playing')vm.runInContext('mechanic.update(context,.05)',sandbox,{timeout:100});finite()},reset)
  if (acceptance) {
    const { checkAcceptance } = await import('./acceptance.mjs')
    checkAcceptance(acceptance, scene, context, () => { vm.runInContext('mechanic.update(context, .05)', sandbox, {timeout:100}); finite() }, reset)
  }
  vm.runInContext('mechanic.dispose(context)', sandbox, { timeout: 100 })
  parentPort.postMessage({ ok: true, testCount, runtimeChecks: [...componentChecks,...designChecks, ...(acceptance ? [`acceptance:${acceptance}`] : []), 'module-load', 'setup', 'two-hands', 'tracking-loss-no-crash', 'finite-state', '100-fixed-steps', 'dispose'] })
} catch (error) { parentPort.postMessage({ ok: false, phase, diagnostics: [String(error?.message ?? error).slice(0, 2000)] }) }
