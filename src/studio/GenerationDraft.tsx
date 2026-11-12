import { FileCode2, ShieldCheck } from 'lucide-react'
import type { GenerationReport } from '../engine/generation'

export function GenerationDraft({ report, download }: { report: GenerationReport; download: string }) {
  if(report.previewAvailable)return <section className="cp-generation-draft cp-generation-ready" aria-label="New mechanic development draft">
    <div><ShieldCheck size={21}/><h2>Your activity is ready to try.</h2></div>
    <p>{report.design?.objective??report.name} {report.design?.lifecycle.mode==='rounds'?`${report.design.lifecycle.rounds} short rounds, with Play Again.`:''}</p>
    <p className="cp-caption">Experimental activity. Preview before launch.</p>
    <details><summary>Design and validation details</summary>
      <p>Experimental playable preview. Staff approval does not promote this code into the shared library.</p>
      <p>{report.attempts} authoring attempts; {report.validation?.testCount??0} generated tests passed in isolation.</p>
      <p>{report.plan.summary}</p>
      {report.discovery&&<ul>{report.discovery.map((item,i)=><li key={`${item.requirementId}-${i}`}><strong>{item.decision}: {item.selected??'new implementation'}</strong><p>{item.reason}</p></li>)}</ul>}
      {report.quality&&<p>Design checks: {report.quality.passed?'passed':'needs repair'}. Automated screenshot review: not performed.</p>}
      {!!report.quality?.warnings?.length&&<><p>Preview suggestions:</p><ul>{report.quality.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></>}
      <p>Review comfort, tracking and replay before residents play. External catalog entries are not installed automatically.</p>
      <a href={download} download>Download developer draft</a>
    </details>
  </section>
  return <section className="cp-generation-draft" aria-label="New mechanic development draft">
    <div><FileCode2 size={22} /><h2>{['static_failed','runtime_failed'].includes(report.status) ? 'The new mechanic needs more work.' : report.previewAvailable ? 'Your experimental preview is ready.' : 'Your new mechanic has been drafted.'}</h2></div>
    <p><strong>{report.name}</strong> · {report.attempts} authoring {report.attempts === 1 ? 'attempt' : 'attempts'}</p>
    <p>{report.summary}</p>
    {report.design&&<p><strong>{report.design.objective}</strong> {report.design.lifecycle.mode==='rounds'?`${report.design.lifecycle.rounds} short rounds, with Play Again.`:report.design.lifecycle.mode==='open-ended'?'Open-ended play, with restart.':'A complete activity, with Play Again.'}</p>}
    {report.discovery&&<details><summary>Component choices</summary><ul>{report.discovery.map((item,i)=><li key={`${item.requirementId}-${i}`}><strong>{item.decision}: {item.selected??'new implementation'}</strong><p>{item.reason}</p></li>)}</ul><p>External repositories are evaluated references. They are not installed or executed automatically.</p></details>}
    {report.quality&&<p>Design checks: {report.quality.passed?'passed':'needs repair'}. Screenshot review: not performed by the automated text-only reviewer.</p>}
    <p><ShieldCheck size={16} /> This is a developer draft, not a playable activity. Your existing game is unchanged.</p>
    <details><summary>What was prepared</summary><p>{report.plan.summary}</p><h3>Components to reuse</h3><ul>{report.plan.reuse.map(item => <li key={item}>{item}</li>)}</ul><h3>New mechanics</h3><ul>{report.plan.missing.map(item => <li key={item}>{item}</li>)}</ul><h3>Checks</h3><ul><li>Validation feedback: {report.diagnostics.length ? 'needs repair' : 'passed'}</li><li>Generated unit tests: {report.testsExecuted ? `${report.validation?.testCount ?? 0} passed in isolation` : 'authored, not executed'}</li><li>Isolated runtime and preview bundle: {report.previewAvailable ? 'validated; try the preview below' : 'unavailable'}</li><li>Shared-library promotion: not approved</li></ul>{report.diagnostics.length > 0 && <pre>{report.diagnostics.join('\n')}</pre>}<a className="cp-button cp-button-outline" href={download} download>Download developer draft</a><p className="cp-caption">{report.previewAvailable ? 'Review comfort, collisions and tracking loss before residents play.' : 'A developer must configure isolated validation and review this source before it can run.'} Staff approval does not approve code for the shared library.</p></details>
  </section>
}
