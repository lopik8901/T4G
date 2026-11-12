import { useCallback, useEffect, useRef, useState } from 'react'

export function useSound(threshold: number, onSound: () => void, enabled: boolean) {
  const [active, setActive] = useState(false), [error, setError] = useState('')
  const resources = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null)
  const current = useRef({ threshold, onSound, enabled }); current.current = { threshold, onSound, enabled }
  const generation = useRef(0)
  const stop = useCallback(() => {
    generation.current++
    if (resources.current) { cancelAnimationFrame(resources.current.frame); resources.current.stream.getTracks().forEach(t => t.stop()); void resources.current.context.close(); resources.current = null }
    setActive(false)
  }, [])
  const start = async () => {
    stop(); setError(''); const run = generation.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (run !== generation.current) { stream.getTracks().forEach(t => t.stop()); return }
      const context = new AudioContext(); await context.resume()
      if (run !== generation.current) { stream.getTracks().forEach(t => t.stop()); await context.close(); return }
      const analyser = context.createAnalyser(); analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const values = new Float32Array(analyser.fftSize)
      const state = { stream, context, frame: 0 }; resources.current = state
      let last = 0, armed = true
      const read = (now: number) => {
        analyser.getFloatTimeDomainData(values)
        const level = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length)
        if (level < current.current.threshold * 0.6) armed = true
        if (current.current.enabled && armed && level > current.current.threshold && now - last > 1200) { last = now; armed = false; current.current.onSound() }
        state.frame = requestAnimationFrame(read)
      }
      state.frame = requestAnimationFrame(read); setActive(true)
      stream.getTracks()[0].onended = () => { stop(); setError('Microphone disconnected. Reconnect and try again.') }
    } catch { setError('Microphone access is unavailable. Allow it in browser settings or use hand/touch input.') }
  }
  useEffect(() => stop, [stop])
  return { active, error, start, stop }
}
