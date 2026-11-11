# Performance verification — Singapore Skyline Journey

See [TESTING.md](TESTING.md) for current commands and evidence limits. The phase sections below retain historical measurements; raw artifact paths are local generated outputs excluded from Git, not required repository files.

Measured in installed Chrome 157.0.8103.38 on the development Mac,
1920 × 1080, Vite development mode with React Strict Mode. Before and after
use the same synthetic 640 × 480 canvas camera and moving palm landmarks.
The worker protocol is simulated: **MediaPipe inference and physical camera
capture-to-screen latency are not measured**. Values below are one 6.5-second
warm answering window per version, not a cross-device guarantee.

| Measurement | Before | After |
| --- | ---: | ---: |
| React root commits / 6.5 s | 455 | 0 |
| Frame p50 | 16.7 ms | 16.7 ms |
| Frame p95 | 16.7 ms | 16.7 ms |
| Frame p99 | 16.8 ms | 16.8 ms |
| Frames above 25 ms | 1 / 388 | 0 / 389 |
| Synthetic result → DOM p50 | 3.3 ms | 0.2 ms |
| Synthetic result → DOM p95 | 6.8 ms | 0.4 ms |
| Synthetic result → DOM p99 | 19.3 ms | 49.3 ms |
| JS heap after forced GC | 7.77 MB | 7.14 MB |

The pointer no longer causes React renders. Idle state publishes at most at
whole-second boundaries; significant game/status actions still render normally.
Warm frame timing was already near 60 fps before and remains there after the
change. Do not interpret the render-count reduction as an equivalent FPS gain.
The after run included one 49.3 ms input-to-DOM outlier;
this short run does not establish bounded worst-case latency.

The first reveal/fall window after the change recorded
389 frames, p95 16.8 ms,
0 frames above 25 ms, and
10 root commits. The baseline cold window contained
large stalls (p99 1183.3 ms), but cache/host load were
not controlled sufficiently to attribute all cold-start improvement to code.

After confirmed Exit, the synthetic stream was detached and the cursor hidden.
Post-exit forced-GC heap was 7.16 MB.
This snapshot includes the closed screen and caches; it is not evidence of zero
leaks. The next-image decode cache is bounded by the finite catalogue, and round
history is capped at 200 IDs. Long-duration GPU/process memory and thermal
behaviour still need a physical MacBook + TV session.

The isolated production JavaScript bundle is approximately **275 KB / 87 KB
gzip**; local photo files and the model/WASM are separate assets. Only the
current and next round are decoded in advance. Images are at most about 1.4
megapixels in the existing local pack. No image filters or particle loops run.

Raw files: `artifacts/card-matching/performance-before.json` and
`artifacts/card-matching/performance-after.json`. Reproduce with
`browser/measure.mjs` while the Vite server is running; set
`CARD_MATCHING_BASE_URL` if its port differs.

## Phase 6 — 8 November 2026

Current Chrome, 1920×1080, 640×480 synthetic canvas at 15 fps, controlled worker
landmarks, development build. Each warm sample lasts 6.5 seconds. Two-hand input
adds one stationary candidate to the same moving candidate. The one-hand Phase 5
result is a historical comparison with the same benchmark method; host load,
layout and run date differ. No physical camera/MediaPipe inference is included.

| Warm measurement | Phase 5, one hand | Phase 6, one hand | Phase 6, two hands |
| --- | ---: | ---: | ---: |
| Frame samples | 389 | 388 | 388 |
| Frame p95 | 16.7 ms | 16.8 ms | 16.8 ms |
| Frame p99 | 16.8 ms | 16.8 ms | 16.8 ms |
| Frames >25 ms | 0 | 1 | 1 |
| React root commits | 0 | 0 | 0 |
| Synthetic result → DOM p95 | 0.5 ms | 0.5 ms | 0.6 ms |
| Result → DOM p99 | 16.5 ms | 0.7 ms | 14.9 ms |
| Post-GC JS heap | 7.29 MB | 7.47 MB | 7.47 MB |

The new layout/association preserves zero pointer-driven React commits. The small
p95 variation and tail outliers do not establish an FPS improvement or bounded
latency. The final reveal/entry samples had frame p95 16.7/16.8 ms, 14 root commits each,
and three/two >25 ms frames respectively. Post-End Session heap was about 7.49 MB
in each final run; stream detachment and cursor cleanup succeeded. Short heap snapshots cannot
establish long-run leak freedom, GPU/native memory stability or thermal behaviour.

Raw final files: `artifacts/card-matching/phase6-one-hand.json`,
`phase6-two-hands.json`; prior reference: `phase5-after.json`.

```sh
CARD_MATCHING_BASE_URL=http://127.0.0.1:5176 BENCH_HANDS=1 node src/games/jayanth-card-matching/browser/measure.mjs artifacts/card-matching/phase6-one-hand.json
CARD_MATCHING_BASE_URL=http://127.0.0.1:5176 BENCH_HANDS=2 node src/games/jayanth-card-matching/browser/measure.mjs artifacts/card-matching/phase6-two-hands.json
```

Run sequentially without browser suites/builds. Staff diagnostics show the latest
real capture/worker round trip when hardware is available, including transfer and
bitmap overhead; pure inference time is not exposed by the reused worker. Real
one/two-hand inference cost and hand-to-display latency remain hardware checks.
The final independent JS bundle is about 293 KB / 93 KB gzip, excluding local
photos and model/WASM assets. No heavy animation library was added.


## Phase 6.1 — centred-camera refinement

Same Chrome 157, 1920×1080, synthetic 640×480 canvas/controlled worker results,
6.5-second warm windows. The larger contained video measures 1868×928 pixels,
versus about 576×748 in the earlier side column. Runs were sequential, separate
from browser suites/builds. Historical Phase 6 files are the comparison; this is
not a simultaneous controlled experiment or real MediaPipe benchmark.

| Warm sample | Phase 6 one hand | Phase 6 two hands | Phase 6.1 one hand | Phase 6.1 two hands |
| --- | ---: | ---: | ---: | ---: |
| Frame p95 | 16.8 ms | 16.8 ms | 16.7 ms | 16.8 ms |
| Frame p99 | 16.8 ms | 16.8 ms | 33.3 ms | 16.8 ms |
| Frames >25 ms | 1/388 | 1/388 | 5/384 | 2/387 |
| React root commits | 0 | 0 | 0 | 0 |
| Result → DOM p95 | 0.5 ms | 0.6 ms | 0.6 ms | 0.4 ms |
| Post-GC JS heap | 7.47 MB | 7.47 MB | 7.42 MB | 7.42 MB |

Zero pointer-driven React commits are preserved. The one-hand after run had a
33.3 ms frame p99 and five >25 ms frames, compared with one in its historical
baseline; it does not justify claiming uniformly improved frame tails or locked
60 fps. Warm result-to-DOM p99 was 1.2/1.3 ms in the final one/two-hand samples.
This latency starts at synthetic worker delivery, not physical hand motion.

Reveal/entry frame p95 was 16.8/16.7 ms, with 14/11 root commits. Post-End Session
JS heap was 7.45 MB in each run; stream detachment and cursor cleanup passed.
Short snapshots do not establish long-run leak freedom, native/GPU memory or
thermal stability. Actual inference, capture-to-display latency and real two-hand
cost remain hardware checks. The independent bundle is about 288 KB / 91 KB gzip.

Raw files: `artifacts/card-matching/phase61-one-hand.json` and
`phase61-two-hands.json`. Reproduce with the existing `browser/measure.mjs` command
and `BENCH_HANDS=1` or `2`, running each sequentially.


## Phase 6.2 — edge-to-edge cover and visible descent

Same Chrome 157, 1920×1080, 640×480 synthetic canvas/controlled worker results.
Final measurements ran sequentially after browser suites/builds. Video now covers
1920×1080 versus the earlier 1868×928 padded preview. Historical comparisons have
different layout and host load; they are not simultaneous controlled experiments.
No actual MediaPipe inference or physical capture-to-display latency is measured.

| Warm 6.5-second sample | Phase 6.1 one hand | Phase 6.1 two hands | Phase 6.2 one hand | Phase 6.2 two hands |
| --- | ---: | ---: | ---: | ---: |
| Frame p95 | 16.7 ms | 16.8 ms | 16.8 ms | 16.7 ms |
| Frame p99 | 33.3 ms | 16.8 ms | 16.8 ms | 16.8 ms |
| Frames >25 ms | 5/384 | 2/387 | 2/388 | 3/386 |
| React root commits | 0 | 0 | 0 | 0 |
| Worker-result → DOM p95 | 0.6 ms | 0.4 ms | 0.6 ms | 0.5 ms |
| Post-GC JS heap | 7.42 MB | 7.42 MB | 7.49 MB | 7.49 MB |

Pointer movement still causes zero React root commits. Entry-window p95 was
16.8/16.7 ms, with 22/23 meaningful root commits including per-card landing
completion updates, versus 14/11 before. Post-End Session heap was about 7.49 MB
in each final run, and stream detachment/cursor cleanup passed. Short samples do
not establish leak freedom, thermal behaviour or native/GPU memory stability.
The independent bundle is about 290 KB / 91 KB gzip, excluding photos/models.

The final real-time descent sample contained 140 frame-position samples across 2.32 seconds. All four animation events reported 1.8-second travel; sampled frame-interval p95/p99/max were 17.9/19.7/26.2 ms. The heading stayed topmost at the sampled instruction point throughout. This test includes geometry/screenshot sampling overhead; it is separate from
the warm benchmark. Occasional >25 ms frames remain and no locked-60-fps or
uniformly improved tail-latency claim is made.

Raw files: `artifacts/card-matching/phase62-one-hand.json`,
`phase62-two-hands.json` and `phase62-descent-frames.json`. Use the existing
`browser/measure.mjs` command with `BENCH_HANDS=1` or `2` sequentially.


## Phase 6.3 — floating UI and Memory Peek 2.0

Final runs were sequential and separate from browser tests/builds, using Chrome
157.0.8103.38 at 1920×1080, one synthetic 640×480 camera and mocked worker results.
Both levels, one and two detected hands, were measured with the same harness.
These measure browser scheduling and result-to-DOM work, not actual MediaPipe
inference, physical camera latency or sustainable device frame rate.

| Warm 6.5 s sample | Frame p95 | Frame p99 | >25 ms frames | Root commits | Result → DOM p95 | Post-GC JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Level 1, 1 hand(s) | 16.8 ms | 16.8 ms | 1/388 | 0 | 0.3 ms | 7.52 MB |
| Level 1, 2 hand(s) | 16.8 ms | 33.3 ms | 6/384 | 0 | 0.4 ms | 7.52 MB |
| Level 2, 1 hand(s) | 16.8 ms | 16.8 ms | 3/386 | 0 | 0.5 ms | 7.60 MB |
| Level 2, 2 hand(s) | 16.7 ms | 16.8 ms | 2/387 | 0 | 0.4 ms | 7.61 MB |

Warm p95 remains in the prior 16.7–16.8 ms range. Pointer motion caused zero root
commits in every run. Level 1/two-hand p99 reached 33.3 ms; slower frames remain,
and short historical comparisons cannot establish a performance improvement.
Entry-window commits are meaningful phase/completion changes rather than pointer
renders. All four End Session checks detached the stream and hid the cursor.
Post-End GC heap was approximately 7.50–7.55 MB; short samples do not prove leak
freedom or capture native/GPU memory, sustained heat or real tracking jitter.

Independent production JS: 292.09 KB / 91.79 KB gzip; CSS about 25 KB. No dependency
added. Existing root-build large-chunk warning is unchanged.

The real Chrome descent test recorded 74 geometry frames over about 1.20 seconds;
all four card animation events reported 0.8 s, with 0.12 s stagger. Its sampled
frame-interval p95 was 17.8 ms including geometry/screenshot overhead. Per-frame
reference checks at all five viewports found no instruction overlap after the
motion path was corrected. This is separate from the warm benchmark.

Raw files: artifacts/card-matching/phase63-level{1,2}-{1,2}-hand.json,
phase63-descent-frames.json and phase63-flow-*.json.

Reproduce one combination (run combinations sequentially):

```sh
CARD_MATCHING_BASE_URL=http://127.0.0.1:5176 BENCH_MEMORY=1 BENCH_HANDS=2 node src/games/jayanth-card-matching/browser/measure.mjs artifacts/card-matching/phase63-level2-2-hand.json
```

Use BENCH_MEMORY=0 for Direct Match and BENCH_HANDS=1 for one hand.


## Phase 6.4 — gentle pacing and persistent card faces

Chrome 157.0.8103.38, 1920×1080, synthetic 640×480 canvas and controlled worker
results, no real MediaPipe inference. Four final runs were sequential, after
browser tests and builds had finished. The harness now waits for actual selection
and then allows one second to settle before the steady 6.5-second sample. The
longer Memory Peek preview must not be mislabeled as warm answer selection.

| Steady 6.5 s sample | Frame p95 | Frame p99 | >25 ms frames | Root commits | Result → DOM p95 | Post-GC JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Level 1, 1 hand(s) | 16.8 ms | 33.3 ms | 5/384 | 0 | 0.6 ms | 8.03 MB |
| Level 1, 2 hand(s) | 16.7 ms | 16.8 ms | 2/387 | 0 | 0.4 ms | 8.04 MB |
| Level 2, 1 hand(s) | 16.8 ms | 33.2 ms | 4/385 | 0 | 0.5 ms | 8.14 MB |
| Level 2, 2 hand(s) | 16.7 ms | 16.8 ms | 3/386 | 0 | 0.5 ms | 8.14 MB |

Steady pointer movement caused zero root commits. Both Memory Peek runs had one
commit during the preceding settling second; Level 1 had zero. Initial immediate-
after-selection samples likewise included one Memory Peek commit. Those initial
raw measurements are retained as phase64-immediate-level*.json rather than hidden.
One initial two-hand Memory sample had a 49.6 ms result-to-DOM p99 outlier; slower
frames/latency tails remain possible. Final warm p95 remains in the historical
16.7–16.8 ms range, with occasional ~33 ms p99 frames. No locked-60-fps claim.

Final JS heap after GC was ~8.03–8.14 MB, versus ~7.52–7.61 MB in Phase 6.3's
historical samples. Both persistent faces and changed wait/instrumentation differ;
these short runs cannot assign the difference to one cause or establish leak
freedom. Post-End heap was about 8 MB and all four runs stopped/detached the stream
and hid the cursor. Native/video/GPU texture memory, sustained heat, physical
capture-to-display delay and actual tracking jitter/inference are not measured.

Independent JS: 295.00 KB / 92.61 KB gzip (Phase 6.3: 292.09 / 91.79 KB); CSS
26.68 KB / 6.03 KB gzip. No added dependency. Root large-chunk warning unchanged.

Real motion evidence separately verifies four 1.5-second descents, 0/400/800/1200 ms
CSS delays, four .9-second closing events, a 10.005-second Standard face-up preview,
and real animation-completion locks. Full prompt geometry was sampled at five TV
viewports without instruction overlap. This includes screenshot/geometry overhead
and is not interchangeable with the steady pointer benchmark.

Raw artifacts: phase64-level{1,2}-{1,2}-hand.json, phase64-immediate-level*.json,
phase64-motion.json, phase64-descent-frames.json and phase64-flow-*.json under
artifacts/card-matching/. Run each benchmark combination sequentially, e.g.:

```sh
CARD_MATCHING_BASE_URL=http://127.0.0.1:5176 BENCH_MEMORY=1 BENCH_HANDS=2 node src/games/jayanth-card-matching/browser/measure.mjs artifacts/card-matching/phase64-level2-2-hand.json
```

Use BENCH_MEMORY=0 for Direct Match and BENCH_HANDS=1 for one hand.
