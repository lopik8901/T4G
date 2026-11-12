import ts from 'typescript-compiler'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, basename } from 'node:path'
import type { SourceBundle } from '../../src/engine/generation.ts'

const contractPath = fileURLToPath(new URL('../../src/engine/contract.ts', import.meta.url))
export const engineContract = readFileSync(contractPath, 'utf8')
export const runtimeSource = readFileSync(new URL('../../sandbox/runtime-core.mjs', import.meta.url), 'utf8')
export const runtimeDeclarations = readFileSync(new URL('../../sandbox/runtime-api.d.ts', import.meta.url), 'utf8')
export function missingComponentImports(source:string,components:NonNullable<SourceBundle['linkedComponents']>){
  const ast=ts.createSourceFile('mechanic.ts',source,ts.ScriptTarget.ES2022,true),imports=new Set<string>()
  for(const node of ast.statements){
    if(ts.isImportDeclaration(node)&&node.importClause&&!node.importClause.isTypeOnly&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
      const bindings=node.importClause.namedBindings
      if(node.importClause.name||bindings&&(ts.isNamespaceImport(bindings)||bindings.elements.some(e=>!e.isTypeOnly)))imports.add(node.moduleSpecifier.text)
    }
    if(ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.add(node.moduleSpecifier.text)
  }
  return components.filter(c=>!imports.has(`./component-${c.hash}`)).map(c=>`Import and compose the supplied reusable ${c.id} v${c.version} from ./component-${c.hash}; do not reimplement it locally.`)
}

/** Compiler diagnostics only. This never imports or executes submitted modules. */
export function staticValidate(bundle: SourceBundle) {
  const files = new Map([['/mechanic.ts', bundle.source], ['/tests.ts', bundle.tests], ['/contract.ts', engineContract], ['/compatibility.ts', `import type { MechanicFactory, MechanicTest } from './contract'; import { createMechanic } from './mechanic'; import { tests } from './tests'; const factory: MechanicFactory = createMechanic; const cases: MechanicTest[] = tests;`]])
  const diagnostics: string[] = []
  files.set('/runtime.d.ts', runtimeDeclarations)
  const componentImports=(bundle.linkedComponents??[]).map(c=>`./component-${c.hash}`)
  for(const c of bundle.linkedComponents??[])files.set(`/component-${c.hash}.ts`,c.source)
  for (const [name, text] of files) {
    if (name === '/contract.ts' || name === '/compatibility.ts' || name === '/runtime.d.ts') continue
    const ast = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true)
    const inspect = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)||ts.isExportDeclaration(node)&&node.moduleSpecifier) {
        const specifier = node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : ''
        if (!['./contract', './runtime',...(name.startsWith('/component-')?[]:['./mechanic',...componentImports])].includes(specifier)) diagnostics.push(`${name}: imports must reference fixed contract/runtime or pinned components.`)
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) diagnostics.push(`${name}: dynamic imports are not allowed.`)
      if (ts.isIdentifier(node) && ['eval', 'Function', 'fetch', 'require', 'process', 'window', 'document', 'globalThis', 'WebSocket', 'XMLHttpRequest', 'Worker'].includes(node.text)) diagnostics.push(`${name}: ${node.text} is outside the mechanic contract.`)
      ts.forEachChild(node, inspect)
    }
    inspect(ast)
  }
  const options: ts.CompilerOptions = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [], lib: ['lib.es2022.d.ts'], skipLibCheck: true }
  const host = ts.createCompilerHost(options)
  const libraryDirectory = dirname(ts.getDefaultLibFilePath(options))
  const isLibrary = (name: string) => dirname(resolve(name)) === resolve(libraryDirectory) && /^lib\..*\.d\.ts$/.test(basename(name))
  const sourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, language, onError, fresh) => files.has(name) ? ts.createSourceFile(name, files.get(name)!, language, true) : isLibrary(name) ? sourceFile(name, language, onError, fresh) : undefined
  host.fileExists = name => files.has(name) || isLibrary(name) && ts.sys.fileExists(name)
  host.readFile = name => files.get(name) ?? (isLibrary(name) ? ts.sys.readFile(name) : undefined)
  host.resolveModuleNames = (names, containing) => names.map(name => {
    const file = componentImports.includes(name)&&!containing.startsWith('/component-')?`/${name.slice(2)}.ts`:name === './runtime' ? '/runtime.d.ts' : name === './contract' ? '/contract.ts' : name === './mechanic' && ['/tests.ts', '/compatibility.ts'].includes(containing) ? '/mechanic.ts' : name === './tests' && containing === '/compatibility.ts' ? '/tests.ts' : null
    return file ? { resolvedFileName: file, extension: file.endsWith('.d.ts') ? ts.Extension.Dts : ts.Extension.Ts } : undefined
  })
  const program = ts.createProgram([...files.keys()], options, host)
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) diagnostics.push(`${diagnostic.file?.fileName ?? 'module'}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`)
  // compatibility.ts enforces actual exported types, including safe aliases and
  // pinned re-exports; source-text regexes falsely reject those module forms.
  return [...new Set(diagnostics)].slice(0, 30)
}
