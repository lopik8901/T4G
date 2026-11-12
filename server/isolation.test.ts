import { test } from 'node:test'
import assert from 'node:assert/strict'
import { containerArguments, getSandboxStatus, dockerExecutable, dockerEnvironment } from './generation/docker.ts'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { safeRuntimeFrame, safeInput } from '../src/engine/runtime.ts'

test('Windows Docker discovery supports per-user Desktop and its credential helper without mutating PATH', async () => {
  if (process.platform !== 'win32') return
  const root = await mkdtemp(join(tmpdir(), 'careplay-docker-discovery-'))
  try {
    const executable = join(root, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe')
    await mkdir(dirname(executable), {recursive:true}); await writeFile(executable, '')
    assert.equal(dockerExecutable(root, root), executable)
    const before = {...process.env}, env = dockerEnvironment(executable)
    assert.ok(env.Path?.startsWith(dirname(executable)+';'))
    assert.equal(JSON.stringify({...process.env}) === JSON.stringify(before), true, 'Docker discovery must not mutate the parent environment')
    assert.equal(Object.keys(env).filter(key=>key.toLowerCase()==='path').length,1)
    assert.equal(dockerExecutable(join(root,'missing'), root),'docker')
    const systemExecutable=join(root,'Docker','Docker','resources','bin','docker.exe')
    await mkdir(dirname(systemExecutable),{recursive:true});await writeFile(systemExecutable,'')
    assert.equal(dockerExecutable(join(root,'missing'),root),systemExecutable)
  } finally { await rm(root,{recursive:true,force:true}) }
})

test('container command restricts resources, mounts only input and never passes credentials', () => {
  const args = containerArguments('careplay-abcd', 'C:\\temp\\input', `sha256:${'a'.repeat(64)}`)
  for (const flag of ['--network=none', '--read-only', '--cap-drop=ALL', '--memory=256m', '--memory-swap=256m', '--pids-limit=64', '--cpus=0.5', '--user=1000:1000', '--security-opt=no-new-privileges:true']) assert.ok(args.includes(flag))
  assert.equal(args.filter(a => a === '--mount').length, 1)
  assert.ok(args.some(a => a.endsWith('target=/input,readonly')))
  assert.ok(!args.some(a => a.includes('docker.sock') || a.includes('API_KEY')))
  const environments=args.flatMap((a,i)=>a==='--env'?[args[i+1]]:[])
  assert.equal(environments.length,10)
  assert.ok(environments.every(e=>/^(HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|FTP_PROXY|http_proxy|https_proxy|all_proxy|no_proxy|ftp_proxy)=$/.test(e)))
  assert.throws(() => containerArguments('careplay-abcd', 'path,other', `sha256:${'a'.repeat(64)}`))
})
test('runtime boundary rejects oversized and non-finite output and strips extra input data', () => {
  assert.equal(safeRuntimeFrame({entities:Array.from({length:65},()=>({}))}), null)
  assert.equal(safeRuntimeFrame({entities:[{id:'x',kind:'circle',x:Infinity,y:0,radius:.1,visible:true,completed:false}]}),null)
  assert.deepEqual(safeInput({ time: 0, hands: [{id:'h',position:{x:NaN,y:0}}], sound:false,pointer:null }),{time:0,hands:[],sound:false,pointer:null})
})
test('unconfigured isolation fails closed', async () => {
  const previous=process.env.CAREPLAY_SANDBOX;delete process.env.CAREPLAY_SANDBOX
  try { assert.equal((await getSandboxStatus()).available,false) } finally { if(previous!==undefined)process.env.CAREPLAY_SANDBOX=previous }
})
