/** Generated code runs only in a worker inside an opaque-origin, script-only iframe. */
export function isolatedFrame(bundle: string, scene: unknown, runtimeCore: string, seed = 1) {
  const worker = `${runtimeCore.replace(/^export /gm, '')}\n${bundle}
let context, mechanic, sceneDefinition;
onmessage = ({data}) => {
  try {
    if(data.init) {
      sceneDefinition=data.init;context=createGameContext(sceneDefinition,${seed});
      mechanic=CarePlayMechanic.createMechanic(Object.fromEntries(sceneDefinition.parameters.map(p=>[p.key,p.value])));
      mechanic.setup(context);
    } else {
      context.sound=false;
      if(data.control==='restart-round')context.runtime.restartRound();
      else {
        context.input=data.input;const dt=Math.min(.1,Math.max(0,data.delta));
        context.runtime.start();context.runtime.tick(dt);
        if(!sceneDefinition.lifecycle||context.runtime.state.phase==='playing')mechanic.update(context,dt);
      }
    }
    if(context.entities.length>64)throw Error('Entity limit');
    postMessage(snapshotContext(context,!!sceneDefinition.lifecycle));
  } catch(e){postMessage({error:'Mechanic failed'});}
};`;
  // JSON is escaped before embedding in an HTML script; source never becomes iframe DOM.
  const payload = JSON.stringify({ worker, scene }).replace(/</g, '\\u003c')
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; base-uri 'none'; form-action 'none'"><script>
const payload=${payload}; let port, worker, timer, waiting=true, stopped=false;
const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);worker?.terminate();port?.postMessage({error:'Preview stopped: execution timeout or invalid response.'});};
onmessage=e=>{
  if(e.source!==parent||port||!e.ports[0])return;
  port=e.ports[0]; const url=URL.createObjectURL(new Blob([payload.worker],{type:'text/javascript'}));
  worker=new Worker(url); URL.revokeObjectURL(url);
  worker.onmessage=e=>{if(stopped)return;if(!waiting||JSON.stringify(e.data).length>24000){stop();return;}waiting=false;clearTimeout(timer);port.postMessage(e.data);};
  worker.onerror=stop;
  port.onmessage=e=>{if(e.data?.shutdown){stop();port.close();return;}if(stopped||waiting)return;waiting=true;timer=setTimeout(stop,500);worker.postMessage(e.data);};
  timer=setTimeout(stop,1500);worker.postMessage({init:payload.scene});
};<\/script>`
}
