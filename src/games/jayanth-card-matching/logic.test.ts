import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categories } from './categories.ts'
import { createRound, isMatch } from './logic.ts'

for (const category of categories) {
  test(`${category.label}: one match, distinct choices, varied positions, no reference repeats`, () => {
    let previous: string | undefined
    let position:number|undefined
    let seed = 42
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
    const targets = new Set<string>()
    const history: string[] = []
    const positions = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const round = createRound(category, previous, random, history,position)
      assert.notEqual(round.reference.id, previous)
      assert.equal(round.answers.length, 4)
      assert.equal(new Set(round.answers.map(item => item.id)).size, 4)
      assert.equal(round.answers.filter(item => isMatch(round, item.id)).length, 1)
      assert.ok(round.answers.every(item => category.items.includes(item)))
      targets.add(round.reference.id)
      positions.add(round.answers.findIndex(item => isMatch(round, item.id)))
      const nextPosition=round.answers.findIndex(c=>c.id===round.reference.id);assert.notEqual(nextPosition,position);position=nextPosition
      previous = round.reference.id
      history.push(previous)
    }
    assert.equal(targets.size, category.items.length)
    assert.equal(positions.size, 4)
  })
}

test('rejects categories with too few cards or duplicate IDs', () => {
  const base = categories[0]
  assert.throws(() => createRound({ ...base, items: base.items.slice(0, 3) }))
  assert.throws(() => createRound({ ...base, items: [base.items[0], base.items[0], base.items[1], base.items[2]] }))
})
