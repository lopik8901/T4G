import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const target = new URL('public/mediapipe/', root)
await mkdir(target, { recursive: true })
await cp(new URL('node_modules/@mediapipe/tasks-vision/wasm/', root), new URL('wasm/', target), { recursive: true })
await cp(new URL('node_modules/@mediapipe/tasks-vision/vision_bundle.js', root), new URL('vision_bundle.js', target))
const model = new URL('hand_landmarker.task', target)
const existing = await stat(model).catch(() => null)
if (!existing || existing.size < 1000000) {
  console.log('Downloading the hand tracking model for local use…')
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', { signal: AbortSignal.timeout(120000) })
  if (!response.ok) throw new Error(`Model download failed (${response.status}). Run npm run setup:assets to retry.`)
  await writeFile(model, new Uint8Array(await response.arrayBuffer()))
}
console.log(`Local hand tracking assets ready: ${fileURLToPath(target)}`)
