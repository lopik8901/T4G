import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// An isolated production bundle; the root Balloon Pop build is unchanged.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../../public/', import.meta.url)),
  plugins: [react(), {
    name: 'bundle-card-picture-licences',
    generateBundle() {
      this.emitFile({type:'asset',fileName:'recording-manifest.json',source:readFileSync(new URL('./recording-manifest.json',import.meta.url),'utf8')})
      for (const name of ['GFDL-1.2.txt', 'photo-manifest.json', 'LICENSE.md']) {
        this.emitFile({ type: 'asset', fileName: `assets/${name}`, source: readFileSync(new URL(`./assets/${name}`, import.meta.url), 'utf8') })
      }
    },
  }],
  build: { outDir: fileURLToPath(new URL('../../../dist/card-matching/', import.meta.url)), emptyOutDir: true },
})
