import { mapToMirror, type Point } from '../../game/logic.ts'
import { calibratePoint, type Calibration } from './assistance.ts'
// Viewport-cover mapping retained for the Home/menu reach coordinate system.
// The centred gameplay preview uses contained-video geometry in useHandPointer.
export function mapHand(point:Point, videoWidth:number, videoHeight:number, width:number, height:number, aligned:boolean, calibration:Calibration) {
  const raw=mapToMirror(point,videoWidth,videoHeight,width,height)
  return {raw,point:aligned?raw:calibratePoint(raw,calibration)}
}
