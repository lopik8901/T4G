let context: AudioContext | undefined

export function enableAudio() {
  try {
    context ??= new AudioContext()
    void context.resume().catch(() => {})
  } catch { /* Sound is optional. */ }
}

export function playSuccess() {
  if (!context || context.state !== 'running') return
  const audio = context
  ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime + index * 0.13
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.07, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.32)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  })
}

export function stopSound() {
  const previous = context
  context = undefined
  if (previous && previous.state !== 'closed') void previous.close().catch(() => {})
}
