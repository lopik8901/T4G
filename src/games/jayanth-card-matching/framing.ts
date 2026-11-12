export type Framing={x:number;y:number}
export const defaultFraming:Framing={x:.5,y:.25}
/** CSS object-position acts before scaleX(-1), so horizontal pan is mirrored too. */
export function videoPoint(point:{x:number;y:number},videoWidth:number,videoHeight:number,width:number,height:number,fit:'cover'|'contain',framing:Framing={x:.5,y:.5}){
 const scale=(fit==='cover'?Math.max:Math.min)(width/videoWidth,height/videoHeight)
 return {x:(1-point.x)*videoWidth*scale+(width-videoWidth*scale)*(1-framing.x),y:point.y*videoHeight*scale+(height-videoHeight*scale)*framing.y}
}
export function sensorPoint(point:{x:number;y:number},videoWidth:number,videoHeight:number,width:number,height:number,fit:'cover'|'contain',framing:Framing={x:.5,y:.5}){
 const scale=(fit==='cover'?Math.max:Math.min)(width/videoWidth,height/videoHeight)
 return {x:1-(point.x-(width-videoWidth*scale)*(1-framing.x))/(videoWidth*scale),y:(point.y-(height-videoHeight*scale)*framing.y)/(videoHeight*scale)}
}
