import { Component, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { HandFrame } from '../camera/useMirror'
import { balloonRadius, colorNames, colors, mapToMirror, overlaps, popBalloon, stepWorld, type Balloon, type Settings, type World } from './logic'

export type Pop = { id: number; x: number; y: number; points: number; color: string }
type Props = {
  world: RefObject<World>; hands: RefObject<HandFrame>; settings: Settings
  playing: boolean; preview: boolean; reducedMotion: boolean; onPop: (pop: Pop) => void
  onStep?: (seconds: number, missedBalloons: number) => boolean
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="graphics-error" role="alert">3D graphics could not start. Enable hardware acceleration in Chrome or Edge, then reload.</div> : this.props.children
  }
}

function BalloonMesh({ balloon, radius, world }: { balloon: Balloon; radius: number; world: RefObject<World> }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const knot = useRef<THREE.Mesh>(null)
  const { size } = useThree()
  const string = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const t = i / 19
    return new THREE.Vector3(Math.sin(t * 6) * 0.11, -1.3 - t * 1.05, 0)
  }), [])
  useFrame(() => {
    if (!group.current) return
    const visible = balloon.readyAt <= world.current.time
    group.current.visible = visible
    group.current.position.set((balloon.x - 0.5) * size.width, (0.5 - balloon.y) * size.height, 0)
    group.current.rotation.z = Math.sin(world.current.time * 0.5 + balloon.phase) * 0.045
    for (const mesh of [body.current, knot.current]) {
      if (mesh) (mesh.material as THREE.MeshPhysicalMaterial).color.set(colors[balloon.color])
    }
  })
  return <group ref={group}>
    <group scale={radius}>
      <mesh ref={body} scale={[1, 1.24, 0.86]}>
        <sphereGeometry args={[1, 36, 28]} />
        <meshPhysicalMaterial color={colors[balloon.color]} roughness={0.2} metalness={0.05} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      <mesh ref={knot} position={[0, -1.27, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.115, 0.16, 12]} />
        <meshPhysicalMaterial color={colors[balloon.color]} roughness={0.3} />
      </mesh>
      <Line points={string} color="#79938b" lineWidth={1.15} transparent opacity={0.58} />
      <mesh position={[-0.33, 0.49, 0.7]} rotation={[0, -0.3, -0.4]} scale={[0.11, 0.27, 0.025]}>
        <sphereGeometry args={[1, 16, 16]} /><meshBasicMaterial color="white" transparent opacity={0.63} />
      </mesh>
    </group>
  </group>
}

function HandRing({ index, hands }: { index: number; hands: RefObject<HandFrame> }) {
  const ring = useRef<THREE.Group>(null)
  const { size } = useThree()
  useFrame(() => {
    const frame = hands.current
    const hand = frame.hands[index]
    if (!ring.current) return
    ring.current.visible = !!hand && performance.now() - frame.time < 280
    if (!hand) return
    const point = mapToMirror(hand.center, frame.width, frame.height, size.width, size.height)
    ring.current.position.set((point.x - 0.5) * size.width, (0.5 - point.y) * size.height, 120)
    for (const child of ring.current.children) {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.color.set(hand.closed ? '#ffd46b' : '#e9ffd0')
    }
  })
  return <group ref={ring}>
    <mesh><ringGeometry args={[23, 27, 48]} /><meshBasicMaterial color="#e9ffd0" transparent opacity={0.85} depthTest={false} /></mesh>
    <mesh><ringGeometry args={[27, 35, 48]} /><meshBasicMaterial color="#e9ffd0" transparent opacity={0.16} depthTest={false} /></mesh>
  </group>
}

function Scene(props: Props & { targets: RefObject<(HTMLButtonElement | null)[]> }) {
  const { world, hands, settings, playing, preview, reducedMotion, onPop } = props
  const { size } = useThree()
  const radius = balloonRadius(size.width, size.height, settings.size)
  const lastHandFrame = useRef(0)
  const wasPlaying = useRef(playing)
  useFrame((_, delta) => {
    const justStarted = playing && !wasPlaying.current
    wasPlaying.current = playing
    const frame = hands.current
    const newHandFrame = frame.time !== lastHandFrame.current
    // Consume frames while paused too, so a paused grab cannot pop on resume.
    lastHandFrame.current = frame.time

    let active = playing
    if (active) {
      const missedBalloons = stepWorld(world.current, delta, settings, reducedMotion, size.width / size.height)
      // The clock uses real active time; movement separately caps large frame jumps.
      if (props.onStep?.(delta, missedBalloons)) active = false
    }
    world.current.balloons.forEach((balloon, i) => {
      const target = props.targets.current[i]
      if (!target) return
      target.style.display = active && i < settings.count && balloon.readyAt <= world.current.time && balloon.x > 0 && balloon.x < 1 && balloon.y > 0 && balloon.y < 1 ? 'block' : 'none'
      target.style.left = `${balloon.x * 100}%`
      target.style.top = `${balloon.y * 100}%`
      target.style.width = `${radius * 2}px`
      target.style.height = `${radius * 2.48}px`
      target.setAttribute('aria-label', `Pop ${colorNames[balloon.color]} balloon (+${balloon.color === 0 ? 3 : 1})`)
    })
    if (!active || justStarted || preview || !newHandFrame || performance.now() - frame.time > 280) return
    for (const hand of frame.hands) {
      if (!hand.justClosed) continue
      const point = mapToMirror(hand.center, frame.width, frame.height, size.width, size.height)
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) continue

      // One closure pops only the nearest overlapping balloon.
      const balloon = world.current.balloons.slice(0, settings.count)
        .filter(balloon => balloon.readyAt <= world.current.time && overlaps(point, balloon, radius, size.width, size.height, settings.sensitivity))
        .sort((first, second) => (
          Math.hypot((first.x - point.x) * size.width, (first.y - point.y) * size.height)
          - Math.hypot((second.x - point.x) * size.width, (second.y - point.y) * size.height)
        ))[0]
      if (!balloon) continue
      const score = popBalloon(world.current, balloon)
      if (score) onPop({ id: performance.now() + balloon.id, x: balloon.x, y: balloon.y, points: score, color: colors[balloon.color] })
    }
  }, -1)
  return <>
    <OrthographicCamera makeDefault position={[0, 0, 1000]} near={1} far={2000} zoom={1} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[-300, 500, 700]} intensity={3.4} />
    <directionalLight position={[400, -200, 400]} color="#c8e6ff" intensity={1.2} />
    {world.current.balloons.slice(0, settings.count).map(balloon => <BalloonMesh key={balloon.id} balloon={balloon} radius={radius} world={world} />)}
    {settings.indicators && Array.from({ length: settings.hands }, (_, i) => <HandRing key={i} index={i} hands={hands} />)}
  </>
}

export function BalloonScene(props: Props) {
  const targets = useRef<(HTMLButtonElement | null)[]>([])
  const pop = (index: number) => {
    if (!props.playing || !props.preview) return
    const balloon = props.world.current.balloons[index]
    const points = popBalloon(props.world.current, balloon)
    if (points) props.onPop({ id: performance.now() + balloon.id, x: balloon.x, y: balloon.y, points, color: colors[balloon.color] })
  }
  return <SceneBoundary><Canvas className="balloon-canvas" dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} fallback={<div className="graphics-error">This game needs WebGL. Please use Chrome or Edge with hardware acceleration enabled.</div>}>
    <Scene {...props} targets={targets} />
  </Canvas><div className="balloon-targets" aria-hidden={!props.preview}>{Array.from({ length: props.settings.count }, (_, i) => <button key={i} ref={node => { targets.current[i] = node }} className="balloon-hit" style={{ display: 'none' }} disabled={!props.preview} onClick={() => pop(i)} aria-label={`Pop ${colorNames[i % 5]} balloon`} />)}</div></SceneBoundary>
}

export function PopEffects({ pops, reducedMotion }: { pops: Pop[]; reducedMotion: boolean }) {
  return <div className="effects-layer" aria-hidden="true">{pops.map(pop => <div key={pop.id} className={`pop-effect ${pop.points === 3 ? 'special-pop' : ''}`} style={{ left: `${pop.x * 100}%`, top: `${pop.y * 100}%` }}>
    <span className="pop-points">+{pop.points}</span>
    {!reducedMotion && <>
      {pop.points === 3 && <i className="shockwave" />}
      {Array.from({ length: pop.points === 3 ? 14 : 8 }, (_, i) => {
        const angle = i * 2.39996
        const distance = (pop.points === 3 ? 90 : 60) + i * 2
        return <i key={i} className="particle" style={{ background: colors[i % 5], '--x': `${Math.cos(angle) * distance}px`, '--y': `${Math.sin(angle) * distance}px`, '--rotation': `${i * 53}deg` } as React.CSSProperties} />
      })}
    </>}
  </div>)}</div>
}
