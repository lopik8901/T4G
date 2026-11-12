import type { CardItem, Category } from './categories.ts'

export type Round = { reference: CardItem; answers: CardItem[] }

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createRound(category: Category, previousId?: string, random = Math.random, history: readonly string[] = [], previousPosition?:number): Round {
  if (category.items.length < 4 || new Set(category.items.map(item => item.id)).size !== category.items.length) {
    throw new Error('A category needs at least four cards with unique IDs.')
  }
  const eligible = category.items.filter(item => item.id !== previousId)
  const counts = new Map<string, number>()
  for (const id of history) counts.set(id, (counts.get(id) ?? 0) + 1)
  const least = Math.min(...eligible.map(item => counts.get(item.id) ?? 0))
  const candidates = eligible.filter(item => (counts.get(item.id) ?? 0) === least)
  const weighted = candidates.flatMap(item => item.familiar ? [item, item, item] : [item])
  const reference = weighted[Math.floor(random() * weighted.length)]
  const pool = shuffle(category.items.filter(item => item.id !== reference.id), random)
  const distractors: CardItem[] = []
  for (const item of pool) {
    if ([reference, ...distractors].every(other => !item.conflicts?.includes(other.id) && !other.conflicts?.includes(item.id))) distractors.push(item)
    if (distractors.length === 3) break
  }
  if (distractors.length !== 3) throw new Error('Category needs four visually distinct compatible cards.')
  const positions=[0,1,2,3].filter(position=>position!==previousPosition)
  const correctPosition=positions[Math.floor(random()*positions.length)]
  const answers=shuffle(distractors,random)
  answers.splice(correctPosition,0,reference)
  return {reference,answers}
}

export function isMatch(round: Round, answerId: string): boolean {
  return round.reference.id === answerId
}
