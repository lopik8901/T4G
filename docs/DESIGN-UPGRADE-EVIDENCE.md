# Complete-game and discovery evidence — 2026-11-09

Implementation and validation on `AI_workflow`. Existing uncommitted application work was preserved. Research preceded implementation: [assessment and upstream license/source references](DESIGN-UPGRADE-ASSESSMENT.md). No external engine code/assets were copied, no extra engine dependency was installed and no paid asset operation was performed.

## Real create → play → replay → save

Both activities were requested through the normal wizard, designed/planned/authored by signed-in Codex, built and tested in actual Docker, then played in the isolated browser preview. Generated implementations were never manually edited. Only camera video/landmarks were synthetic.

| Activity | Proposal | Attempts / generated tests | Browser outcome |
|---|---|---|---|
| Fruit Sorting | `bd41536e-385c-4280-aa84-68da1c0f0a61` | 1 / 8 | Three rounds, three fruits each; matching baskets, following, progress, completion, Play Again, restart, save and mute passed |
| Fish Feeding | `d08b4f49-52ee-4059-bbbe-08a6d5458410` | 1 / 8 | Two rounds, three food pieces each; hand guiding, feeding, completion, replay, restart, save and mute passed |

Both independent container checks include full-design-lifecycle, new-round-arrangements, completion, replay-playable, two-hands, tracking-loss-no-crash, finite-state, 100-fixed-steps and disposal. Sorting additionally checks wrong-target-no-progress. The harness dispatches by interaction metadata, not game title. These generated source bundles implement different matching/guiding rules using the same SDK, renderer and HUD.

Validator image: `sha256:a60a5634cf3b99d97137bcec198a830924aae484035d24eabae92b11b1ece2b0`.

| Activity | Recorded source SHA-256 | Bundle SHA-256 |
|---|---|---|
| Sorting | `1bb710feb8b7bd879b28a2ec11aab1d6a910bc74e250257a16fe297eed66c6fb` | `a6f4005e432f387da7e02f435fc42d37369be12d5c3cdd45017acf7977d1ed37` |
| Feeding | `ed865edca3bfd0ae7c3aac638ed195f69355a649bc062454b34f5aa84937cf9d` | `81767bcbf806008a6acd8dbfc4a68a028712267640da2b947dcf199900bdb679` |

Commands: `CAREPLAY_TEST_COMPLETE=true npx playwright test tests/complete-game-live.spec.ts --grep sorting` (passed, 4.8 min), then `--grep feeding` (passed, 4.0 min). In PowerShell set `$env:CAREPLAY_TEST_COMPLETE='true'` before running the command. Artifact/provenance files remain in ignored `.careplay/proposals/<id>/`.

Screenshots `artifacts/complete-sorting.png`, `complete-sorting-playing.png` and `complete-feeding.png` were inspected by the coding assistant. Distinct fruit silhouettes, labelled baskets and separate HUD are visible. This is manual implementation-time inspection, not an automated model screenshot reviewer. The quality report continues to say `screenshotReviewed=false`.

## Discovery and iterative editing

After these successful games, retrieval was improved for actual designer vocabulary and composition of trusted components. Historical discovery records were not rewritten to claim the new retrieval ran earlier.

Real edit proposal `2ae9e175-958b-449e-ae8c-511c1a7d8a51` retained the design, manual title/theme and completed planning/discovery. Its actual report reuses `game-runtime` for progress/replay and `illustrated-local-assets` for fruit/baskets, adapts composed input/geometry helpers, and recommends generation for missing matching/collection behavior. Authoring then failed because Codex usage allowance was exhausted (`failure.json`, stage `authoring`). No replacement preview was published. End-to-end mechanics-edit verification on this final routing remains outstanding; it is not counted as a passing live generation test.

`server/discovery.test.ts` verifies realistic vocabulary/composition, quality floors, compatible adaptation, no fabricated art substitution, external compatible-local fallback, incompatible reference rejection and simple edit classification. `tests/discovery.spec.ts` verifies the real HTTP boundary. Discovery evaluates declared functionality, visual quality, execution compatibility, dependency cost, licensing and maintenance; it is a reviewed catalog snapshot, not live repository crawling.

## Checks and diagnostic history

- Final `npm test`: **34 passed**, one opt-in real-Docker test skipped. The real Docker frozen-tests repair test was separately run and passed against the final image.
- `npm run build`: passed; Vite retains a large-chunk warning for the original 3D BalloonScene.
- Full deterministic browser regression earlier in this upgrade: **21 passed**, eight opt-in tests skipped. Final focused isolation/editor/discovery regression: **3 passed**, one real-artifact opt-in skipped in that invocation.
- Real complete-artifact artwork/HUD accessibility check: passed again after the final changes (one test, 5.7 seconds), separately from fixtures.
- Legacy real Butterfly artifact browser check passed. Circle artifact check initially failed because the synthetic rejected straight line remained part of the next path; explicitly releasing tracking and settling at the circle start fixed the test. The unchanged generated circle artifact then passed.
- Pilot `ef7a4204...` misinterpreted goal as total across rounds; canceled before generation and a per-round count guard was added. Pilot `ab03d11e-d802-47d5-9a2b-b9d343b79ab1` exposed a 100 ms whole-test timeout, not a mechanic failure. Its unchanged source passed after the whole-test limit became 1,000 ms. Clean wizard runs above provide the actual published success evidence.

## Scope and remaining limits

The high-value local vertical slice is implemented: design, discovery, reusable lifecycle, real approved illustrations, bounded authoring/repair, isolated validation, playable preview and persistence. External rendering adapters, live external repository search, arbitrary new artwork/paid generation and automated visual-model review are not integrated. Custom semantics beyond supported probes need developer-owned acceptance checks. No physical resident/webcam validation or clinical suitability claim is made. Staff review and generated-code quarantine remain mandatory; launch approval never promotes code into the registry. See [actual isolation boundaries and residual risks](ISOLATED-PREVIEW.md) and [current roles and exact prompts](AGENTS-AND-PROMPTS.md).
