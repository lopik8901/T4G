import { create } from 'zustand'
import { z } from 'zod'
import { applyPatch, gameSchema, templateGame, type GameConfig, type GamePatch, type Template } from './config.ts'
import { storageOperation } from './persistence'
import type { ExperimentalGame } from '../engine/scene'

const versionSchema = z.object({ config: gameSchema, label: z.string(), time: z.string() })
const recordSchema = z.object({ id: z.string(), config: gameSchema, versions: z.array(versionSchema).min(1).max(100), cursor: z.number().int().min(0), photos: z.array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,/)).max(6), updated: z.string() })
export type SavedGame = z.infer<typeof recordSchema>
type Version = z.infer<typeof versionSchema>
type StudioState = {
  attachExperimental: (game: ExperimentalGame) => void
  config: GameConfig; versions: Version[]; cursor: number; photos: string[]; revision: number; dirty: boolean; approved: boolean; games: SavedGame[]
  change: (patch: GamePatch, label: string) => void; open: (game: SavedGame) => void; newGame: (template: Template) => void
  travel: (cursor: number) => void; setPhotos: (photos: string[]) => void; save: () => Promise<void>; load: () => Promise<void>
  remove: (id: string) => Promise<void>; duplicate: (game: SavedGame) => Promise<void>; approve: () => void
}
const initial = templateGame('balloons')
const version = (config: GameConfig, label: string): Version => ({ config, label, time: new Date().toISOString() })
export const useStudio = create<StudioState>((set, get) => ({
  attachExperimental: game => {
    const state = get(), config = gameSchema.parse({ ...state.config, name: game.name, experimental: game, ...(game.design?{players:game.design.accessibility.players,theme:game.design.theme,seated:true,scoring:false}:{}) })
    const versions = [...state.versions.slice(0, state.cursor + 1), version(config, 'Generated experimental mechanic')].slice(-100)
    set({ config, versions, cursor: versions.length - 1, revision: state.revision + 1, dirty: true, approved: false })
  },
  config: initial, versions: [version(initial, 'Created activity')], cursor: 0, photos: [], revision: 0, dirty: true, approved: false, games: [],
  change: (patch, label) => {
    const state = get(); const config = applyPatch(state.config, patch)
    const versions = [...state.versions.slice(0, state.cursor + 1), version(config, label)].slice(-100)
    set({ config, versions, cursor: versions.length - 1, revision: state.revision + 1, dirty: true, approved: false })
  },
  newGame: template => { const config = templateGame(template); set(s => ({ config, versions: [version(config, 'Created activity')], cursor: 0, photos: [], revision: s.revision + 1, dirty: true, approved: false })) },
  open: record => { const game = recordSchema.parse(record); set(s => ({ config: game.config, versions: game.versions, photos: game.photos, cursor: Math.min(game.cursor, game.versions.length - 1), revision: s.revision + 1, dirty: false, approved: false })) },
  travel: cursor => { const state = get(); if (!state.versions[cursor]) return; set({ cursor, config: state.versions[cursor].config, revision: state.revision + 1, dirty: true, approved: false }) },
  setPhotos: photos => { recordSchema.shape.photos.parse(photos); set(s => ({ photos, revision: s.revision + 1, dirty: true, approved: false })) },
  approve: () => set({ approved: true }),
  save: async () => {
    const state = get(); const revision = state.revision
    const record = recordSchema.parse({ id: state.config.id, config: state.config, versions: state.versions, cursor: state.cursor, photos: state.photos, updated: new Date().toISOString() })
    await storageOperation('readwrite', store => store.put(record))
    if (get().revision === revision) set({ dirty: false })
    await get().load()
  },
  load: async () => { const records = await storageOperation<unknown[]>('readonly', store => store.getAll()); const games = records.map(record => recordSchema.parse(record)); set({ games: games.sort((a, b) => b.updated.localeCompare(a.updated)) }) },
  remove: async id => { await storageOperation('readwrite', store => store.delete(id)); await get().load() },
  duplicate: async game => {
    const config = { ...game.config, id: crypto.randomUUID(), name: `${game.config.name.slice(0, 70)} (copy)` }
    const record = { id: config.id, config, versions: [version(config, 'Duplicated activity')], cursor: 0, photos: game.photos, updated: new Date().toISOString() }
    await storageOperation('readwrite', store => store.put(recordSchema.parse(record))); await get().load()
  },
}))
