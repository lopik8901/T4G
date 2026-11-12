import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join, dirname, delimiter, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { z } from 'zod'
import type { SourceBundle } from '../../src/engine/generation.ts'
import { engineContract } from './validator.ts'
import { runtimeSource, runtimeDeclarations } from './validator.ts'
export const trustedRuntimeHash = createHash('sha256').update(engineContract+runtimeSource+runtimeDeclarations+['runner.mjs','test-worker.mjs','component-acceptance.mjs','design-acceptance.mjs','acceptance.mjs'].map(file=>readFileSync(new URL(`../../sandbox/${file}`,import.meta.url),'utf8')).join('')).digest('hex')

const resultSchema = z.object({ ok: z.boolean(), phase:z.enum(['compile','tests','runtime']).optional(), diagnostics: z.array(z.string().max(2000)).max(30).optional(), browserBundle: z.string().max(300000).optional(), testCount: z.number().int().min(3).max(40).optional(), runtimeChecks: z.array(z.string().max(100)).max(20).optional() })
export function dockerExecutable(localAppData = process.env.LOCALAPPDATA, programFiles = process.env.ProgramFiles) {
  if (process.platform !== 'win32') return 'docker'
  const candidates = [localAppData && join(localAppData, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'), programFiles && join(programFiles, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')]
  return candidates.find(path => path && existsSync(path)) || 'docker'
}
export function dockerEnvironment(executable = dockerExecutable()) {
  const env = { ...process.env }
  if (process.platform === 'win32' && isAbsolute(executable)) {
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path')
    const previous = pathKey ? env[pathKey] : ''
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key]
    // Desktop's credential helper must be discoverable by the CLI too.
    env.Path = `${dirname(executable)}${delimiter}${previous ?? ''}`
  }
  return env
}
function docker(args: string[], timeout = 10000, maxBuffer = 1024 * 1024) {
  return new Promise<{ stdout: string; stderr:string; code: number }>((resolve, reject) => {
    const executable = dockerExecutable()
    execFile(executable, args, { env: dockerEnvironment(executable), windowsHide: true, shell: false, timeout, maxBuffer }, (error, stdout,stderr) => {
      if (error && (error.killed || typeof error.code !== 'number')) { reject(new Error(error.killed ? 'Isolated job timed out.' : 'Docker CLI/daemon is unavailable.')); return }
      resolve({ stdout,stderr, code: error ? Number(error.code) : 0 })
    })
  })
}
export type SandboxStatus = { available: boolean; reason: string; imageId?: string }
export async function getSandboxStatus(): Promise<SandboxStatus> {
  if (process.env.CAREPLAY_SANDBOX !== 'docker') return { available: false, reason: 'Set CAREPLAY_SANDBOX=docker after installing Docker Desktop with a Linux/WSL2 engine and building the trusted validation image.' }
  try {
    if (process.env.DOCKER_HOST && !/^(unix:|npipe:)/.test(process.env.DOCKER_HOST)) throw new Error('Only a local Docker daemon is allowed.')
    const context = await docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])
    if (context.code || !/^(unix:|npipe:)/.test(context.stdout.trim())) throw new Error('Only a local Docker daemon is allowed.')
    const info = await docker(['info', '--format', '{{.OSType}}'])
    if (info.code || info.stdout.trim() !== 'linux') throw new Error('The Docker engine must use Linux containers.')
    const image = await docker(['image', 'inspect', '--format', '{{.Id}}', 'careplay-validator:1'])
    const imageId = image.stdout.trim()
    if (image.code || !/^sha256:[a-f0-9]{64}$/.test(imageId)) throw new Error('Build the trusted careplay-validator:1 image first.')
    const version=await docker(['image','inspect','--format','{{index .Config.Labels "careplay.runtime-sha256"}}',imageId])
    if(version.code||version.stdout.trim()!==trustedRuntimeHash)throw Error('Trusted runtime changed. Run npm run sandbox:build before generating games.')
    return { available: true, reason: 'Local Linux Docker validator configured. Container and browser boundaries still have residual risks; see security documentation.', imageId }
  } catch (error) { return { available: false, reason: error instanceof Error ? error.message : 'Isolated validation is unavailable.' } }
}
export function containerArguments(name: string, inputFolder: string, imageId: string) {
  if (!/^careplay-[a-f0-9-]+$/.test(name) || !/^sha256:[a-f0-9]{64}$/.test(imageId) || inputFolder.includes(',')) throw new Error('Invalid trusted container arguments.')
  // Docker client config can automatically inject proxy URLs (including credentials).
  const emptyProxies = ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','FTP_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','ftp_proxy'].flatMap(key => ['--env', `${key}=`])
  return ['create', '--name', name, '--pull=never', '--network=none', '--read-only', '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges:true', '--cpus=0.5', '--memory=256m', '--memory-swap=256m', '--pids-limit=64', '--ipc=none', '--ulimit=nofile=128:128', '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864,mode=1777', ...emptyProxies, '--mount', `type=bind,source=${inputFolder},target=/input,readonly`, imageId]
}
export type IsolatedResult = { status: 'unavailable'; reason: string } | { status: 'failed'; diagnostics: string[]; phase?:'compile'|'tests'|'runtime' } | { status: 'passed'; browserBundle: string; artifactHash: string; imageId: string; testCount: number; runtimeChecks: string[] }
export async function validateInDocker(bundle: SourceBundle, acceptance?: 'butterfly' | 'circles', componentProbe?:'ordered-selection'|'autonomous-wandering'): Promise<IsolatedResult> {
  const status = await getSandboxStatus()
  if (!status.available || !status.imageId) return { status: 'unavailable', reason: status.reason }
  if (!bundle.scene) return { status: 'failed', diagnostics: ['A generated scene manifest is required: include parameters, initial entities and instructions.'] }
  const input = await mkdtemp(join(tmpdir(), 'careplay-isolated-input-')), name = `careplay-${randomUUID()}`
  try {
    await Promise.all([writeFile(join(input, 'mechanic.ts'), bundle.source), writeFile(join(input, 'tests.ts'), bundle.tests), writeFile(join(input, 'contract.ts'), engineContract), writeFile(join(input, 'scene.json'), JSON.stringify(bundle.scene)), writeFile(join(input, 'acceptance.json'), JSON.stringify(acceptance ?? null))])
    await writeFile(join(input,'components.json'),JSON.stringify(bundle.linkedComponents??[]))
    await writeFile(join(input,'component-probe.json'),JSON.stringify(componentProbe??null))
    const created = await docker(containerArguments(name, input, status.imageId))
    if (created.code) return { status: 'failed', diagnostics: ['Docker could not create the restricted validation container.'] }
    const execution = await docker(['start', '--attach', name], 45000)
    let parsed: z.infer<typeof resultSchema>
    try { parsed = resultSchema.parse(JSON.parse(execution.stdout)) } catch {
      const state = await docker(['inspect', '--format', '{{.State.ExitCode}} {{.State.OOMKilled}}', name]).catch(() => null)
      const details = state?.stdout.trim()
      return { status: 'failed', diagnostics: [`The isolated runner did not produce a valid bounded report.${details && /^\d+ (true|false)$/.test(details) ? ` Exit code / OOM-killed: ${details}.` : ''}`, ...(execution.stderr?['Isolated runner startup: '+execution.stderr.slice(0,1200)]:[])] }
    }
    if (execution.code || !parsed.ok || !parsed.browserBundle || !parsed.testCount || !parsed.runtimeChecks) return { status: 'failed', phase:parsed.phase, diagnostics: parsed.diagnostics ?? ['Generated tests or independent runtime checks failed.'] }
    if (!['module-load','setup','two-hands','tracking-loss-no-crash','finite-state','100-fixed-steps','dispose'].every(check => parsed.runtimeChecks!.includes(check))) return { status:'failed', diagnostics:['The isolated runner omitted required runtime evidence.'] }
    return { status: 'passed', browserBundle: parsed.browserBundle, artifactHash: createHash('sha256').update(parsed.browserBundle).digest('hex'), imageId: status.imageId, testCount: parsed.testCount, runtimeChecks: parsed.runtimeChecks }
  } catch (error) { return { status: 'failed', diagnostics: [error instanceof Error ? error.message : 'Isolated validation failed.'] } }
  finally {
    // Killing the Docker client alone is insufficient: explicitly remove the named container on all exit paths.
    await docker(['rm', '--force', name]).catch(() => {})
    await rm(input, { recursive: true, force: true })
  }
}
