/** Serializable data is the only boundary between tracking, mechanics, and rendering. */
export type Value = string | number | boolean | null | Value[] | { [key: string]: Value }
export type Position = { x: number; y: number }
export type Entity = { id: string; kind: string; position: Position; radius: number; state: Record<string, Value>; visible: boolean; assetId?: string; label?: string }
export type LifecycleState = {phase:'ready'|'playing'|'round_complete'|'game_complete';round:number;rounds:number;progress:number;goal:number;revision:number;mode:'rounds'|'single'|'open-ended';objective:string;message:string}
export interface GameRuntime {
  state: LifecycleState
  helpers: {distance(a:Position,b:Position):number;overlap(a:Entity,b:Entity,padding?:number):boolean;follow(point:Position,target:Position,speed:number,dt:number):Position;shuffle<T>(values:readonly T[]):T[]}
  random():number
  start():void
  addProgress(amount?:number):void
  completeRound():void
  tick(dt:number):void
  restartRound():void
  replay(seed?:number):void
  snapshot():LifecycleState
}
export type InputSnapshot = {
  time: number
  hands: { id: string; position: Position }[]
  sound: boolean
  pointer: Position | null
}
export type Outcome = { type: 'sound' | 'progress' | 'spawn' | 'remove' | 'transform'; entityId: string; value: Value }
export interface MechanicContext {
  entities: Entity[]
  input: InputSnapshot
  state: Record<string, Value>
  /** Present in runtime v2; optional only for compatibility with legacy mechanics. */
  runtime?: GameRuntime
  emit(outcome: Outcome): void
}
export interface Mechanic {
  setup(context: MechanicContext): void
  update(context: MechanicContext, deltaSeconds: number): void
  dispose(context: MechanicContext): void
}
export type MechanicFactory = (parameters: Record<string, Value>) => Mechanic
export type MechanicTest = { name: string; run(): void }
export type AssetRequest = { name: string; kind: 'sprite' | 'sound'; description: string }
export interface AssetProvider {
  id: string
  available: boolean
  generate(request: AssetRequest): Promise<{ url: string; licence: string; attribution: string }>
}
