import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codexEnvironment, configurationResult } from './codex.ts'
import { templateGame } from '../src/studio/config.ts'

test('Codex configuration output becomes a minimal validated patch', () => {
  const original = templateGame('garden'), { id: _, ...config } = original
  const result = configurationResult({ config: { ...config, size: 1.8 }, explanation: 'Larger flowers.', unsupported: false }, original)
  assert.deepEqual(result.patch, { size: 1.8 })
  assert.deepEqual(configurationResult({ config, explanation: 'Unsupported.', unsupported: true }, original).patch, {})
  assert.throws(() => configurationResult({ config: { ...config, size: 99 }, explanation: 'Invalid', unsupported: false }, original))
})
test('Codex child does not inherit API-key authentication', () => {
  const env = codexEnvironment()
  for (const name of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL']) assert.equal(env[name], undefined)
})
