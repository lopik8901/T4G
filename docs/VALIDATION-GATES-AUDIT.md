# Validation false-blocker audit — 2026-11-09

Reviewed the normal generation pipeline, design/scene/config schemas, deterministic design review, component preparation, static fallback, Docker compiler/test worker, semantic probes, request transport and preview reporting. Security restrictions were not treated as presentation preferences. No AI-generated source was edited and no new model game-generation calls were made.

## Verified findings and corrections

| Previous blocker | Correction | Evidence |
|---|---|---|
| `two players per round` or `five baskets per round` was interpreted as the completion goal | Bind only explicit outcome/object quantities; ignore participant/duration counts, round ranges, negated counts and upper/lower bounds | Negative/positive count-parser fixtures |
| Long/missing target labels, redundant controls and initial y coordinates outside .25–.85 stopped the build | Nonblocking `quality.warnings`, visible in collapsed preview details. Initial placeholders may be repositioned by setup; actual preview still needs staff review | Quality unit fixtures and editor browser test |
| Every object required an illustrated asset ID, even a safe circle or pond | Permit trusted circle/bubble/balloon/pond fallbacks. Unknown supplied IDs and missing distinct illustrated assets still fail | Positive primitive and negative unapproved-art fixtures |
| Initial source count had to equal the goal, with all roles already present in the manifest | Nonblocking suggestions; setup may create entities, and runtime must actually expose usable roles and reach the goal using all needed outcomes. Pooled/recycled/spawned sources are supported | Pooled-source fixture, rejection of a scene that never spawns sources, plus unchanged real draft validation |
| A selectable source had to appear immediately | Bounded wait of up to five simulated seconds for initial/revealed objects and matching targets | Delayed reveal and deliberately stuck replay fixtures |
| All rounds required different positions | New designs explicitly choose `lifecycle.layout`: fixed allows repetition; shuffle can vary position **or content**. Omitted legacy values preserve shuffle checks | Multi-round fixed layout, changing-content and stuck-shuffle fixtures |
| A short hardcoded guide trajectory could outrun deliberately slow motion | Slower sampled movement and a longer bounded settling period, stopping early when progress occurs. Outer execution limits unchanged | Existing matching/guiding artifacts revalidated in real Docker |
| Static-only validation rejected legal export aliases/re-exports that Docker accepts | Allow the same fixed module references and rely on compiler-enforced exported types instead of source-text export regexes | Positive alias and negative external-module/missing-factory fixtures |
| A valid current game with four bounded SVG definitions exceeded the 64 KB POST limit | Bounded 1 MiB byte-based reader, with incremental UTF-8 decoding. Schema/prompt/concurrency limits remain. Oversized bodies still return 413 | Schema-valid dense-art fixture, split Unicode chunks and actual HTTP acceptance/rejection |

The policy distinction is deliberate: preferences such as labels/layout are suggestions; unsupported executable content, unsafe rendering references, invalid contracts, unplayable goals and failed replay remain blocking errors. The semantic probe does not simply count objects and declare success: it plays each outcome and the first replay batch, including sequentially revealed objects. A game that never reveals its remaining sources still fails.

## Validation performed

- Focused trusted unit fixtures reproduce the previous false failures. Negative fixtures retain rejection of stuck replay, requested shuffle with unchanged content/layout, unapproved artwork, undersized interactive targets, missing exports, external imports and oversized transport.
- Full unit suite: **50 passed**, six opt-in integrations skipped.
- Production build passed, retaining the existing large BalloonScene chunk warning.
- Real Docker, unchanged source/tests: latest user Fruit Sorting `144851c9-efc6-483d-8b6e-429391fcaa0f` passed **7 generated tests**; prior Sorting `bd41536e-385c-4280-aa84-68da1c0f0a61` and Feeding `d08b4f49-52ee-4059-bbbe-08a6d5458410` each passed **8**. All passed full lifecycle, completion and replay; matching additionally passed wrong-target rejection.
- All six previously validated registry versions were revalidated successfully against the updated harness/declarations, without source changes or promotion.
- Browser/API suite: **5 passed** — complete-artifact accessibility, discovery, editor/preview/undo/save with visible nonblocking suggestions, opaque-origin/watchdog, and actual large-request acceptance/over-limit rejection.
- New `layout` policy and delayed pooled spawning were verified with trusted deterministic fixtures, not a claim of new live AI authoring. Physical webcam/resident tests were not repeated.

Raw ignored local evidence: `artifacts/validation-audit-docker.json` and `artifacts/replay-validator-component-checks.json`. Trusted validator image: `sha256:ad1d27a3602c3e48a59ec17dbe56c75eb553fab5e33cd402d1137af9037ca2c2`.

## Intentional remaining restrictions

Network/filesystem restrictions, opaque-origin worker isolation, no untrusted HTML/CSS/JS rendering, fixed/pinned imports, exact content hashes, runtime output bounds, independent tests, compiled-test retention and developer-only promotion remain. CPU/memory/process quotas, 120-second model calls, 15-second validation worker, 45-second container timeout and bounded repair counts were not raised. Supported hand/sound inputs, schema limits (including object/round counts), approved/declarative artwork and the new finite request cap remain real platform capabilities.

This is not proof that every possible generated game will succeed. Novel mechanics may need their own semantic probes; generic guide/matching probes use simplified trajectories and bounded timing rather than a universal game-playing agent. AI syntax/type/logic errors, unavailable prerequisites, model allowance, genuinely missing artwork and resource exhaustion can still prevent creation. These failures should remain visible and preserve the previous activity. Optional components can fall back safely; arbitrary unsupported capabilities must not be faked.
