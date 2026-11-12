# Testing, evidence and limitations

Run commands from the repository root. Use Node 22.18+; recent verification used
Node 26 and Google Chrome 157. Dependencies come from the root package/lockfile.
`npm test` alone runs **Balloon Popper's** unit tests, not the Card Matching suite.

## Commands

Install dependencies with `npm ci`. Its postinstall prepares local MediaPipe assets;
retry `npm run setup:assets` if necessary. A clean installation requires network
access for dependencies/model download. Current handover checks use the already
installed environment; a fresh target-Mac installation remains an operational check.

```sh
# Card Matching units
node --test src/games/jayanth-card-matching/*.test.ts

# Balloon Popper units
npm test

# TypeScript, root production build and isolated game build
npx tsc --noEmit
npm run build
npx vite build --config src/games/jayanth-card-matching/vite.config.ts
```

Start `npm run dev` in another terminal and keep it running. With Vite on port 5173:

```sh
# Full Card Matching browser suite
CARD_MATCHING_BASE_URL=http://127.0.0.1:5173 npx playwright test --config src/games/jayanth-card-matching/playwright.config.ts

# Unchanged Balloon Popper browser suite
npx playwright test --config playwright.config.ts
```

Both configs use the installed `chrome` channel. Install Google Chrome if missing;
installing only Playwright's bundled Chromium does not satisfy that channel.
Card Matching's base URL is configurable; use Vite's actual port. Balloon's current
config uses port 5173. Neither config starts a web server automatically. Run suites
sequentially, or give them distinct `--output` directories, to avoid overwriting
`test-results/`. There are no dedicated root npm scripts for the game suites.

For a focused test:

```sh
CARD_MATCHING_BASE_URL=http://127.0.0.1:5173 npx playwright test --config src/games/jayanth-card-matching/playwright.config.ts browser/phase64.spec.ts
```

## Coverage

Unit tests cover category validity, one match/four choices, distractor conflicts,
reference/slot non-repetition, history, 5/10/continuous skyline progression,
mirrored crop/pan geometry, dwell consumption, tracking association, local voice
selection and recording-manifest consistency. Memory tests exercise clocks plus
actual-completion barriers, stale revisions/cycles, pauses, rejections and replay.
Pacing tests include all three preview durations, reduced motion and ten successive
replays preserving a nonzero journey and the same question/order/rejections.

Browser tests cover Home/setup, staff controls, all input locks, mouse/keyboard/
synthetic hand actions, camera lifecycle, frame mapping, replay, held-hand rearming,
stationary-palm dialog safety, English audio API behaviour, fullscreen and axe
accessibility scans. Normal-motion tests inspect real CSS/WAAPI completions and
geometry; they do not simply assert that a skyline/component exists. Some older
visual tests deliberately use a frozen clock or synthetic completion events and
must not be described as physical animation/inference evidence.

The default browser config requests reduced motion. Specific motion cases override
it. Supported tested layouts include 1920×1080, 1366×768, 1280×720, 2048×700 and a
1280×620 toolbar-height viewport. Geometry tests check overlap/clipping and prompt
animation frames, not every possible TV configuration.

## Verification record

Phase 6.4 recorded 57 passing Card Matching unit tests and 67 distinct passing
browser cases across its full run and a corrective follow-up. The initial full run
had 64/66 passes: one legacy frozen-clock expectation needed the new timing, and
one real-hand replay case exposed unintended dialog activation after coordinate
mapping changed. Both were corrected; all 17 follow-up cases passed, including a
new stationary-palm regression. These counts are not a single 67-case green run.
Balloon regressions were 9/9 unit and 7/7 browser. TypeScript and both builds passed;
the existing root large-chunk warning remains.

The documentation handover on 9 November 2026 reran the final source: 57/57 Card
Matching unit, 9/9 Balloon unit, 7/7 Balloon browser, TypeScript and both builds
passed. The 67-case Card Matching browser run passed 66 cases; the motion-capture
case was interrupted while an imported credits asset changed, returning the page
to Home. An isolated cue timeout also occurred after editing stopped. A diagnostic
live-clock trace showed the expected full preview/cue, and the unchanged capture
test then passed three consecutive runs (59.6 seconds total), with temporary
diagnostics removed. All 67 distinct browser cases therefore passed across the
run and reruns, not in one uninterrupted green run. Treat that capture case as
intermittent under the development server and keep it under review.

The documented isolated production preview also reached playable Level 1 with
four answers and served the worker, model, WASM and licence/recording manifests
without HTTP errors (camera denied intentionally; not a real-camera validation).
The 87 local Markdown links and all 100 active photo/credit entries were checked.
One command's benchmark filename is an example output destination, not a supplied
file. Generated evidence references were present locally apart from that example.
No gameplay behaviour was changed in the documentation pass.

## Performance methodology

[PERFORMANCE.md](PERFORMANCE.md) preserves historical tables and final Phase 6.4
measurements. The harness uses a synthetic 640×480 canvas camera and controlled
landmark worker responses in Chrome at 1920×1080. It measures entry and a 6.5-second
steady selection window after actual selection and one second of settling.

```sh
CARD_MATCHING_BASE_URL=http://127.0.0.1:5173 BENCH_MEMORY=1 BENCH_HANDS=2 node src/games/jayanth-card-matching/browser/measure.mjs artifacts/card-matching/review-level2-two-hands.json
```

Use `BENCH_MEMORY=0` for Level 1 and `BENCH_HANDS=1` for one hand. Run combinations
sequentially, separately from tests/builds. Phase 6.4 steady frame p95 was
16.7–16.8 ms with zero root commits during steady pointer motion; Memory had one
preceding settling commit. Slower frame/latency tails remained. Post-GC JS heap was
about 8.0–8.1 MB. Do not infer real MediaPipe FPS, physical camera latency, GPU
texture memory, sustained leak freedom or thermal behaviour from these samples.
The longer preview required correcting when the harness samples “warm selection”.

## Evidence and historical reports

Tests and benchmarks write ignored `artifacts/card-matching/`, `test-results/` and
`playwright-report/`. These are local generated outputs, deliberately excluded from
the feature commit along with `dist/`, node_modules and downloaded MediaPipe files.
A fresh checkout must generate them; historical filenames may be overwritten by
new runs. Do not treat a missing generated screenshot as a missing runtime asset.

`browser/phase64.spec.ts` generates the current complete Memory Peek screenshot
sequence: descent, preview, close-soon cue, flipping, target, selection and replay.
It also writes `phase64-motion.json`. Other suites generate TV/fullscreen/staff
screenshots, sometimes under legacy phase62/63 names. Inspect the images directly,
not just assertions. All automated camera imagery is synthetic, not resident footage.

[AUDIT.md](AUDIT.md), [PHASE6_AUDIT.md](PHASE6_AUDIT.md),
[PHASE61_AUDIT.md](PHASE61_AUDIT.md), [PHASE62_AUDIT.md](PHASE62_AUDIT.md),
[PHASE63_AUDIT.md](PHASE63_AUDIT.md) and [PHASE64_AUDIT.md](PHASE64_AUDIT.md)
are historical implementation records. Earlier language/multiplayer descriptions
are not current features. Prefer the current README/architecture/staff guide.

## Physical camera, audio and resident review

Automated tests use synthetic camera streams/landmarks for Card Matching. Some
Balloon tests exercise the real local worker using Chrome's fake camera, which
still does not reproduce a seated resident or real lighting. Audio tests mock
speech/recording APIs; an ended callback does not prove audible speaker output.
There is no completed clinical validation or documented resident usability study.
The user's physical Phase 6.3 feedback motivated slower pacing, but is not evidence
that Phase 6.4 has been validated with RCA residents.

Before supervised use, check:

- Consent, supervision and a clear End Session procedure under RCA policy.
- A fresh Mac setup, TV mirroring, USB webcam selection, HDMI sound output and
  Chrome/Mac permission prompts. Confirm first install and subsequent local play.
- Actual MediaPipe acquisition, one/two hands, phone occlusion, crossed hands,
  disappearance/reacquisition and deliberate staff hand assignment.
- Seated reach, comfortable dwell, Recenter versus Mirror aligned, crop/pan,
  unplug/retry, rapid Home/Restart/End and no background stream/audio.
- TV contrast, text size, colour distinction, familiar photograph recognition,
  reduced motion, overscan, fullscreen and toolbar-height windows.
- Standard/Relaxed comfort, full preview after last landing, clear cue, repeated
  replay, no held-hand accidental choices and a full answer inactivity allowance.
- Audible English Test Voice and instructions through the actual TV speakers,
  including mute, rate, repeat, cancellation and missing-voice fallback. No human
  clips are currently supplied; future recordings require separate listening checks.

The [staff guide](STAFF_GUIDE.md) provides operating steps. Record issues without
resident-identifiable media unless consent/procedures explicitly permit it. Do not
claim clinical effectiveness, universal accessibility or sustained 60 fps.

## Attribution and release checks

Check every active catalogue image exists and has author, source and licence data
in the existing [credits](assets/PHOTO_CREDITS.md) and [manifest](assets/photo-manifest.json).
There are 50 animal and 50 fruit JPG entries; colours are code-rendered swatches.
Keep all notices and [GFDL 1.2](assets/GFDL-1.2.txt) for the three recorded GFDL
images. [Illustration CC0](assets/LICENSE.md) applies only to its named originals.
No overall software licence is supplied by this repository.

The unused local `assets/photos/fruits-cantaloupe.png` is outside the active
catalogue/credits and is excluded from the handover commit. It is not needed to
run/build/test; the credited `fruits-cantaloupe.jpg` is included. Do not upload
unreviewed alternate assets as if the JPEG's notice automatically covers them.

Local documentation links, referenced source paths, catalogue/credit coverage,
recording manifest and ignored-output exclusions are checked before publishing.
External credit URLs preserve their supplied provenance; this is not a new legal
opinion or an independent revalidation of every remote licence page.

The starfruit source explicitly lacks photographer information; the credits/manifest now identify that uncertainty and USDA ARS provenance instead of leaving a blank author. Public-domain records use their source pages when no separate licence URL is supplied.
