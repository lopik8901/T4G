/** Implementations are deployment-owned. No arbitrary command/path comes from model output. */
export type ValidationEvidence = {
  sourceHash: string; isolated: boolean; typecheckPassed: boolean; testsPassed: boolean;
  runtimePassed: boolean; trackingLossPassed: boolean; accessibilityPassed?: boolean; artifactHash: string
}
export interface IsolatedValidator {
  id: string
  capabilities: { filesystemRestricted: boolean; networkRestricted: boolean; secretsExcluded: boolean; timeLimitMs: number; memoryLimitMb: number; processLimit: number }
  validate(jobId: string, sourceHash: string): Promise<ValidationEvidence>
}
export const sandboxAvailability = {
  available: false as const,
  reason: 'Isolated code execution is not configured. Generated source can be drafted and type-checked, but cannot run or become a playable game yet.',
  required: ['Restricted filesystem', 'Network denied', 'No credentials', 'CPU/memory/process limits', 'Timeouts', 'Trusted fixed build tools', 'Behavior and browser integration evidence'],
}
export function mayPreview(evidence: ValidationEvidence, expectedHash: string) {
  // Suitability/accessibility review remains a staff launch gate, not a claim inferred from execution.
  return evidence.sourceHash === expectedHash && evidence.isolated && evidence.typecheckPassed && evidence.testsPassed && evidence.runtimePassed && evidence.trackingLossPassed && !!evidence.artifactHash
}
