import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { templateGame } from '../src/studio/config'

test('API validates requests and rejects incompatible patches without exposing internals', async ({ request }) => {
  const base = { prompt: 'Create a garden for two residents', config: templateGame('balloons'), action: 'create' }
  const response = await request.post('/api/agent', { data: base })
  expect(response.ok()).toBe(true)
  expect((await response.json()).patch).toMatchObject({ template: 'garden', players: 2, object: 'seed' })
  const invalid = await request.post('/api/agent', { data: { ...base, config: { ...base.config, volume: 999 } } })
  expect(invalid.status()).toBe(400)
  const hostile = await request.post('/api/agent', { headers: { Origin: 'https://example.com' }, data: base })
  expect(hostile.status()).toBe(403)
})

test('local sound analyser activates an object with a synthetic microphone pulse', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination()
      oscillator.frequency.value = 440; gain.gain.value = 0; oscillator.connect(gain).connect(destination); oscillator.start()
      await context.resume()
      Reflect.set(window, 'pulse', () => { gain.gain.setValueAtTime(0.5, context.currentTime); gain.gain.setValueAtTime(0, context.currentTime + 0.3) })
      const track = destination.stream.getAudioTracks()[0], stop = track.stop.bind(track)
      track.stop = () => { oscillator.stop(); void context.close(); stop() }
      return destination.stream
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open Collaborative Garden', exact: true }).click()
  await page.getByRole('combobox', { name: 'Interaction', exact: true }).selectOption('sound_detection')
  await page.getByRole('button', { name: 'Start preview', exact: true }).click()
  await page.getByRole('button', { name: 'Enable mic', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mic off', exact: true })).toBeVisible()
  await page.evaluate(() => Reflect.get(window, 'pulse')())
  await expect(page.locator('.cp-stage-instruction')).toHaveText('1 flowers grown together')
  await page.getByRole('button', { name: 'Mic off', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable mic', exact: true })).toBeVisible()
})

test('editor and settings pass accessibility checks and narrow screens do not overflow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open Collaborative Garden', exact: true }).click()
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  for (const width of [375, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
