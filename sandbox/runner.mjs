import { readFile, writeFile } from 'node:fs/promises'
import { Worker } from 'node:worker_threads'
import ts from 'typescript'
import { build } from 'esbuild'

// Trusted harness. This file is baked into the image, never supplied by a generated bundle.
const output = body => process.stdout.write(JSON.stringify(body))
let phase='compile'
try {
  const source = await readFile('/input/mechanic.ts', 'utf8'), tests = await readFile('/input/tests.ts', 'utf8'), contract = await readFile('/input/contract.ts', 'utf8')
  const components=JSON.parse(await readFile('/input/components.json','utf8'))
  if(!Array.isArray(components)||components.length>6)throw Error('Component limit')
  const modules=components.map(c=>{if(!/^[a-f0-9]{64}$/.test(c.hash)||typeof c.source!=='string'||c.source.length>50000)throw Error('Invalid component module');return [`component-${c.hash}.ts`,c.source]})
  for (const [filename, text] of [['mechanic.ts', source], ['tests.ts', tests],...modules]) {
    const tree=ts.createSourceFile(filename,text,ts.ScriptTarget.ES2022,true)
    const visit=node=>{
      const allowed=['./contract','./runtime',...(filename.startsWith('component-')?[]:['./mechanic',...components.map(c=>`./component-${c.hash}`)])]
      if ((ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) && node.moduleSpecifier && (!ts.isStringLiteral(node.moduleSpecifier)||!allowed.includes(node.moduleSpecifier.text))) throw Error('Only fixed contract/runtime and pinned component imports are allowed.')
      if(ts.isImportEqualsDeclaration(node)||ts.isImportTypeNode(node)||(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)) throw Error('Dynamic/external imports are unavailable.')
      ts.forEachChild(node,visit)
    };visit(tree)
  }
  await Promise.all([writeFile('/tmp/mechanic.ts', source), writeFile('/tmp/tests.ts', tests), writeFile('/tmp/contract.ts', contract)])
  await Promise.all(modules.map(([file,text])=>writeFile(`/tmp/${file}`,text)))
  await Promise.all([writeFile('/tmp/runtime.js',await readFile('/opt/careplay/runtime-core.mjs','utf8')),writeFile('/tmp/runtime.d.ts',await readFile('/opt/careplay/runtime-api.d.ts','utf8'))])
  const program = ts.createProgram(['/tmp/mechanic.ts', '/tmp/tests.ts'], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [], lib: ['lib.es2022.d.ts'], skipLibCheck: true })
  const errors = ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, ' '))
  if (errors.length) { output({ ok: false, phase, diagnostics: errors.slice(0, 20) }); process.exitCode = 1 }
  else {
    const options = { bundle: true, write: false, platform: 'browser', target: 'es2022', logLevel: 'silent', packages: 'external' }
    const testCode = await build({ ...options, entryPoints: ['/tmp/tests.ts'], format: 'iife', globalName: 'CarePlayTests' })
    await writeFile('/tmp/tests.mjs', testCode.outputFiles[0].text)
    const browser = await build({ ...options, entryPoints: ['/tmp/mechanic.ts'], format: 'iife', globalName: 'CarePlayMechanic' })
    await writeFile('/tmp/mechanic-browser.js', browser.outputFiles[0].text)
    const scene = JSON.parse(await readFile('/input/scene.json', 'utf8'))
    const acceptance = JSON.parse(await readFile('/input/acceptance.json', 'utf8'))
    const componentProbe=JSON.parse(await readFile('/input/component-probe.json','utf8'))
    const checks = await new Promise((resolve, reject) => {
      const worker = new Worker('/opt/careplay/test-worker.mjs', { workerData: { scene, acceptance,componentProbe }, resourceLimits: { maxOldGenerationSizeMb: 96, stackSizeMb: 4 } })
      const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Generated tests/runtime exceeded 15 seconds.')) }, 15000)
      worker.once('message', result => { clearTimeout(timer); void worker.terminate(); resolve(result) })
      worker.once('error', error => { clearTimeout(timer); reject(error) })
      worker.once('exit', code => { if (code) { clearTimeout(timer); reject(new Error('Generated test worker exited without successful evidence.')) } })
    })
    if (!checks.ok) { output(checks); process.exitCode = 1 }
    else output({ ...checks, browserBundle: browser.outputFiles[0].text })
  }
} catch (error) { output({ ok: false, phase, diagnostics: [String(error?.message ?? 'Isolated validation failed.').slice(0, 2000)] }); process.exitCode = 1 }
