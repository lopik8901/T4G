import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('setup is accessible and fits desktop and narrow screens', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/balloon')
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible()
  await page.screenshot({ path: 'artifacts/setup-desktop.png', fullPage: true })
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  for (const width of [320, 375, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 900 })
  await page.screenshot({ path: 'artifacts/setup-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})

test('preview scores, pauses, resumes, resets, and keeps session best', async ({ page }) => {
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Or try a preview' }).click()
  await page.getByRole('button', { name: 'Pop red balloon (+3)', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.score-display strong')).toHaveText('3')
  await page.getByRole('button', { name: 'Pop blue balloon (+1)', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.score-display strong')).toHaveText('4')
  await page.getByRole('button', { name: 'Start preview', exact: true }).click()
  await expect(page.locator('.mirror-stage')).toHaveCSS('position', 'fixed')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Take your time.' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue playing' }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Extra large', exact: true }).click()
  await page.getByRole('button', { name: 'More balloons' }).click()
  await expect(page.locator('#count')).toHaveText('5')
  await page.getByRole('switch').click()
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('button', { name: 'Reset score' }).click()
  await expect(page.locator('.score-display strong')).toHaveText('0')
  await expect(page.locator('.score-display small')).toContainText('4')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.getByRole('button', { name: 'Continue playing' }).click()
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
})

test('preview balloons travel in varied directions and pause freezes their positions', async ({ page }) => {
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Or try a preview' }).click()
  await expect(page.getByRole('button', { name: 'Pop red balloon (+3)', exact: true })).toBeVisible()
  const positions = () => page.locator('.balloon-hit').evaluateAll(targets => targets.map(target => {
    const rect = target.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  }))
  const before = await positions()
  await expect.poll(async () => {
    const after = await positions()
    return after[0].y < before[0].y - 5 && after[1].x < before[1].x - 5 && after[2].y > before[2].y + 5 && after[3].x > before[3].x + 5
  }).toBe(true)
  await page.getByRole('button', { name: 'Pause preview', exact: true }).click()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const paused = await positions()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  expect(await positions()).toEqual(paused)
})

test('local camera and hand worker load without sending frames externally', async ({ page }) => {
  const external: string[] = []
  const errors: string[] = []
  await page.addInitScript(() => {
    const RealWorker = window.Worker
    Object.assign(window, { detectedFrames: 0 })
    window.Worker = class extends RealWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'hands') Object.assign(window, { detectedFrames: Reflect.get(window, 'detectedFrames') + 1 })
        })
      }
    }
  })
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:5173/')) external.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  // MediaPipe sends this successful CPU initialization notice to stderr.
  page.on('console', message => { if (message.type() === 'error' && message.text() !== 'INFO: Created TensorFlow Lite XNNPACK delegate for CPU.') errors.push(message.text()) })
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
  await expect(page.locator('.status-pill')).toContainText('Live mirror', { timeout: 45000 })
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.videoWidth > 0 && video.srcObject instanceof MediaStream)).toBe(true)
  await expect(page.locator('video')).toHaveCSS('transform', 'matrix(-1, 0, 0, 1, 0, 0)')
  await page.getByRole('button', { name: 'Start activity', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'detectedFrames'))).toBeGreaterThan(2)
  expect(await page.locator('.balloon-canvas canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2')!
    return gl.getContextAttributes()?.alpha && gl.getParameter(gl.COLOR_CLEAR_VALUE)[3] === 0
  })).toBe(true)
  await page.screenshot({ path: 'artifacts/live-camera.png' })
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.srcObject)).toBe(null)
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

test('permission denial is actionable and preview remains usable', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError') }
  })
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Camera access is blocked')
  await page.getByRole('button', { name: 'Or try a preview' }).click()
  await expect(page.getByRole('button', { name: 'Start preview' })).toBeEnabled()
})

test('staff controls are keyboard accessible with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Staff controls', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Staff controls' })).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  await page.screenshot({ path: 'artifacts/staff-settings.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Staff controls' })).not.toBeVisible()
})

test('tracked palm contact uses mirrored screen coordinates and hand loss stops contact', async ({ page }) => {
  // The real model is covered above; controlled landmarks make contact reproducible.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 480
      const context = canvas.getContext('2d')!
      const paint = () => { context.fillStyle = '#719487'; context.fillRect(0, 0, 640, 480) }
      paint()
      const stream = canvas.captureStream(15)
      const timer = setInterval(paint, 65)
      const track = stream.getVideoTracks()[0]
      const stop = track.stop.bind(track)
      track.stop = () => { clearInterval(timer); stop() }
      return stream
    }
    const cameraWorker = class extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null
      postMessage(data: { type: string; time: number; frame?: ImageBitmap }) {
        if (data.type === 'init') queueMicrotask(() => this.onmessage?.(new MessageEvent('message', { data: { type: 'ready' } })))
        else {
          data.frame?.close()
          const point = Reflect.get(window, 'testHand')
          this.onmessage?.(new MessageEvent('message', { data: { type: 'hands', hands: point ? [Array.from({ length: 21 }, () => point)] : [], time: data.time } }))
        }
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: cameraWorker })
  })
  await page.goto('/balloon')
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
  await expect(page.locator('.status-pill')).toContainText('Live mirror')
  await page.getByRole('button', { name: 'Start activity', exact: true }).click()
  const balloon = page.getByRole('button', { name: 'Pop red balloon (+3)', exact: true })
  await expect(balloon).toBeVisible()
  await balloon.evaluate(target => {
    const rect = target.getBoundingClientRect()
    const video = document.querySelector('video')!
    const scale = Math.max(innerWidth / video.videoWidth, innerHeight / video.videoHeight)
    const x = (rect.left + rect.width / 2) / innerWidth
    const y = (rect.top + rect.height / 2) / innerHeight
    Reflect.set(window, 'testHand', {
      x: ((1 - x) * innerWidth + (video.videoWidth * scale - innerWidth) / 2) / (video.videoWidth * scale),
      y: (y * innerHeight + (video.videoHeight * scale - innerHeight) / 2) / (video.videoHeight * scale),
    })
  })
  await expect(page.locator('.score-display strong')).toHaveText('3')
  await page.evaluate(() => Reflect.set(window, 'testHand', null))
  await expect(page.locator('.stage-hint')).toHaveText('Lift a hand whenever you’re ready')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('.score-display strong')).toHaveText('3')
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click()
  await expect(page.locator('.status-pill')).toContainText('Live mirror')
  await page.getByRole('button', { name: 'Turn camera off', exact: true }).click()
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.srcObject)).toBe(null)
})
