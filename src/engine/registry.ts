export type ComponentMetadata = { id: string; version: number; description: string; capabilities: string[]; trust: 'trusted' | 'experimental'; kind?:string; quality?:number; execution?:'sdk'|'host'; source?:string }
/** Trusted registrations are developer-owned; model output cannot register executable code. */
export const componentRegistry: readonly ComponentMetadata[] = [
  {id:'game-runtime',version:2,description:'Data-only lifecycle, progress, seeded shuffle, overlap and smooth following through ./runtime.',capabilities:['lifecycle','rounds','progress','completion','replay','round-restart','geometry','seeded-randomness','shuffle','overlap','follow-hand'],trust:'trusted',kind:'lifecycle',quality:5,execution:'sdk',source:'sandbox/runtime-core.mjs'},
  {id:'illustrated-local-assets',version:1,description:'Approved illustrated fruit, labelled baskets, fish, food, flowers, butterflies and bubbles, with scalable targets and labels; no URLs or paid provider.',capabilities:['fruit-art','basket-art','fish-art','food-art','flower-art','butterfly-art','bubble-art','2d-illustrations','large-targets','large-labels','gentle-animation'],trust:'trusted',kind:'visual',quality:5,execution:'sdk',source:'src/studio/ExperimentalPreview.tsx'},
  {id:'trusted-game-hud',version:2,description:'Trusted objective, shared progress, round/completion feedback and replay controls; consume runtime state without importing React into generated code.',capabilities:['progress','round-progress','completion-feedback','large-labels','gentle-transitions','replay-controls'],trust:'trusted',kind:'visual',quality:5,execution:'host',source:'src/studio/ExperimentalPreview.tsx'},
  { id: 'mirror-hand-input', version: 1, description: 'Local mirrored, cropped and smoothed hand landmarks. Stale frames expire.', capabilities: ['hand-position', 'smoothing', 'multiple-hands', 'tracking-loss'], trust: 'trusted' },
  { id: 'local-sound-input', version: 1, description: 'Local RMS sound detection with cooldown.', capabilities: ['sound-threshold'], trust: 'trusted' },
  { id: 'floating-objects', version: 1, description: 'Gentle multi-directional movement.', capabilities: ['float', 'respawn'], trust: 'trusted' },
  { id: 'overlap-interaction', version: 1, description: 'Generous normalized contact zones.', capabilities: ['hand-overlap'], trust: 'trusted' },
  { id: 'reveal-and-grow', version: 1, description: 'Fixed contact outcomes for current garden and memory activities.', capabilities: ['contact-growth', 'gradual-photo-reveal'], trust: 'trusted' },
  { id: 'local-art', version: 1, description: 'Existing balloon, seed, flower, butterfly, fruit and photo SVG/3D assets. No external generation API configured.', capabilities: ['existing-art'], trust: 'trusted' },
]
export function validatePromotion(evidence: { sourceHash: string; validatedHash: string; isolated: boolean; runtimePassed: boolean; developerApproved: boolean }) {
  return evidence.sourceHash === evidence.validatedHash && evidence.isolated && evidence.runtimePassed && evidence.developerApproved
}
