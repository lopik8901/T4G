import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point } from '../game/logic'

export type TrackedHand = { points: Point[]; center: Point }
export type HandFrame = { hands: TrackedHand[]; time: number; width: number; height: number }
export type CameraStatus = 'off' | 'requesting' | 'loading' | 'ready' | 'error'

export function useMirror(handLimit: number) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const generation = useRef(0)
  const frameRef = useRef<HandFrame>({ hands: [], time: 0, width: 640, height: 480 })
  const [status, setStatus] = useState<CameraStatus>('off')
  const [error, setError] = useState('')
  const [handCount, setHandCount] = useState(0)
  const [cameraOn, setCameraOn] = useState(false)
  const stop = useCallback(() => {
    generation.current++
    workerRef.current?.terminate()
    workerRef.current = null
    streamRef.current?.getTracks().forEach(track => { track.onended = null; track.stop() })
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    frameRef.current.hands = []
    setCameraOn(false)
    setHandCount(0)
    setStatus('off')
  }, [])

  const start = useCallback(async () => {
    stop()
    const run = generation.current
    setError('')
    setStatus('requesting')
    let timer: ReturnType<typeof setTimeout> | undefined
    const fail = (message: string) => {
      if (run !== generation.current) return
      clearTimeout(timer)
      workerRef.current?.terminate()
      workerRef.current = null
      frameRef.current.hands = []
      setHandCount(0)
      setError(message)
      setStatus('error')
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs localhost or a secure HTTPS connection.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (run !== generation.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      if (run !== generation.current) return
      setCameraOn(true)
      setStatus('loading')
      stream.getVideoTracks()[0].onended = () => {
        stop()
        setError('The camera disconnected. Check the connection and try again.')
        setStatus('error')
      }
      const worker = new Worker('/hand-tracker.js')
      workerRef.current = worker
      let busy = false
      let ready = false
      let lastVideoTime = -1
      let lastSent = 0
      let busySince = 0
      timer = setTimeout(() => fail('Hand tracking is taking too long to load. Please reconnect the camera.'), 45000)
      worker.onerror = () => fail('Hand tracking could not start in this browser. Try the latest Chrome or Edge.')
      worker.onmessage = ({ data }) => {
        if (run !== generation.current) return
        if (data.type === 'ready') {
          clearTimeout(timer)
          ready = true
          setStatus('ready')
        } else if (data.type === 'hands') {
          busy = false
          const previous = frameRef.current
          const available = new Set(previous.hands)
          const hands: TrackedHand[] = data.hands.map((landmarks: Point[]) => {
            const palm = [0, 5, 9, 13, 17].map(i => landmarks[i])
            const center = { x: palm.reduce((sum, p) => sum + p.x, 0) / 5, y: palm.reduce((sum, p) => sum + p.y, 0) / 5 }
            const closest = [...available].sort((a, b) => Math.hypot(a.center.x - center.x, a.center.y - center.y) - Math.hypot(b.center.x - center.x, b.center.y - center.y))[0]
            const old = closest && performance.now() - previous.time < 250 && Math.hypot(closest.center.x - center.x, closest.center.y - center.y) < 0.2 ? closest : undefined
            if (old) available.delete(old)
            const smooth = (p: Point, before?: Point): Point => before ? { x: before.x * 0.3 + p.x * 0.7, y: before.y * 0.3 + p.y * 0.7 } : p
            const points = [center, ...[4, 8, 12, 16, 20].map(i => landmarks[i])].map((p, i) => smooth(p, old?.points[i]))
            return { points, center: points[0] }
          })
          frameRef.current = { hands, time: data.time, width: video.videoWidth, height: video.videoHeight }
          setHandCount(hands.length)
        } else if (data.type === 'error') {
          fail(data.message)
        }
      }
      worker.postMessage({ type: 'init', base: location.origin, hands: handLimit })
      const capture = async (now: number) => {
        if (run !== generation.current || workerRef.current !== worker) return
        requestAnimationFrame(capture)
        if (busy && now - busySince > 10000) { fail('Hand tracking stopped responding. Please reconnect the camera.'); return }
        if (!ready || busy || document.hidden || now - lastSent < 80 || video.readyState < 2 || video.currentTime === lastVideoTime) return
        busy = true
        busySince = now
        lastSent = now
        lastVideoTime = video.currentTime
        try {
          const frame = await createImageBitmap(video, { resizeWidth: 640, resizeHeight: Math.round(640 * video.videoHeight / video.videoWidth) })
          if (run !== generation.current || workerRef.current !== worker) { frame.close(); return }
          worker.postMessage({ type: 'frame', frame, time: now }, [frame])
        } catch {
          fail('The camera image could not be read. Please reconnect the camera.')
        }
      }
      requestAnimationFrame(capture)
    } catch (cause) {
      if (run !== generation.current) return
      const name = cause instanceof DOMException ? cause.name : ''
      fail(name === 'NotAllowedError' ? 'Camera access is blocked. Allow the camera in your browser’s site settings, then try again.'
        : name === 'NotFoundError' ? 'No camera found. Connect a webcam, then try again.'
        : name === 'NotReadableError' ? 'The camera is in use. Close other camera apps, then try again.'
        : cause instanceof Error ? cause.message : 'The camera could not start. Please try again.')
    }
  }, [handLimit, stop])

  useEffect(() => stop, [stop])
  return { videoRef, frameRef, status, error, handCount, cameraOn, start, stop }
}
