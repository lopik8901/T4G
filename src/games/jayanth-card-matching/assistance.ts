export type Calibration = { centerX: number; centerY: number; reach: number }
export const defaultCalibration: Calibration = { centerX: 0.5, centerY: 0.5, reach: 1.45 }
export function calibratePoint(point: { x: number; y: number }, calibration: Calibration) {
  return { x: Math.max(0.015, Math.min(0.985, (point.x - calibration.centerX) * calibration.reach + 0.5)),
    y: Math.max(0.015, Math.min(0.985, (point.y - calibration.centerY) * calibration.reach + 0.5)) }
}
