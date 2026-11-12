import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.CARD_MATCHING_BASE_URL ?? 'http://127.0.0.1:5173'
const memoryMode=process.env.BENCH_MEMORY==='1'
const handCount=Number(process.env.BENCH_HANDS??1)
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' })
await page.addInitScript(({handCount}) => {
  window.__commits = 0
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), inject(renderer) { this.renderers.set(1, renderer); return 1 }, onCommitFiberRoot: () => window.__commits++, onCommitFiberUnmount() {}, onScheduleFiberRoot() {} }
  navigator.mediaDevices.getUserMedia = async () => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
    const paint = () => canvas.getContext('2d').fillRect(0, 0, 640, 480)
    paint(); const stream = canvas.captureStream(15); const timer = setInterval(paint, 65)
    const track = stream.getVideoTracks()[0]; const stop = track.stop.bind(track)
    track.stop = () => { clearInterval(timer); stop() }; return stream
  }
  window.Worker = class {
    postMessage(data) {
      if (data.type === 'init') queueMicrotask(() => this.onmessage?.({ data: { type: 'ready' } }))
      else {
        data.frame?.close()
        const point = { x: 0.5 + 0.35 * Math.sin(performance.now() / 160), y: 0.45 }
        window.__pointerInputAt = performance.now()
        this.onmessage?.({ data: { type: 'hands', hands: [Array.from({ length: 21 }, () => point),...(handCount===2?[Array.from({length:21},()=>({x:.12,y:.85}))]:[])], time: data.time } })
      }
    }
    terminate() {}
  }
},{handCount})
page.on('pageerror', error => console.error('Browser error:', error.message))
await page.goto(`${base}/src/games/jayanth-card-matching/index.html`)
await page.getByRole('button', { name: /^Audio:/ }).click()
if(memoryMode){
  await page.getByRole('button',{name:/^Game Options/}).click()
  await page.getByRole('button',{name:'2 — Memory Peek',exact:true}).click()
  await page.getByRole('button',{name:'Done',exact:true}).click()
}
await page.getByRole('button', { name: /Start (playing|Game)/i }).click()
const collect = async label => page.evaluate(async label => {
  const frames = [], latency = []; let consumedInput = 0; let previous = performance.now(), request
  const startCommits = window.__commits
  const startHeap = performance.memory?.usedJSHeapSize
  const observer = new MutationObserver(records => {
    if (records.some(record => record.target.matches?.('[aria-label="Hand pointer"], [aria-label="Hand pointer"] svg circle'))) {
      if (window.__pointerInputAt && consumedInput !== window.__pointerInputAt) { latency.push(performance.now() - window.__pointerInputAt); consumedInput = window.__pointerInputAt }
    }
  })
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style', 'stroke-dasharray'] })
  const loop = now => { frames.push(now - previous); previous = now; request = requestAnimationFrame(loop) }
  request = requestAnimationFrame(loop)
  await new Promise(resolve => setTimeout(resolve, 6500)); cancelAnimationFrame(request); observer.disconnect()
  const stats = values => { values.sort((a,b)=>a-b); const at = p => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? null
    return { samples: values.length, p50: at(.5), p95: at(.95), p99: at(.99), over25ms: values.filter(v => v > 25).length } }
  const video=document.querySelector('video'),rect=video.getBoundingClientRect()
  return { video:{width:rect.width,height:rect.height,objectFit:getComputedStyle(video).objectFit,transform:getComputedStyle(video).transform}, label, frames: stats(frames.slice(1)), inputToDOMms: stats(latency), rootCommits: window.__commits - startCommits, heapStart: startHeap, heapEnd: performance.memory?.usedJSHeapSize }
}, label)
const results = [await collect(memoryMode?'look-remember-match-entry':'reveal-and-fall')]
await page.waitForFunction(()=>['answering','selecting'].includes(document.querySelector('[data-phase]')?.getAttribute('data-phase')),{},{timeout:30000})
// Compare steady pointer work, excluding the immediate phase-commit tail.
const beforeSettle=await page.evaluate(()=>window.__commits)
await page.waitForTimeout(1000)
const settlingCommits=await page.evaluate(()=>window.__commits)-beforeSettle
results.push({...await collect('answering-with-synthetic-hands'),settlingMs:1000,settlingCommits})
const client = await page.context().newCDPSession(page)
await client.send('HeapProfiler.collectGarbage')
results.push({ postGCHeapBytes: (await client.send('Runtime.getHeapUsage')).usedSize })
await page.getByRole('button', { name: 'Staff Controls', exact: true }).click()
await page.getByRole('button', { name: 'End Session', exact: true }).click()
const confirmation = page.getByRole('dialog')
if (await confirmation.isVisible()) await confirmation.getByRole('button', { name: 'End Session', exact: true }).click()
await page.waitForTimeout(200)
await client.send('HeapProfiler.collectGarbage')
results.push({ postExitGCHeapBytes: (await client.send('Runtime.getHeapUsage')).usedSize,
  streamStopped: await page.locator('video').evaluate(video => video.srcObject === null),
  cursorHidden: !await page.getByRole('img', { name: 'Hand pointer' }).isVisible() })
await mkdir('artifacts/card-matching', { recursive: true })
const output = process.argv[2] ?? 'artifacts/card-matching/performance.json'
await writeFile(output, JSON.stringify({ environment: { chrome: browser.version(), viewport: '1920x1080', handCount,level:memoryMode?2:1,input: 'synthetic canvas and landmarks; no MediaPipe inference' }, results }, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
