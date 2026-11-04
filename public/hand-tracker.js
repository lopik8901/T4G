// MediaPipe's WASM loader requires a classic worker so its script globals are shared.
importScripts('/mediapipe/vision_bundle.js')
let landmarker
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const vision = await Vision.FilesetResolver.forVisionTasks(`${data.base}/mediapipe/wasm`)
      landmarker = await Vision.HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${data.base}/mediapipe/hand_landmarker.task`, delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: data.hands,
        minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45, minTrackingConfidence: 0.45,
      })
      self.postMessage({ type: 'ready' })
    } catch (error) {
      console.error('Hand tracker initialization failed:', error)
      self.postMessage({ type: 'error', message: 'Hand tracking could not load. Please reload and try again.' })
    }
  } else if (data.type === 'frame' && landmarker) {
    try {
      const result = landmarker.detectForVideo(data.frame, data.time)
      self.postMessage({ type: 'hands', hands: result.landmarks, time: data.time })
    } catch (error) {
      console.error('Hand tracker inference failed:', error)
      self.postMessage({ type: 'error', message: 'Hand tracking stopped. Please reconnect the camera.' })
    } finally {
      data.frame.close()
    }
  }
}
