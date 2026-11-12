# Persistent reusable components — implementation and evidence

Implemented on `AI_workflow`, 2026-11-09. This work uses two focused mechanic examples and one visual example, not a multi-game benchmark. Existing complete-game evidence remains in [DESIGN-UPGRADE-EVIDENCE.md](DESIGN-UPGRADE-EVIDENCE.md).

## Architecture and contracts

Before this change, `src/engine/registry.ts` was a static developer-owned metadata list. All generated mechanics/tests belonged to individual `.careplay/proposals/<uuid>` folders; illustrations were a fixed trusted ID set. Runtime helpers were reusable, but complete generated games were not a reusable component library.

The new registry is local disk storage under ignored `.careplay/components/`:

```text
metadata/<id>.v<version>.json  # metadata, status, evidence and review
objects/<sha256>.json         # immutable source/tests/fixture OR visual data
```

`src/engine/components.ts` defines strict schemas. A version records ID/name/description, type (mechanic, interaction, animation, visual or asset), capabilities, interactions, parameter descriptions/defaults, version/content hash, interface, inputs/outputs, dependencies, provenance/license, runtime, status, validation history, current validation evidence and explicit developer review. The hash refers to the separate payload object. Mechanics objects contain source, tests and a small fixture scene. Visual objects contain declarative illustration data. Content hashing deduplicates identical typed payloads/parameters; it is not semantic equivalence detection or deduplication of rewritten source. Names/descriptions inside a source bundle are part of its payload.

Versions are append-only for payload changes. Status/evidence metadata can change atomically. Exclusive file creation prevents version overwrite; mutations within one server process are serialized. This is a local single-server registry, not a transactional multi-writer database. Concurrent CLI/server writers can conflict and should be serialized operationally. An interrupted write can leave an orphan object; identical orphan content is recoverable, but no automatic garbage collector is included.

Interfaces:

- `careplay-mechanic-v1`: `createMechanic(parameters): Mechanic`, with setup/update/dispose and the existing data-only `MechanicContext`. Context supplies normalized hands and the trusted lifecycle SDK. Parameters select entity kinds and behavior; generated components must not depend on game titles or entity IDs.
- `careplay-svg-v1`: finite ellipse/rect/line/polygon primitives, palette tokens, state scales and none/gentle-pulse animation. At most 32 primitives, 16 points per polygon and coordinates 0–100. No SVG strings, arbitrary attributes, paths, HTML, CSS, URLs or executable callbacks. Trusted `RegisteredArt` renders the data. Parent size comes from bounded entity radius; state is idle/selected/completed/disabled. Reduced motion disables the pulse.

Standalone component dependencies are currently empty: they may use only the fixed contract and trusted runtime. Games can compose up to six pinned mechanic modules and four registered visual definitions. Transitive generated dependencies are deliberately unsupported.

## Discovery, generation and reuse

Discovery searches approved built-ins/persistent components, validated candidates, compatible adaptation/composition and approved available external entries before recommending generation. It compares structured capabilities, including canonical aliases such as `sequential-contact` → `ordered-selection` and `roaming` → `autonomous-wandering`. Name matching is not required. This is deterministic metadata retrieval, not semantic internet search. Rejected, unvalidated or stale-runtime components cannot be loaded as reusable versions.

The existing Mechanics Author now has a component-author mode (`server/components/prompts.ts`). `generateComponent` first looks for an appropriate stored version by type/capabilities, supported interactions and required parameter keys/types; a match is revalidated without calling the author. Otherwise it generates source/tests/fixture or visual data and attempts at most three repairs. Once executable tests compile and run, their source is frozen. Failed versions remain candidates with failure history, not approved components. A `revise` request pins an existing ID/version/hash and creates a new version; it does not mutate the old object. Provenance is marked `codex` only for the actual Codex author, and `developer` for injected test authors.

The normal game Designer/Planner pipeline now includes persistent discovery. Selected versions are revalidated before authoring, and the author receives exact import paths and parameter metadata. The server attaches exact source bytes as `linkedComponents`; model-provided dependency source is overwritten. Docker permits only those fixed `./component-<hash>` imports, plus the contract/runtime. The compiled artifact contains the pinned implementation. Visual IDs are `component-<hash>` with validated definitions attached by the server. The model cannot supply arbitrary visual definitions through game authoring.

Existing full-game proposals are **not** automatically promoted or extracted as reusable components. Component-level authoring initially required the developer API/CLI. Normal game creation now also prepares explicit reusable Planner tasks automatically; see [automatic-generation evidence](AUTOMATIC-COMPONENT-GENERATION-EVIDENCE.md). Developer tools remain available, and there is no staff-facing component-management UI.

## Promotion and isolation

Generated → candidate → validated → approved; any version can be rejected. Only a successful check of the exact content/runtime hash permits approval. Developer approval uses the local CLI with an exact ID/version/hash and recorded reason. There is no HTTP promotion endpoint, and staff game acceptance has no registry promotion side effect. The sample live components remain **validated**, not approved.

Even approved generated source never becomes trusted host code. Both approved and validated mechanics are revalidated inside Docker on reuse and run only in the existing worker/opaque iframe. The container network, mounts, CPU/memory/process limits and deadlines remain unchanged. The image label now fingerprints the contract, SDK, declarations and trusted harness/probes; rebuild after changing these. Syntax checks run before building the trusted image. Validation history stores bounded failures as well as successes. A failed revalidation invalidates prior approval/evidence; unavailable prerequisites prevent loading.

Hashes are integrity checks, not signatures against a laptop owner or compromised backend. Local metadata/provenance remains a developer trust boundary. Generated tests can be misleading; dedicated independent probes exist for the two example capabilities, while arbitrary future capabilities need their own meaningful acceptance tests. Schema safety does not establish artistic quality, ownership, accessibility or clinical suitability. Developers must review provenance/licensing and behavior before approval. Rejection prevents future registry loading; already compiled, pinned game artifacts are not retroactively revoked. Docker/browser residual risks remain as documented in [ISOLATED-PREVIEW.md](ISOLATED-PREVIEW.md).

## Actual component evidence

| Example | Exact successful version | Tests and outcome |
|---|---|---|
| Ordered Selection | `ordered-selection@1`, `c19f35abad83b8d6af0f332c08cd45420d5c27d352c1571ba1e93f01ad282f32` | 11 generated tests; independent ordering, wrong-order rejection, simultaneous hands, reset and deterministic simulation passed. Retrieved by `sequential-contact`, reused without an author call, then passed with `star` entities and the same implementation. |
| Autonomous Wandering | `autonomous-wandering@2`, `1274e7d578720d14d7e95a6dd119d5b3e7fd5e51634d6e56e2638b53a0c42b35` | 10 generated tests; v1 failed its negative-speed test, bounded repair passed with **identical compiled test source**. Independent deterministic movement, radius-aware boundary behavior and absent-hand operation passed. Retrieved by `roaming`, reused without an author call, then passed with `fish` entities and speed 0.2. |
| Reusable star illustration | `soft-star-art@2`, `827953d11ed85ecf17216e50d5fee8f1e26d7b93b910285cbdf39e84970e4471` | Real Codex-generated data, schema validation, trusted rendering and subsequent retrieval with `reused=true`, zero authoring attempts. First illustration was visually weak; a model revision produced a new polygon-based version, preserving v1. Screenshot inspected manually. |

No generated implementation was edited by hand. An early trusted runner syntax error (`await` inside a synchronous Promise executor) prevented execution; the harness was fixed and the original Ordered Selection draft passed unchanged. Its interrupted repair draft remains an unvalidated candidate. The final image is `sha256:38be40c654a22044d845fcf84dce16ac898948c9cf398230ca4d4f998bdb74a7`; contract/runtime/harness fingerprint is `14ec061f08a8172bb21155e98279290313f6c6b1453ac0ef7ba30ab83c292f1a`.

Local raw evidence: `artifacts/component-generation-initial.json`, `component-registry-evidence.json`, `component-visual-reuse-final.json`, registry version metadata/objects and `artifacts/component-preview.png`. These generated local files are ignored by Git. The initial evidence preserves the real wandering repair; later runs intentionally retrieve/revalidate existing source instead of spending more model calls.

## Verification results

- `npm test`: **36 passed**, five opt-in integration tests skipped. Includes fresh-process disk persistence, deduplication, immutable versions, explicit approval, rejection, runtime/parameter incompatibility, corrupted object detection, traversal rejection, hostile visual data and trusted rendering of all four states.
- Explicit real-Docker `server/component-integration.test.ts`: **3 passed** against the final image, plus the normal-linker check passed separately. Proves compiled tests cannot be weakened during component repair; existing Fruit Sorting and Fish Feeding retain full lifecycle/completion/replay checks. The normal orchestration check uses a trusted author fixture to prove discovery pins the real stored module and overwrites bogus model dependency bytes; it is not additional live AI generation evidence.
- `npm run validate:components`: passed both focused examples, alternate capability retrieval, no-author reuse, different entity kinds and parameter values. Later revalidation on the final SDK/image also passed.
- Browser checks: real complete-artifact accessibility, discovery HTTP, editor integration and opaque-origin/watchdog checks **4 passed**. Real linked wandering component + registered visual preview **passed**, including movement, iframe sandbox attribute and save. Rerun after visual v2 passed (23 seconds); screenshot inspected. One earlier invocation omitted `CAREPLAY_SANDBOX=docker` in Playwright's Node process and correctly failed closed before loading a component.
- `npm run build`: passed; the existing large BalloonScene chunk warning remains.
- API listing/discovery after server restart returned persisted versions and selected `component:ordered-selection@1` for the alternate capability. No code/payload is included in registry metadata responses.

## Commands and API

```powershell
npm run sandbox:build
npm run components -- list
npm run components -- generate scripts/component-visual-request.json
npm run components -- validate ID VERSION HASH
npm run components -- preview ID VERSION HASH
# Run only after developer source, tests, behavior and license review:
npm run components -- approve ID VERSION HASH "Reason for developer approval"
npm run components -- reject ID VERSION HASH "Reason for rejection"
npm run validate:components
```

`generate` accepts `{spec, request, revise?}`; see `scripts/component-visual-request.json` and `src/engine/components.ts`. `revise` is `{id,version,hash}`. CLI validation failures exit nonzero. A preview is a tiny fixture built with an exact module import, not a newly authored game.

The local API supports `GET /api/components` (built-in + persisted metadata), `POST /api/discovery`, `POST /api/component-jobs` (same generation request; returns a polling ID), and `GET /api/component-jobs/<id>`. Jobs are session-local; completed versions persist. Existing loopback/origin checks, JSON/request limits and concurrency restrictions apply. This is a development API, not authenticated public hosting.

For the real browser smoke, start the normal backend with Docker configured, then:

```powershell
$env:CAREPLAY_SANDBOX='docker'
$env:CAREPLAY_TEST_COMPONENTS='true'
npx playwright test tests/component-preview.spec.ts
```

No paid image service, GitHub downloads, arbitrary dependency imports or host execution was introduced. Disk retention/export/garbage collection, multi-process transactions, arbitrary SVG features and automated visual-model review remain outside this implementation. Physical webcam/resident testing remains manual.
