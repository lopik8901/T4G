import {test} from 'node:test'
import assert from 'node:assert/strict'
import {categories} from './categories.ts'
import {newSession,updateSession} from './session.ts'
import manifest from './recording-manifest.json' with {type:'json'}
import {instruction} from './localisation.ts'
test('every target has exact English recording manifest phrases and unique paths',()=>{
 assert.equal(manifest.recordings.length,117)
 assert.equal(new Set(manifest.recordings.map(r=>r.file)).size,117)
 for(const category of categories)for(const item of category.items)for(const lang of ['en'] as const){const row=manifest.recordings.find(r=>r.language===lang&&r.id===`find:${category.id}:${item.id}`);assert.equal(row?.text,instruction(item,lang))}
})
test('recording URLs cannot invoke remote audio services',async()=>{
 const {localRecording}=await import('./speech.ts')
 assert.equal(localRecording('/recordings/zh/a.mp3','http://localhost:5173/game'),'/recordings/zh/a.mp3')
 assert.equal(localRecording('https://remote.example/tts','http://localhost:5173/game'),undefined)
 assert.equal(localRecording('data:audio/wav;base64,AA','http://localhost:5173/game'),undefined)
})
