# Persistent components implementation

Preserve AI_workflow, existing games/proposals, Designer/Planner/Author and worker/container boundaries. No five-game benchmark and no dependency addition.

Architecture audit: src/engine/registry.ts is a static developer-owned metadata list. server/generation/discovery.ts performs synchronous capability retrieval. Generated code/tests/scenes live only in quarantined proposal folders; approved artwork is hardcoded SVG. Runtime helpers are reusable, but full generated games should not be promoted wholesale.

Implement separate immutable payload objects and versioned metadata in .careplay/components. Status candidate -> validated -> approved, or rejected. Candidate reuse revalidates inside Docker. Pin source bytes and visual definitions in immutable game artifacts. Only developer CLI can approve; staff launch remains unrelated. API lists metadata and starts/polls component jobs. No host generated-code loading.

Verification: registry unit tests (including fresh process), schema hostility tests, exact module linking in Docker, two live component examples (ordered selection and autonomous wandering), different wording/kinds/parameters without author calls, one optional visual example, small real preview smoke, preserved sorting/feeding artifacts, updated prompts/security/evidence. Report actual blockers rather than substitute trusted fixtures for model evidence.

- [x] Audit and interfaces
- [x] Persistence/discovery/versioning/promotion implementation
- [x] Component author and isolated module linker
- [x] Declarative visual schema and trusted renderer
- [x] Real examples and preview/regressions
- [x] Documentation/evidence and final checks
