import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const localPath=(path:string)=>fileURLToPath(new URL(path,import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name:'demo-asset-notices',
    generateBundle(){
      for(const file of ['assets/GFDL-1.2.txt','assets/LICENSE.md','assets/PHOTO_CREDITS.md','assets/photo-manifest.json','recording-manifest.json']){
        this.emitFile({type:'asset',fileName:`demos/card-matching-notices/${file}`,source:readFileSync(localPath(`./src/games/jayanth-card-matching/${file}`),'utf8')})
      }
    },
  }],
  build:{rolldownOptions:{input:{
    studio:localPath('./index.html'),
    balloonDemo:localPath('./demos/balloon-pop/index.html'),
    directMatch:localPath('./demos/direct-match/index.html'),
    memoryPeek:localPath('./demos/memory-peek/index.html'),
  }}},
  server: { host: '127.0.0.1', watch:{ignored:['**/.careplay/**']}, proxy: { '/api': 'http://127.0.0.1:3001' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:3001' } },
})
