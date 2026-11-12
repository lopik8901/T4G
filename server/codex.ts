import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { agentResultSchema, editableSchema, type GameConfig } from '../src/studio/config.ts'

const responseSchema = z.object({ config: editableSchema, explanation: z.string().min(1).max(600), unsupported: z.boolean() }).strict()
export function codexExecutable() {
  if (process.env.CODEX_CLI_PATH) return process.env.CODEX_CLI_PATH
  const app = join(process.env.LOCALAPPDATA ?? '', 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe')
  return process.platform === 'win32' && existsSync(app) ? app : 'codex'
}
export function codexEnvironment() {
  const env = { ...process.env }
  for (const key of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL']) delete env[key]
  return env
}
function run(args: string[], input?: string, cwd?: string, timeout = 10000) {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(codexExecutable(), args, { cwd, env: codexEnvironment(), windowsHide: true, shell: false, timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const message = error.code === 'ENOENT' ? 'Codex CLI was not found. Install it or set CODEX_CLI_PATH, then restart CarePlay.' : error.killed ? 'Codex took too long. Please try a shorter request.' : /invalid.*schema|schema.*invalid/i.test(stderr) ? 'Codex rejected the output schema. The developer needs to update this response contract.' : /usage limit|rate limit|quota/i.test(stderr) ? 'Your Codex usage limit has been reached. Please try again later.' : /unauthorized|authentication (failed|required)|not logged in|please (log|sign) in|401\b/i.test(stderr) ? 'Sign in with ChatGPT using codex login, then try again.' : 'Codex could not complete this request. Check codex login status and try again.'
        reject(new Error(message)); return
      }
      resolve(stdout + (args[0] === 'login' ? stderr : ''))
    })
    child.stdin?.on('error', () => {})
    child.stdin?.end(input ?? '')
  })
}
export async function codexStatus() {
  try {
    const status = await run(['login', 'status'])
    return /ChatGPT/i.test(status) ? { ready: true, message: 'Codex CLI · ChatGPT sign-in' } : { ready: false, message: 'Run codex login and sign in with ChatGPT to use CarePlay without an API key.' }
  } catch (error) { return { ready: false, message: error instanceof Error ? error.message : 'Codex CLI is unavailable.' } }
}
export function configurationResult(raw: unknown, current: GameConfig) {
  const result = responseSchema.parse(raw)
  const patch = result.unsupported ? {} : Object.fromEntries(Object.entries(result.config).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(current[key as keyof GameConfig])))
  return agentResultSchema.parse({ patch, explanation: result.explanation, unsupported: result.unsupported })
}
export async function codexStructured<T>(schemaContract: z.ZodType<T>, prompt: string) {
  const folder = await mkdtemp(join(tmpdir(), 'careplay-codex-'))
  try {
    const schema = join(folder, 'schema.json'), output = join(folder, 'response.json')
    await writeFile(schema, JSON.stringify(z.toJSONSchema(schemaContract)))
    const args = ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only',
      '-c', 'forced_login_method="chatgpt"', '-c', 'features.shell_tool=false', '-c', 'features.apply_patch_freeform=false', '-c', 'web_search="disabled"',
      '--output-schema', schema, '--output-last-message', output, '--color', 'never']
    if (process.env.CODEX_MODEL) args.push('--model', process.env.CODEX_MODEL)
    args.push('-')
    await run(args, prompt, folder, 120000)
    return schemaContract.parse(JSON.parse(await readFile(output, 'utf8')))
  } finally {
    // Only this uniquely created temporary request folder is removed.
    await rm(folder, { recursive: true, force: true })
  }
}
export async function askCodex(prompt: string, config: GameConfig, action: 'create' | 'edit', instructions: string) {
  const result = await codexStructured(responseSchema, `${instructions}\nReturn the COMPLETE editable configuration (without id), a brief explanation, and unsupported boolean. Preserve all values not requested. If unsupported, return the original configuration. Do not use tools, read files, or change files. Only answer with the requested JSON.\nStaff request and current configuration:\n${JSON.stringify({ action, config, request: prompt })}`)
  return configurationResult(result, config)
}
