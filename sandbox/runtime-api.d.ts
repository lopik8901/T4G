import type { MechanicContext, GameRuntime, Value } from './contract';
export type SceneDefinition = {
  instruction?:string;
  parameters?:{key:string;value:Value}[];
  accessibility?:{maximumSpeed:number;minimumTargetRadius?:number};
  lifecycle?: {mode:'rounds'|'single'|'open-ended';rounds:number;goal:number;objective:string;completionMessage:string;layout?:'shuffle'|'fixed'};
  entities:{id:string;kind:string;x:number;y:number;radius:number;state:{key:string;value:Value}[];assetId?:string;label?:string}[];
};
export function createRuntime(definition?:SceneDefinition['lifecycle'],seed?:number):GameRuntime;
export function createGameContext(scene:SceneDefinition,seed?:number):MechanicContext & {runtime:GameRuntime;sound:boolean};
export function snapshotContext(context:MechanicContext,hasLifecycle?:boolean):unknown;
