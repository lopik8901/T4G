export type HandLandmark = { x: number; y: number; z?: number }

// A fist curls at least three of the four fingers toward the wrist.
// The thumb is deliberately ignored, so it need not be tucked inside the fist.
export function isHandClosed(landmarks: HandLandmark[], aspectRatio = 1, previouslyClosed = false): boolean {
  if (landmarks.length !== 21) return false

  const distance = (first: HandLandmark, second: HandLandmark) => Math.hypot(
    (first.x - second.x) * aspectRatio,
    first.y - second.y,
    ((first.z ?? 0) - (second.z ?? 0)) * aspectRatio,
  )
  const wrist = landmarks[0]
  if (distance(wrist, landmarks[9]) < 0.001) return false

  // Separate thresholds prevent small tracking fluctuations from repeating a grab.
  const threshold = previouslyClosed ? 1.15 : 0.95
  const fingers = [[6, 8], [10, 12], [14, 16], [18, 20]]
  const curledFingers = fingers.filter(([joint, tip]) => (
    distance(wrist, landmarks[tip]) < distance(wrist, landmarks[joint]) * threshold
  )).length

  return curledFingers >= 3
}
