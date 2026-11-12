> Historical static-authoring milestone. The subsequent Docker/build/preview implementation and current blockers are documented in [ISOLATED-PREVIEW.md](ISOLATED-PREVIEW.md).

> Historical static-authoring milestone. The subsequent Docker/build/preview implementation and current blockers are documented in [ISOLATED-PREVIEW.md](ISOLATED-PREVIEW.md).

# Generated-mechanic development workflow

## What works now

This is the **development-only fallback** described in the supplied brief, not a fully autonomous game-execution service. Existing games and ordinary AI configuration changes continue to use the trusted preview. Requests for missing mechanics trigger a genuine Codex planning and source-authoring workflow. Nothing is hardcoded to the Butterfly Garden prompt.

1. The existing configuration agent first checks whether the trusted engine can represent the request.
2. If it cannot, the backend starts an asynchronous quarantined job. Staff see real job stages rather than simulated loading steps.
3. The planning role receives component metadata, current configuration and staff text. It identifies reusable components, missing mechanics and acceptance criteria.
4. The authoring role receives the stable engine contract and produces `mechanic.ts`, `tests.ts`, and asset descriptions as structured text. Tools remain disabled. It cannot modify the application checkout or run its output.
5. The backend writes fixed filenames beneath a server-generated UUID. Model-provided identifiers are never filesystem paths.
6. A pinned TypeScript 5.9 compiler API parses and type-checks source, tests and an interface compatibility harness. Readable files are limited to those in-memory inputs and trusted compiler standard-library declarations. No generated `tsconfig`, package, build script, import or test is executed. Imports are restricted to the contract and mechanic module.
7. Diagnostics go back to the author for at most **three total attempts**. This loop repairs compile/interface problems only, not runtime or gameplay failures.
8. The proposal is hashed and persisted. A successful compiler result is labelled **awaiting isolation**, not playable or safe. A failed result is labelled **static failed**. Staff can download the draft for a developer.

`server/generation/pipeline.ts` separates planning, authoring and validation contracts using a single Codex provider. It does not spawn a theatrical collection of unrelated agents. `src/engine/contract.ts` separates input, entity state, behavior lifecycle and outcomes. Rendering/camera/audio remain owned by trusted host code. `AssetProvider` is an adapter interface; no image/audio generation provider has been invented or enabled.

## Start and inspect

Use the normal Node setup and signed-in Codex CLI:

```sh
npm install
codex login status
npm run dev
```

Use `CAREPLAY_AI_PROVIDER=codex` and `CAREPLAY_DEMO=false` if you have an `.env`. The development server must be restarted after backend changes. Submit the Butterfly Garden request in the wizard. Ordinary representable requests open the existing editor; missing mechanics instead produce a development draft card. No substitute template is falsely presented as the requested game.

Endpoints are loopback-only and retain the existing host/origin checks:

- `GET /api/components`: trusted component metadata and execution availability.
- `POST /api/agent`: existing configuration result or `202 {pendingJob}`.
- `GET /api/generation/:id`: live job stage and final report.
- `GET /api/generation/:id/bundle`: downloadable JSON developer draft, never executable browser content.

One generation job runs at a time. The latest 50 job summaries are retained in process memory. Completed source/plan/report files remain under `.careplay/proposals/<uuid>/`, excluded from Git. Browser job download links last for the server session; after restart a developer can inspect the persisted proposal files directly. The frontend stops polling after nine minutes; a backend request has a two-minute limit per model call and at most four planning/authoring calls per proposal. No external dependency installation is permitted during generation.

## Execution is deliberately unavailable

No Docker, Podman or working WSL runtime was found on the development laptop. There is **no environment flag that silently enables untrusted host execution**. `server/generation/sandbox.ts` defines the deployment-owned `IsolatedValidator` interface and the evidence required for preview. It is not a working sandbox adapter.

A future execution provider must enforce restricted filesystem and network, no inherited credentials, explicit tool/dependency allowlists, timeouts, CPU/memory/process limits, and artifact immutability. It must independently run generated tests, tracking-loss cases, accessibility checks and real preview integration tests. A TypeScript check, Node subprocess, VM context or iframe alone does not establish this boundary. CLI authentication remains in the trusted authoring adapter and must never be mounted into a generated-code validator.

Before a generated module can enter an experimental preview, its exact source hash must match isolated validation evidence, including runtime, tracking-loss and accessibility results. Shared-library promotion additionally requires **developer approval**. Staff suitability approval does not grant code promotion. No generation proposal is automatically imported into Vite, the backend, the registry or a webcam-enabled preview.

## Reproducible benchmark commands

These consume the signed-in account's Codex allowance and generate source; they do **not** run generated code:

```sh
npx tsx scripts/benchmark-generation.ts butterfly
npx tsx scripts/benchmark-generation.ts fishing
npx tsx scripts/benchmark-generation.ts circles
```

The prompts cover hand-following/flowers, fish/pond guidance, and novel circle recognition. Outputs are stored under `.careplay/benchmarks/<uuid>/` with plan, source, authored tests, diagnostics and source hash. Inspect their reports to distinguish a compiler pass from runtime evidence.

To test design-time reuse of an existing generated guidance proposal without changing its source:

```sh
npx tsx scripts/benchmark-reuse.ts <proposal-uuid>
```

This asks Codex for fish/pond parameters and tests against the **identical original source**, then type-checks that pairing. The result records source reuse and its hash. It does not prove the fishing behavior works at runtime and does not promote the candidate to the trusted registry.

## Verification and remaining work

`npm test` covers contract checks, invalid interfaces/imports, bounded repairs, persisted source hashes, no module execution during static validation, tracking snapshot expiry, and promotion/preview gates. `tests/generation-draft.spec.ts` uses deterministic HTTP fixtures to verify staff see progress and a non-playable draft; it is explicitly not a live model test. Existing game/creation/persistence browser tests remain in the suite.

Still required for the original autonomous success criterion: a deployed isolation provider, runtime test/repair loop, a trusted preview artifact renderer, controlled input forwarding, approved generated-version persistence, developer promotion tooling, and physically verified butterfly/fishing/air-drawing gameplay. This iteration must not be reported as satisfying those steps.
