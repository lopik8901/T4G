let context: AudioContext | undefined
export function unlockSound() {
  try {
    context ??= new AudioContext()
    void context.resume().catch(() => {})
  } catch { /* Audio is optional when unavailable. */ }
}
export function playPop(points: number, volume: number) {
  if (!context || context.state !== 'running' || volume === 0) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(points === 3 ? 520 : 650, now)
  oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.16)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume * 0.16, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.22)
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
}
