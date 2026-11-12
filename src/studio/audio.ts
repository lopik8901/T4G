import { Howl } from 'howler'

function wave(seconds: number, music: boolean) {
  const rate = 16000, count = rate * seconds, bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes)
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true)
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * 2, true)
  for (let i = 0; i < count; i++) {
    const t = i / rate
    const signal = music ? (Math.sin(t * Math.PI * 2 * 220) + Math.sin(t * Math.PI * 2 * 275) + Math.sin(t * Math.PI * 2 * 330)) / 3 * Math.sin(Math.PI * t / seconds) ** 2 * 0.1 : Math.sin(2 * Math.PI * (620 * t - 800 * t * t)) * Math.exp(-t * 22) * Math.min(1, t * 100) * 0.25
    view.setInt16(44 + i * 2, signal * 32767, true)
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
}
export function activityAudio() {
  const popUrl = wave(0.22, false), musicUrl = wave(8, true)
  const pop = new Howl({ src: [popUrl], format: ['wav'], volume: 0.25 })
  const music = new Howl({ src: [musicUrl], format: ['wav'], loop: true, volume: 0.12 })
  return {
    pop: (volume: number) => { pop.volume(volume); pop.play() },
    music: (enabled: boolean, volume: number) => { music.volume(volume * 0.45); if (enabled && !music.playing()) music.play(); if (!enabled) music.pause() },
    dispose: () => { pop.unload(); music.unload(); URL.revokeObjectURL(popUrl); URL.revokeObjectURL(musicUrl) },
  }
}
