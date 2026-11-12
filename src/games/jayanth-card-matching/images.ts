import type { Round } from './logic'
const decoded = new Map<string, Promise<void>>()
export async function decodeRound(round: Round): Promise<void> {
  await Promise.all(round.answers.map(item => {
    if (!item.image) return Promise.resolve()
    if (!decoded.has(item.image)) {
      const image = new Image(); image.src = item.image
      const promise = image.decode().catch(() => { decoded.delete(item.image!); throw new Error(`Could not load ${item.label}`) })
      decoded.set(item.image, promise)
    }
    return decoded.get(item.image)
  }))
}
