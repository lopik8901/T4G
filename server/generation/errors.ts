import { z } from 'zod'

const safeProviderErrors = new Set([
  'The technical planner did not produce complete requirements and acceptance checks.',
  'Component Generator returned an unvalidated or incompatible version.',
  'Component failed reuse validation.',
  'Component is rejected, unvalidated or runtime-incompatible.',
  'The game design did not preserve the requested round and object counts.',
  'Codex CLI was not found. Install it or set CODEX_CLI_PATH, then restart CarePlay.',
  'Codex took too long. Please try a shorter request.',
  'Codex rejected the output schema. The developer needs to update this response contract.',
  'Your Codex usage limit has been reached. Please try again later.',
  'Sign in with ChatGPT using codex login, then try again.',
  'Codex could not complete this request. Check codex login status and try again.',
])
export function generationFailureMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    const fields = error.issues.slice(0, 5).map(issue => `${issue.path.join('.') || 'response'} (${issue.code})`).join(', ')
    return `The generated response failed validation: ${fields}.`
  }
  if (error instanceof SyntaxError) return 'The coding assistant returned malformed JSON.'
  if (error instanceof Error && safeProviderErrors.has(error.message)) return error.message
  return 'The coding assistant could not prepare a valid draft.'
}
