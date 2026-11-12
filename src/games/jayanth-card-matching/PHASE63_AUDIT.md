# Phase 6.3 — Look, Remember, Match

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


## Scope and diagnosis

Reviewed Card Matching's session reducer, hand/dwell adapter, speech flow,
styles, image preloading, skyline, Phase 6.1/6.2 audits and performance reports;
read Balloon Popper's App and HUD styles as a visual benchmark. The old Level 2
used Level 1's reveal/narrate/move sequence before preview, exposing the target.
Its flip completion transitioned directly to selection, allowing a stationary
pre-positioned palm to start dwell immediately when cards became enabled.

The small maintainable change is confined to the existing reducer, UI, pointer
adapter and scoped CSS. No new animation library, network API, shared component
imports, camera/model changes or dependencies. All catalogues/credits retained.
Balloon Popper source and behaviour remain unchanged. No Git branch switch,
commit, push, merge or application integration.

## State machine and timing

Level 1: `reveal → settling → falling → answering → success → next round`.
It retains target-first matching, four answers, eligible-slot randomisation and
no immediate reference repeat. Descent is now 800 ms per card, 120 ms stagger.

Level 2 starts directly in `falling`, with no reference panel in the DOM:

| State | Resident view | Exit/input barrier |
|---|---|---|
| falling | Four equal face-up cards arrive; “Look carefully at the pictures!” | 1160 ms plus all four landing events; all selection disabled |
| previewing | Same four face-up cards, target unknown | Full 3000 ms after landing; selection disabled |
| flipping | All four cards close over 600 ms | Clock AND four real back-animation completions |
| revealingTarget | Target first appears/narrates; moves to top-left over 1000 ms | Clock AND actual Web Animation finish callback |
| selecting | Reference remains; four neutral closed backs | Fresh hover or explicit mouse/key/touch activation |
| feedback | Wrong card opens/greys; others remain closed | 1200 ms before another attempt; rejected card remains disabled |
| success | Correct card opens/greens; skyline lights | 2000 ms minimum, then next round |

`motion` and `phaseDuration` in session.ts centralise the timings; CSS descent,
stagger and flip consume those values. No response countdown. Reduced motion
removes travel/rotation, uses a short 100 ms logical gate and retains preview,
privacy and selection locks. The real completion barrier is retained for the
target, including its zero-duration reduced-motion Web Animation.

The reducer checks phase, pause, known answer ID, rejection and round revision.
Both clocks and actual animation completions must agree; timers alone cannot
unlock selection. Pausing freezes the interval clock, CSS motion and reference
Web Animation. Home/End/Restart cancel speech, reference animation and preloading;
round revisions remain monotonic across Home/Restart, and old phase/round animation callbacks are rejected. No answer reshuffle after hide.

## Privacy and speech

Before target reveal, the reference is not rendered; instruction is neutral;
all preview cards have equal prominence. No correct-card highlight or target
name is supplied in the instruction, hover text or live status. During closing,
fronts are aria-hidden; when closed, their content images/labels are removed.
All backs use the same green/gold design and generic numbered accessible buttons.
The preview necessarily shows all four item names equally; none is identified as
the target. Internal `data-answer` test identifiers are not accessible labels.

Memory starts with neutral English narration. The target-specific utterance is
requested only in revealingTarget, after all backs close. Staff Repeat cannot
expose the target during early phases. Existing local English voice selection,
recording priority, errors, cancellation and Test Voice remain in place. No
Mandarin/multiplayer paths added. Speech API mocks prove request ordering, not
actual speaker output. Human recordings remain an available extension point.

## Hand rearming and input parity

Every phase/revision/pause transition clears dwell. If a palm is already over an
answer when memory selection becomes available, that answer is blocked until the
palm leaves its hit region. Moving into a different card also rearms naturally.
A new dwell of at least 1000 ms is then required, even with staff's 800 ms setting.
No accumulated preview/flip/reveal hover time survives. No new gesture is needed.
Menus still use the existing stable active-hand selector and independent dwell.
Mouse/keyboard/touch share disabled buttons and reducer canSelect checks; dispatched
synthetic events cannot bypass them. A wrong answer is consumed and disabled,
preventing duplicate choices while the remaining backs stay closed.

## Visual refinement

Balloon Popper's restrained floating HUD, pill silhouettes, shadow hierarchy and
spacing informed the design; no Balloon gameplay components are imported.
Cream instruction pill, rounded floating reference, pill Staff/Recenter controls,
large photo tiles, forest-green/gold uniform backs and gentle feedback form one
palette. Photos retain whole subjects using contain; no arbitrary cropping or
new asset replacements. The reference is absent during Memory's early phases,
keeping the central mirror clear. The skyline blends into a warm bottom gradient
instead of an outlined rectangular panel. Existing vector landmarks, 5/10-stage
increments, continuous-cycle logic and bounded screen warmth remain intact.

Camera remains one mirrored edge-to-edge cover video, with existing staff pan,
exact coordinate mapping and assisted reach. No blur or video processing. Cover
necessarily crops a mismatched aspect ratio: physical framing still matters.
CSS transforms/opacity handle motion; pointer frames use imperative DOM updates.
Decoded images are prepared before a round; next-round images remain prefetched.

## Verification and evidence

Final results and measurements are recorded below after the complete checks.

Screenshots and synthetic-only flow metadata are under artifacts/card-matching:
`phase63-arriving-*`, `phase63-preview-*`, `phase63-target-*`,
`phase63-selection-*`, `phase63-success-*`, `phase63-fullscreen-*`,
`phase63-staff-*`, `phase63-flow-*.json`. Existing Level 1 layout tests also
capture the upgraded styles. Test camera artwork is synthetic, not a resident.
The camera fixture's coloured side bands belong to its source image; they are
not application margins.

## Physical review still required

Staff should test speaker audibility with English Test Voice, browser camera
permissions, real one/two-hand MediaPipe acquisition, stationary/occluded palms,
seated reach, lighting, crop/framing, TV scaling/contrast and photo recognition.
No clinical usability study or actual-device 60 fps claim is made. Synthetic
worker tests cannot measure actual model inference/capture/thermal behaviour.
Use the familiar catalogue first; review extended photos with residents/staff.

Preview: http://127.0.0.1:5176/src/games/jayanth-card-matching/index.html
Start locally with `npm run dev -- --port 5176` from the repository root.

## Exact source/document files changed in this phase

All paths below are relative to src/games/jayanth-card-matching/.

- CardMatchingGame.tsx — target privacy, guarded narration/repeat, completion-gated target motion, monotonic revision IDs, timing properties and consolidated feedback.
- CardMatchingGame.module.css — floating pill HUD, photo framing, neutral backs, hand/mouse emphasis and transform motion.
- session.ts — central timings, memory-first entry, revealingTarget state and completion barrier.
- useHandPointer.ts — phase-boundary leave/re-enter lock and imperative hover highlight.
- memory.test.ts — phase, pause, completion, stale-callback and wrong-answer tests.
- browser/memory.spec.ts — no early target, real flip barrier, pre-positioning/reentry and one-second minimum dwell.
- browser/immersive.spec.ts — refined descent timing/motion assertions.
- browser/phase6.spec.ts — new memory privacy/sequence expectation.
- browser/phase63.spec.ts — real complete flow, narration ordering, per-frame prompt overlap, five viewport sizes, all-phase pause, restart/end and stalled target animation.
- browser/measure.mjs — optional BENCH_MEMORY=1 benchmark mode.
- README.md — current gameplay and timing documentation.
- PERFORMANCE.md — final synthetic measurements.
- PHASE63_AUDIT.md — this report.

Generated screenshots, flow metadata and benchmark JSON files live under
artifacts/card-matching/. Build/test outputs are ignored; no dependency/config,
photo/credit, shared camera/worker or Balloon Popper source files changed.

## Final results

- Card Matching: 48/48 unit tests pass.
- Full Card Matching browser run: 59/59 pass (7.1 minutes).
- After screenshot-led reference-path correction, monotonic revision hardening
  and hand-hover emphasis: 20/20 affected browser cases pass (2.9 minutes),
  including one new stalled-target test. Total: 60 distinct browser cases pass
  across the full run and focused follow-up.
- Balloon Popper unchanged regression suite: 9/9 unit and 7/7 browser tests pass.
- Final TypeScript check and both production builds pass. Existing root large-
  chunk warning remains. No tracked changes outside the game folder; no branch
  change or Git publication operations.

Screenshot inspection caught a transient overlap between the moving reference
and instruction pill that stationary layout assertions missed. Reference motion
now takes a compositor-only waypoint below the pill before moving up at the left.
New frame-by-frame geometry assertions verify no overlap at 1920×1080, 1366×768,
1280×720, 2048×700 and a toolbar-reduced 1280×620 viewport. Each records 67–68
prompt samples, with zero overlaps. A stalled actual target animation remains
locked after its duration expires, until it really completes. Descent evidence
records all four 800 ms animation completions and stable second-round landings.

An initial narration test double needed to mock SpeechSynthesisUtterance as well
as the service (native Chrome rejects a plain object assigned as a voice). The
corrected API test proves utterance timing but does not verify audible playback.

| Warm 6.5 s sample | Frame p95 | Frame p99 | >25 ms frames | Root commits | Result → DOM p95 | Post-GC JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Level 1, 1 hand(s) | 16.8 ms | 16.8 ms | 1/388 | 0 | 0.3 ms | 7.52 MB |
| Level 1, 2 hand(s) | 16.8 ms | 33.3 ms | 6/384 | 0 | 0.4 ms | 7.52 MB |
| Level 2, 1 hand(s) | 16.8 ms | 16.8 ms | 3/386 | 0 | 0.5 ms | 7.60 MB |
| Level 2, 2 hand(s) | 16.7 ms | 16.8 ms | 2/387 | 0 | 0.4 ms | 7.61 MB |

All four benchmark runs cleaned up stream and cursor. See PERFORMANCE.md for
reproduction, tail-frame variability and measurement limitations. No real-model,
clinical-usability, sustained-leak or locked-60-fps claims are made.

## Screenshot gallery

- Level 1 (`../../../artifacts/card-matching/phase63-level1-1920-1080.png`, generated locally)
- Memory cards arriving (`../../../artifacts/card-matching/phase63-arriving-1920-1080.png`, generated locally)
- Memory face-up preview (`../../../artifacts/card-matching/phase63-preview-1920-1080.png`, generated locally)
- Closed answer row (`../../../artifacts/card-matching/phase63-closed-1920-1080.png`, generated locally)
- Target moving into place (`../../../artifacts/card-matching/phase63-target-1920-1080.png`, generated locally)
- Memory selection (`../../../artifacts/card-matching/phase63-selection-1920-1080.png`, generated locally)
- Correct answer and skyline (`../../../artifacts/card-matching/phase63-success-1920-1080.png`, generated locally)
- Staff Controls (`../../../artifacts/card-matching/phase63-staff-1920-1080.png`, generated locally)
- Fullscreen gameplay (`../../../artifacts/card-matching/phase63-fullscreen-1920-1080.png`, generated locally)

Ultrawide selection (`../../../artifacts/card-matching/phase63-selection-2048-700.png`, generated locally), 720p target transition (`../../../artifacts/card-matching/phase63-target-1280-720.png`, generated locally), toolbar-reduced Staff Controls (`../../../artifacts/card-matching/phase63-staff-1280-620.png`, generated locally).

Final evidence refresh: all five complete real-animation flow/layout cases passed again (48.7 seconds), with mid-descent screenshots captured after picture decoding. Screenshots were inspected directly, including the corrected transition, ultrawide selection and compact Staff Controls.
