# Generation evidence — 2026-11-08

## Real Docker and browser validation — current result

**`npm run validate:autonomous` completed with exit code 0.** Both games were genuinely authored and repaired by the signed-in Codex CLI, compiled and tested inside the restricted Docker environment, and accepted by developer-owned semantic probes. No generated source was edited by hand and no fixture result was substituted.

| Case | Real proposal | Generated tests | Attempts | Independent outcome |
|---|---|---:|---:|---|
| Butterfly Garden | `ff7afc8e-0041-4f78-a1a0-2939040a7656` | 11 | 2 | Nearby-hand following, flower collision, persistent visible blooming after tracking loss, butterfly departure passed |
| Air Circle Bubbles | `215a758e-591d-4da2-afa7-9996976cfd5c` | 14 | 2 | Straight-line rejection, circle-to-bubble spawning, no repeated spawning after tracking loss passed |

The first attempts failed container validation and entered the existing bounded repair loop; second attempts passed. The final reports contain `testsExecuted=true`, `previewAvailable=true`, `developerApproved=false` and `acceptance:butterfly` / `acceptance:circles` runtime evidence. Component-library promotion remains unapproved.

Artifact SHA-256 values:

- Butterfly: `5ed33ea1fc7b76e16341eb348defbb8ad713c6ca7031919aee8272f0a4e2eae5`
- Circles: `4ab8870c9f620ff85d0e5e97fc7ee401853e6201624b00e1e2c60f074fdf2f61`

Both **unchanged** generated bundles were revalidated against final image `sha256:dadeaf1feb83c93b130d696a90f2d56f54edf6a3e50a6735ce9cd83afd7509f6`, including duplicate-ID/output-bound checks during semantic replay. Both passed. Their ignored proposal folders contain `revalidation.json`, original reports, generated source/tests/scene and preview artifacts. These are local evidence, not committed assets or cryptographic attestations of a secure system.

Both real artifacts then passed Chrome tests through the actual local artifact API and opaque worker preview. The browser tests use a synthetic video stream and controlled hand landmarks in place of MediaPipe inference; the generated game code, Docker results and artifact transport are real. Butterfly following, butterfly-to-flower blooming, bloom persistence, circle recognition, line rejection and saving were observed. Screenshots: `artifacts/generated-butterfly-live.png` and `artifacts/generated-circles-live.png` (local, ignored). Physical webcam gestures and resident suitability remain untested.

Environment diagnosis and executed commands:

- WSL lists Ubuntu and docker-desktop as running WSL2 distributions. WSL Docker reports Linux.
- The standard Program Files Docker CLI is absent. The per-user Windows CLI at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe` reports local `npipe:////./pipe/dockerDesktopLinuxEngine` and Linux. The Node adapter now discovers both install locations and adds the CLI directory to its child PATH so `docker-credential-desktop` works. No machine-wide setting, credential store or daemon network exposure was changed.
- Updated only `CAREPLAY_SANDBOX=docker`, `CAREPLAY_AI_PROVIDER=codex`, `CAREPLAY_DEMO=false` in ignored `.env`. `codex login status` reports ChatGPT sign-in; no interactive authentication was required.
- Built with native `docker build --tag careplay-validator:1 ./sandbox`; verified the reusable `npm run sandbox:build` command without manually configuring PATH.
- Node's `getSandboxStatus()` returned `available=true` and a real image ID.
- Ran `npm run validate:autonomous` successfully; additionally called `validateInDocker` for both unchanged proposal bundles against the final image.
- Ran real Chrome artifact tests with `CAREPLAY_TEST_ARTIFACTS=true npx playwright test tests/generated-artifacts.spec.ts --grep butterfly` and `--grep circles`; each passed.

Files changed for this integration: `server/generation/docker.ts`, `scripts/build-sandbox.ts`, `package.json`, `sandbox/test-worker.mjs`, `src/engine/isolated-frame.ts`, `server/isolation.test.ts`, `tests/isolated-preview.spec.ts`, `tests/generated-artifacts.spec.ts`, `src/studio/Studio.tsx`, `tests/creation-feedback.spec.ts`, `tests/generation-live.spec.ts`, this evidence document, `ISOLATED-PREVIEW.md`, README and ignored local `.env`. Discovery/credential-helper handling and idempotent spawn/output parity have regression coverage. The slower Docker availability probe also exposed a startup race: AI submission now waits until provider status resolves instead of silently using offline demo rules. A delayed-status browser regression verifies that gate. Isolation limits, mount restrictions, network denial and quarantined-library policy are retained.

Current regression checks: `npm test` passed 24 tests; `npm run build` passed. The complete deterministic Playwright run passed 20 tests with five opt-in tests skipped; the two real artifact tests were run separately and passed. No validation containers remained running after cleanup.

The real wizard end-to-end check also passed: `CAREPLAY_TEST_GENERATION=true npx playwright test tests/generation-live.spec.ts` completed in 4.3 minutes. Staff text was submitted through Create my activity; the API routed unsupported mechanics into real Codex planning/authoring, repaired the first failed draft, and ran Docker compilation, nine generated tests and independent generic smoke checks. Proposal `2637cbbf-f5ac-4973-9391-f11ba6a1b822` became a preview-ready artifact in the editor, loaded its opaque iframe, rendered objects, started/paused and saved. Screenshot: `artifacts/careplay-generated-live-wizard.png`. This wizard run did not select the special semantic probes; those remain separately proven by the two CLI cases above.

One earlier live wizard run unexpectedly returned to the dashboard despite a successful backend proposal (`0f620646-4327-498b-9b77-9946d16da7b5`). Replaying its actual completed report with the real artifact API succeeded, and a temporary file-watch reproduction did not reproduce the reset. The clean live rerun passed with stage, navigation and JavaScript-error diagnostics. The cause of the earlier reset is unconfirmed; do not interpret the rerun as proof of reload recovery. Refreshing/restarting a development page can still discard its in-progress UI state while the quarantined backend proposal persists. The live test now fails promptly on unexpected navigation. Temporary diagnostic-only tests were removed after this investigation.

The remaining sections below preserve historical results and earlier blockers; they are superseded by this real execution evidence.

## Isolated-preview implementation follow-up

Implemented the Docker build/test adapter, bounded runtime-repair feedback, hashed experimental artifacts, opaque iframe/worker transport, trusted rendering, editor attachment, iterative rebuilds, undo and persistence. See [the current security/setup document](ISOLATED-PREVIEW.md).

Verification: production build passed; 23 unit tests passed. The deterministic browser suite passed 18 checks (three live-Codex checks skipped); the additional experimental-editor fixture passed separately, for 19 distinct deterministic browser checks. Targeted reruns of editor persistence, draft messaging and isolation passed. Chrome demonstrated that the opaque iframe cannot access the parent DOM, a worker fetch is blocked before any external request, hand-position snapshots reach the worker, and an infinite loop is terminated by the supervisor. These tests use hand-authored trusted fixtures, not generated-game execution evidence. Container runner files passed syntax checks only; they were not executed on the host.

Actual prerequisite probe: Docker/Podman executables were absent; `wsl --status` reported WSL not installed. The live acceptance runner exited before model invocation with **Docker CLI/daemon is unavailable. No generated code was executed.** The validator image has not been built/tested on this laptop. Real Butterfly Garden following/collision/persistent-bloom validation and genuinely novel circle-to-bubble runtime validation therefore remain **blocked**, not passed. The definition of done is not yet verified. No mocked sandbox execution or fixture result is being substituted for those checks.

`npm run validate:autonomous` now supplies developer-owned independent semantic probes to the same isolated repair pipeline once Docker is available. It creates real Codex source, tests, scene manifests and experimental artifacts under `.careplay/proposals`; unsuccessful acceptance prevents a successful report. The old source proposals below remain historical static-only evidence and need scene-aware regeneration.

## Historical static-authoring evidence

The following are **real Codex-authored source proposals**, not fixed demo code. No generated modules or their tests were executed. This is static authoring evidence, not a gameplay-success claim.

| Request | Result | Runtime status |
|---|---|---|
| Butterfly Garden | Codex planned generic hand guidance, target acceptance, persistent target outcomes and source departure. Authored module and tests passed TypeScript/interface checks in one attempt. Proposal `7c77a2ff-1b2b-41ea-b0ca-e18551f7afeb`. | Not executed; awaiting isolation |
| Fishing reuse | Codex supplied fish/pond parameters and new tests for the **unchanged butterfly guidance source**. Source SHA-256 `82f265fa4be3974870dc09307ec0eaa91e03a1a3c8a9e41cb487eede682f5b37`. Static checks passed. Parameters change kinds and target/source outcome keys. | Not executed; behavior not proven |
| Air-drawn circles creating bubbles | Codex planned and authored a new hand-path recognizer and gesture-to-spawn behavior; TypeScript/interface checks passed in one attempt. Proposal `e60f85ed-7f63-42e0-9cb7-df870e54351d`. | Not executed; recognition accuracy not proven |

Fishing reuse retains the original candidate's upward departure/removal behavior; it does not establish fish remaining in the pond. Existing-art reuse and new bubble assets remain authoring intent until a trusted renderer integrates approved outputs.

Local evidence lives in ignored `.careplay/benchmarks/` folders. Source is deliberately outside the frontend import tree and is never automatically promoted. One initial fishing adaptation request used a JSON Schema with an open-ended parameter record; Codex rejected that response contract. Retrying with a closed parameter object succeeded. That was an authoring transport/schema repair, not a gameplay validation result.

Automated trusted-code checks: 20 unit tests and 17 deterministic browser tests passed, covering existing games, persistence, draft UI, compiler diagnostics, bounded repair attempts, tracking expiry and unvalidated-code gates. The UI draft test uses HTTP fixtures; the benchmark commands above are the distinct live-model checks. The application production build also passed. These results do not satisfy the original autonomous playable-game success criterion without isolation and runtime evidence.

An additional **real browser → local API → Codex → source authoring → compiler feedback → repaired draft → browser** test passed in 4.3 minutes. The Butterfly Garden proposal `d621c5b0-210d-4c45-8352-3a5fbb81bcf4` required two authoring attempts, finished with no TypeScript diagnostics, and appeared in the wizard as a non-playable developer draft. The report explicitly records `testsExecuted=false` and `previewAvailable=false`. Screenshot: `artifacts/careplay-generated-developer-draft.png` (local, ignored). This brings browser checks to 18 across deterministic and live-authoring runs; it does not constitute a generated-game runtime test.
