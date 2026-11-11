import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './browser',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: process.env.CARD_MATCHING_BASE_URL ?? 'http://127.0.0.1:5173',
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
    launchOptions: { channel: 'chrome' },
  },
})
