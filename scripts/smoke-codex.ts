import assert from 'node:assert/strict'
import { askCodex, codexStatus } from '../server/codex.ts'
import { templateGame, applyPatch } from '../src/studio/config.ts'

const status = await codexStatus()
assert.ok(status.ready, status.message)
const before = templateGame('garden')
const result = await askCodex('Make the flowers size 1.8. Keep everything else exactly the same.', before, 'edit', 'You configure CarePlay activities. Change only the requested field. Return valid game configuration data, never code. Garden objects must remain seed.')
const after = applyPatch(before, result.patch)
assert.equal(after.size, 1.8)
assert.deepEqual(after, { ...before, size: 1.8 })
console.log('Codex CLI integration passed: ChatGPT sign-in → structured configuration → validated preview patch.')
