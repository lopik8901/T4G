import { useEffect, useRef, type RefObject } from 'react'
import type { HandFrame } from './useGameMirror'
import type { HandSelector } from './tracking'
import {videoPoint,type Framing} from './framing'
import { initialDwell, stepDwell } from './dwell'
import { calibratePoint, type Calibration } from './assistance'
export type HandSample = { x: number; y: number; time: number }
export function useHandPointer(options: {
  selector?: RefObject<HandSelector>; frame: RefObject<HandFrame>; enabled: boolean; rearmAnswers?:boolean; immersive:boolean; framing:Framing; aligned: boolean; scene: string; resetKey?:string; duration: number; calibration: Calibration;
  cursor: RefObject<HTMLDivElement | null>; ring: RefObject<SVGCircleElement | null>;
  sample: RefObject<HandSample | null>; onActivity: () => void
}) {
  const latest = useRef(options)
  useEffect(() => { latest.current = options })
  useEffect(() => {
    if (!options.enabled) { if (options.cursor.current) options.cursor.current.hidden = true; options.sample.current = null; return }
    let resetKey:string|undefined
    let needsRearm=false, blockedAnswer:string|null=null
    let hovered:HTMLElement|null=null
    const hover=(element:HTMLElement|null)=>{if(hovered===element)return;hovered?.removeAttribute('data-hand-hover');hovered=element;hovered?.setAttribute('data-hand-hover','true')}
    let activeHand:number|null=null
    let request = 0, cachedAt = 0, previousTime = -1, lastActivity = 0, lastScene = ''
    let bounds: { element: HTMLElement; rect: DOMRect }[] = []
    let state = initialDwell()
    let previous: { x: number; y: number } | null = null
    let activityPoint: { x: number; y: number } | null = null
    let sceneOrigin: { x: number; y: number } | null = null
    let oldProgress = -1
    const invalidate = () => { cachedAt = 0 }
    const observer = new MutationObserver(invalidate)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'open', 'hidden', 'aria-disabled'] })
    window.addEventListener('resize', invalidate); document.addEventListener('scroll', invalidate, true)
    const loop = (now: number) => {
      request = requestAnimationFrame(loop)
      const current = latest.current
      if(resetKey!==current.resetKey){hover(null);state=initialDwell();cachedAt=0;sceneOrigin=null;oldProgress=-1;resetKey=current.resetKey;needsRearm=!!current.rearmAnswers&&previous!==null}
      const cursor = current.cursor.current
      const frame = current.frame.current, hand = frame.hands[0]
      const marker=document.querySelector<HTMLElement>('[data-palm]')
      const identity=current.selector?.current.active??null
      if(identity!==activeHand){state=initialDwell();previous=null;previousTime=-1;activeHand=identity}
      if (!cursor) return
      if (!current.enabled || document.hidden || !hand || frame.width <= 0 || frame.height <= 0 || now - frame.time > 280) {
        hover(null);cursor.hidden = true; if(marker)marker.hidden=true; state = { ...state, target: null }; previous = null
        current.sample.current = null; previousTime = -1; return
      }
      // Use one sensor coordinate system on Home, in dialogs and in gameplay.
      // Preview letterboxing must never change a seated calibration.
      const raw = {x:1-hand.center.x,y:hand.center.y}
      const video=document.querySelector('video'),rect=video?.getBoundingClientRect()
      const displayed=rect?videoPoint(hand.center,frame.width,frame.height,rect.width,rect.height,current.immersive?'cover':'contain',current.immersive?current.framing:{x:.5,y:.5}):null
      const inView=!!rect&&!!displayed&&displayed.x>=0&&displayed.x<=rect.width&&displayed.y>=0&&displayed.y<=rect.height
      if(marker){marker.hidden=!inView;if(displayed){marker.style.left=`${displayed.x}px`;marker.style.top=`${displayed.y}px`}}
      current.sample.current = { ...raw, time: frame.time }
      if (raw.x < 0 || raw.x > 1 || raw.y < 0 || raw.y > 1) { hover(null);cursor.hidden = true; state = { ...state, target: null }; return }
      if(current.aligned&&!inView){hover(null);cursor.hidden=true;state={...state,target:null};return}
      const normalized=calibratePoint(raw,current.calibration)
      const point=current.aligned&&displayed&&rect?{x:rect.left+displayed.x,y:rect.top+displayed.y}:{x:normalized.x*innerWidth,y:normalized.y*innerHeight}
      // A new scene can change coordinate mapping (aligned gameplay → assisted dialog).
      // Measure deliberate movement from the NEW mapped point, never from the old scene.
      if (lastScene !== current.scene) { sceneOrigin = lastScene ? point : null; state = { ...state, target: null }; lastScene = current.scene; cachedAt = 0 }
      if (sceneOrigin && Math.hypot(point.x - sceneOrigin.x, point.y - sceneOrigin.y) > 28) sceneOrigin = null
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) > Math.min(innerWidth, innerHeight) * 0.22) state = { ...state, target: null }
      if (frame.time !== previousTime || current.aligned) {
        cursor.hidden = false
        cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
        previousTime = frame.time
      }
      previous = point
      if (!activityPoint) activityPoint = point
      if (now - lastActivity > 500 && Math.hypot(point.x - activityPoint.x, point.y - activityPoint.y) > 24) {
        current.onActivity(); lastActivity = now; activityPoint = point
      }
      if (!cachedAt || now - cachedAt > 250) {
        const scope = document.querySelector('dialog[open]') ?? document
        bounds = Array.from(scope.querySelectorAll<HTMLElement>('[data-dwell]')).filter(element => element.getClientRects().length > 0)
          .map(element => ({ element, rect: element.getBoundingClientRect() }))
        cachedAt = now
      }
      const candidates = bounds.filter(({ rect }) => point.x >= rect.left - 8 && point.x <= rect.right + 8 && point.y >= rect.top - 8 && point.y <= rect.bottom + 8)
      candidates.sort((a,b) => Math.hypot(point.x-a.rect.left-a.rect.width/2, point.y-a.rect.top-a.rect.height/2) - Math.hypot(point.x-b.rect.left-b.rect.width/2, point.y-b.rect.top-b.rect.height/2))
      const element = candidates[0]?.element
      // A palm held over a closed card across a phase boundary must leave
      // that card before it can start a fresh dwell. No extra gesture needed.
      const answer=element?.dataset.answer?element.dataset.dwell!:null
      if(needsRearm){blockedAnswer=answer;needsRearm=false}
      if(blockedAnswer&&answer!==blockedAnswer)blockedAnswer=null
      const disabled = !element || element.matches(':disabled, [aria-disabled="true"]')
      const target = !sceneOrigin && !disabled && (!blockedAnswer||answer!==blockedAnswer) ? element.dataset.dwell! : null
      hover(target&&element?.dataset.answer?element:null)
      if(target && current.selector) current.selector.current.locked = true
      const result = stepDwell(state, target, true, !!element, now, current.duration)
      state = result.state
      if (oldProgress !== result.progress) { current.ring.current?.setAttribute('stroke-dasharray', `${result.progress * 220} 220`); oldProgress = result.progress }
      if (result.selection && element?.isConnected) { current.onActivity(); element.click(); cachedAt = 0 }
    }
    request = requestAnimationFrame(loop)
    return () => { hover(null);cancelAnimationFrame(request); observer.disconnect(); window.removeEventListener('resize', invalidate); document.removeEventListener('scroll', invalidate, true); latest.current.sample.current = null }
  }, [options.enabled])
}
