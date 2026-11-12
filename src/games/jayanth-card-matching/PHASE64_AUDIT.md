# Phase 6.4 — gentle pacing and Replay Pictures

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


The user confirmed Relaxed 14 s / Standard 10 s (default) / Brisk 8 s for both
normal Memory Peek and Replay Pictures, resolving the conflicting 5/8/10 s
numbers in the addendum. No memory timer is introduced in Direct Match.

## Diagnosis and implementation

Phase 6.3 travelled in 800 ms with 120 ms stagger, held pictures for only 3 s,
closed in 600 ms, and moved the target in 1000 ms. Those short orientation and
memorisation periods made the physical experience difficult. Independent front
and back transforms, conditional removal/recreation of picture fronts and a
full-opacity newly mounted target also weakened visual continuity. Next-round
content replaced fully visible success content without a departure treatment.

Each answer now retains one pair of faces and the same decoded picture DOM node
throughout the round. One 3D rotor coordinates both faces, with backface visibility
hidden and appropriate aria-hidden/generic button labels. There is no moment when
a mirrored front is deliberately exposed. Front pictures remain in the DOM while
closed to preserve continuity; they are not exposed to assistive technology.
The target reference is still absent until all cards close, and narration cannot
speak its identity earlier. A transform/opacity target entry fades and scales
into the existing banner-avoiding path. Success holds, then gently fades the card
row/reference before the next round; the skyline remains mounted and illuminated.
Images are decoded before entry and next-round images remain prefetched.

| Action | Phase 6.3 | Phase 6.4 |
| --- | --- | --- |
| Card descent, each | 800 ms | 1500 ms |
| Stagger | 120 ms | 400 ms |
| Full final landing | 1160 ms | 2700 ms, AND four actual completion events |
| Memory preview after final landing | 3000 ms | 14000 / 10000 default / 8000 ms |
| All cards close | 600 ms | 900 ms AND all four completions |
| Level 1 reference movement | 900 ms | 1500 ms |
| Level 2 target reveal/move | 1000 ms | 1500 ms AND actual animation completion |
| Replay opening | Direct preview replacement | 900 ms AND all four opening completions |
| Selection dwell | At least 1000 ms | At least 1000 ms, fresh after re-entry |
| Success | 2000 ms | 2000 ms, with departure fade in final 22% |

Timings are central in session.ts and passed to CSS. Smooth ease-out descent and
coordinated flips have no bounce, overshoot, blur or animation dependencies.
The final three preview seconds display “Pictures will turn over soon” inside a
reserved banner area, avoiding layout shifts or an alarm/countdown. No response
time limit is added. Reduced motion removes spatial travel/rotation, retains the
full configured preview and opening/closing/target locks, and uses a short static
100 ms entry instead of simulated falling. Normal cards replay their real descent
on each keyed new round.

## State and replay safety

Normal memory: falling → previewing → flipping → revealingTarget → selecting.
Replay: selecting → replaying (open in place) → previewing → flipping →
revealingTarget → selecting. Wrong feedback returns to selecting; correct matches
increment the skyline and advance normally.

Staff Controls alone contains Replay Pictures, with existing hand-dwell navigation.
It is omitted for Level 1, and disabled outside Level 2 selecting. Replay keeps
round object, answer order, correct answer, number, history, rejected cards and
skyline progress. No score or penalty. Rejected pictures remain disabled after
replay; the replay itself shows every picture clearly. After closing they stay
closed/grey rather than unexpectedly reopening. Repeated requests while busy are
ignored. Every replay increments a separate animation-cycle token, protecting
against queued events from an earlier replay of the same round. Round revisions
remain monotonic across Home/Restart. No per-replay interval/timeout is created.

Clock gates and real opening/closing/target events are required independently.
Pause freezes clocks, CSS animation and target Web Animation; CSS transitions
already in progress are also paused/resumed. Preview time starts at zero only
when the last card lands/opens. Inactivity never advances during these phases,
and target completion resets it to zero for the full answer allowance. Phase and
cycle changes reset dwell; a pre-positioned palm must leave its card and re-enter
before a fresh one-second dwell can select it. All explicit input routes use the
same reducer/disabled guards. Camera, active-hand selection, mirroring, calibration
and pointer geometry are unchanged. The scene-entry arming guard now measures actual movement from the newly mapped position; switching to assisted dialog coordinates must not itself count as hand movement.

Game Pace sits inside Staff Controls. A pace change updates the current session
and future sessions; if made during paused preview, elapsed time is retained and
the selected total duration changes. Restart retains chosen pace; replay uses it.

## Scope

All work is game-local. No Balloon Popper source/behaviour, shared camera hook,
worker/model, catalogue, credits, root config or dependency changes. No branches
switched and no commits, pushes or merges.

Exact source/test/document changes:

- useHandPointer.ts — scene movement is measured from the new mapped point, preventing a stationary physical palm from arming a dialog after the mapping changes.
- session.ts — pacing, replay state/cycles, shown faces and input/timing gates.
- CardMatchingGame.tsx — staff pace/replay UI, persistent card rotor, target fade,
  paused transitions, closing-soon cue and meaningful-only clock publication.
- CardMatchingGame.module.css — coordinated flip/open, gentle departure/reference
  fades and reserved subtle indicator styling.
- memory.test.ts — existing phase/replay tests updated for intentional timings.
- immersive.test.ts — updated Level 1 movement duration.
- pacing.test.ts — new full-duration, reduced-motion, pause, repeated replay and
  stale-cycle regression tests.
- browser/game.spec.ts — frozen-clock visual test adjusted for the longer Level 1 reference movement.
- browser/memory.spec.ts — updated timing, persistent-face privacy and replay flow.
- browser/immersive.spec.ts — actual 1.5-second Chrome descent expectation.
- browser/phase6.spec.ts — updated reduced-motion timing and Replay Pictures.
- browser/phase63.spec.ts — extended waits and persistent hidden-front assertions.
- browser/phase64.spec.ts — staff pace, late cue, full answer idle allowance,
  repeated real-hand replay, node/geometry stability and complete motion evidence.
- browser/measure.mjs — waits for actual answer-enabled phase before warm sampling;
  otherwise the longer preview would be mislabeled as warm selection performance.
- README.md — current pacing/replay instructions.
- PERFORMANCE.md — final measurements.
- PHASE64_AUDIT.md — this report.

## Physical review

Synthetic hands/camera and API checks do not establish real MediaPipe inference
speed, seated reach, TV readability, resident recognition/memory comfort, speech
audibility or prolonged thermal/memory stability. Staff should re-test Standard
and Relaxed with residents, compare the close-soon cue on the actual TV, check
framing/lighting and listen to English Test Voice. No clinical or locked-60-fps
claim is made. Browser-owned permission/fullscreen prompts may require a physical
click. Cover framing still crops mismatched camera/TV aspect ratios.

Preview: http://127.0.0.1:5176/src/games/jayanth-card-matching/index.html
Run `npm run dev -- --port 5176` from the repository root (use Vite's printed port
if that port is occupied).

## Verification results

- All 57 Card Matching unit tests pass, including configured duration boundaries,
  no preview time before the final landing, reduced-motion locks, full answer idle
  allowance, pause/resume, stale-cycle rejection and ten successive replays with
  nonzero skyline progress and unchanged round/question/order/rejections.
- Full browser run exercised all 66 then-current cases: 64 passed, two needed fixes.
  An older frozen-clock screenshot test assumed Level 1 had already finished its
  reference movement at 3.1 s. Its clock now reaches the deliberate 3.3 s movement
  boundary before checking descent. The real-hand replay case exposed an actual
  unintended-navigation bug: switching from aligned gameplay to assisted dialog
  mapping was counted as hand movement from the OLD screen point, arming a staff
  button under a stationary physical palm. Scene arming now measures from the NEW
  mapped point; first hand acquisition still works without an extra gesture.
- The 17-case follow-up passed completely (3.6 minutes), including both previously
  failed cases, first-acquisition Home navigation, calibration, one/two hands,
  exact duration/stagger CSS, last-card completion gating after 3.5 s, repeated
  hand-controlled replay, paused replay, node/position identity, held-card rearming,
  the complete flow capture and a new deterministic stationary-palm dialog test.
  Total: 67 distinct passing browser cases across the full run and follow-up.
- All requested TV layouts and a 1280×620 toolbar-height viewport passed static
  geometry and real per-frame target/instruction overlap checks. Screenshot review
  included face-up preview, clear late cue, partial flip with one visible face,
  target motion, closed selection and compact Staff Controls. No resident video
  was captured; all camera content is a local synthetic fixture.
- Balloon Popper regressions: 9/9 unit, 7/7 browser pass unchanged.
- TypeScript and both production builds pass. Root's existing large-chunk warning
  remains. Independent JS is 295.00 KB / 92.61 KB gzip and CSS 26.68 KB / 6.03 KB gzip.
- Diff/whitespace checks pass; tracked files outside the game folder are unchanged.

The complete real-time evidence records 1.5 s descent events on all four cards,
0.9 s flip events on all four rotors, a full 10.005 s face-up Standard preview,
and no target during falling/preview/closing. Browser scheduling and the 100 ms
logical clock can extend waits slightly; they do not shorten the configured preview.
Raw sequence: artifacts/card-matching/phase64-motion.json. Five-viewpoint prompt
frame records and the real descent sample are also kept under the phase64 prefix.
Legacy tests regenerate some phase62/63 filenames with current styling; the
phase64 copies are the evidence for this phase, not immutable historical images.

## Screenshot sequence

- Cards descending (`../../../artifacts/card-matching/phase64-descent.png`, generated locally)
- Face-up preview (`../../../artifacts/card-matching/phase64-preview.png`, generated locally)
- Close-soon cue (`../../../artifacts/card-matching/phase64-closing-soon.png`, generated locally)
- Coordinated flip (`../../../artifacts/card-matching/phase64-flipping.png`, generated locally)
- Target reveal (`../../../artifacts/card-matching/phase64-target.png`, generated locally)
- Selection (`../../../artifacts/card-matching/phase64-selection.png`, generated locally)
- Replay opening (`../../../artifacts/card-matching/phase64-replay-open.png`, generated locally)
- TV Level 1 (`../../../artifacts/card-matching/phase64-level1-1920-1080.png`, generated locally)
- Ultrawide selection (`../../../artifacts/card-matching/phase64-selection-2048-700.png`, generated locally)
- Toolbar-height Staff Controls (`../../../artifacts/card-matching/phase64-staff-1280-620.png`, generated locally)

## Final synthetic performance

| Steady 6.5 s sample | Frame p95 | Frame p99 | >25 ms frames | Root commits | Result → DOM p95 | Post-GC JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Level 1, 1 hand(s) | 16.8 ms | 33.3 ms | 5/384 | 0 | 0.6 ms | 8.03 MB |
| Level 1, 2 hand(s) | 16.7 ms | 16.8 ms | 2/387 | 0 | 0.4 ms | 8.04 MB |
| Level 2, 1 hand(s) | 16.8 ms | 33.2 ms | 4/385 | 0 | 0.5 ms | 8.14 MB |
| Level 2, 2 hand(s) | 16.7 ms | 16.8 ms | 3/386 | 0 | 0.5 ms | 8.14 MB |

Runs were sequential and separate from tests/builds. Sampling waits for actual
selection, then one second of settling; both Memory runs had one settling commit,
followed by zero commits during steady pointer movement. Initial immediate samples
are retained as phase64-immediate-level*.json, including a 49.6 ms two-hand Memory
result-to-DOM p99 outlier. Warm p95 remains in the earlier 16.7–16.8 ms range;
slower tail frames remain. JS heap is about 8.0–8.1 MB after GC versus historical
7.5–7.6 MB; changed instrumentation/persistent faces prevent a causal attribution.
All four streams/cursors cleaned up on End Session. See PERFORMANCE.md for exact
reproduction and limitations. No real inference or sustained-leak claims.
