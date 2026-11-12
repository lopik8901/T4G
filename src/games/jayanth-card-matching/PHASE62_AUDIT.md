# Phase 6.2 — immersive fullscreen redesign

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


## 1. Invisible descent: diagnosis and fix

The previous normal-motion rule started only **48 pixels** above the final row,
with an opacity fade. It could look like a fade-in in place rather than falling
from the top. Reduced-motion CSS intentionally disabled travel altogether. The
answer grid was shown and its animation class applied together; there was no
per-card landing barrier, only an elapsed-time transition. There is no evidence
that React mounting itself prevented the old animation from starting.

Normal-motion cards now start fully above the viewport using a compositor transform
of `translateY(calc(-100dvh - 100%))`. Four 1.8-second ease-out descents start with
0.12-second stagger; the final animation takes 2.16 seconds including its delay.
`animation-fill-mode: both` holds each delayed card above the viewport until its
own start. Round-specific DOM keys reliably create a fresh animation each round.
The reference is decoded/revealed/narrated, then moved into its top-left position
before the answer entry begins.

The `falling` state requires both its 2.2-second clock AND all four actual landing
callbacks before enabling input. Stale/duplicate callbacks cannot unlock a later
round. A paused last card keeps every answer disabled even after the clock expires.
Reduced motion keeps cards static, with a short input gate instead of travel. It
is deliberately not overridden for a demonstration; check the OS preference if
normal Chrome shows no travel.

`browser/immersive.spec.ts` measures real Chrome animation events and element
positions without advancing a fake animation clock. It verifies above-screen
starts, visible displacement, stable final positions and a second-round descent.
A separate test pauses only the last card to exercise the real completion barrier.

Frame sequence: `artifacts/card-matching/phase62-descent-early.png`,
`phase62-descent-middle.png`, `phase62-descent-landed.png`.
`phase62-descent-frames.json` records only synthetic test element positions/times
and animation elapsed times, not camera footage or hand histories.

## 2. Fullscreen camera and mapping

The existing single video element/stream now covers **0,0 to viewport width/height**,
including ultrawide 2048×700. Gameplay removes the old padded video frame and uses
`object-fit: cover`, with no stretching, blur, duplicate camera stream or video
processing effect. The coloured side bands in screenshots belong to the synthetic
camera fixture; they are not empty application side panels.

Staff Controls → Camera Settings offers vertical/horizontal framing presets and
Mirror aligned / Assisted reach pointer modes. Upper-body framing is the default.
A pure geometry helper applies the same cover scale, object-position crop and
horizontal mirror as CSS. The default large pointer is literally aligned to the
displayed palm; off-crop palms cannot activate visible answers in that mode.
The small palm marker uses the same geometry. Dialogs use assisted menu reach.
Recenter deliberately enables assisted reach for seated use, explained in its
panel; staff can restore literal alignment in Camera Settings. Sensor calibration
is preserved independently of framing, so it remains usable in assisted mode.

Cover must crop when source/screen aspect ratios differ. Pan controls can favour
the resident's face or hands, but cannot display an entire 4:3 frame on a 2048×700
screen without cropping, distortion or gaps. No automatic face detection/identity
recognition is introduced. Real seating position, framing and camera angle still
need staff verification. If a hand is outside the visible crop, use staff framing
or assisted reach; do not claim it is undetected merely because it is not displayed.

## 3. Picture tiles and hierarchy

The resident screen has reference top-left, one instruction top-centre, Staff
Controls top-right, four centred picture tiles below, compact skyline bottom-left
and Recenter Hand as the only bottom action. Other management stays inside the
hand-operated modal. The reference image is larger; final tiles are capped at a
1360-pixel row rather than expanding into huge horizontal containers on ultrawide
screens. Their tall image region occupies most of each tile, with a restrained
matte, equal sizes, rounded border and static shadow. `contain` retains whole
subjects and the same photograph as the reference rather than cropping animals.
No photo assets or licences changed.

Ordinary answering status text is removed. Landmark progress uses a compact lit
count/short unlock caption and gold illumination instead of a large explanatory
rectangle. A bounded screen-wide warm tint also affects the live video, not just
the hidden application background. It changes only after matches and introduces
no continuous video filter or expensive blur.

## 4. Answer-position reshuffling

Target selection still excludes the previous reference and favours least-used
items/familiar content. Distractors are distinct and respect colour conflicts.
The correct slot is selected uniformly from the three positions excluding the
previous correct slot; distractors use Fisher–Yates ordering. New sessions have
four eligible starting positions. Both prepared next rounds and synchronous Skip
fallbacks receive the previous slot, and the reducer rejects a prepared immediate
repeat. There remains exactly one matching answer.

Seeded tests exercise 24,000 eligible-slot draws, uniqueness, exclusion and balanced
counts. Existing category tests now also assert slot non-repetition. Browser
five/ten-round skyline tests verify the rendered correct slot changes each round.

## 5. Preserved behaviour

English-only, single-player Animals/Fruits/Colours, both levels, optional local
English audio, two-hand detection/one selected identity, wrong-answer greying,
no penalties, cached decode/preloading, hand-operated management, 30-second idle
Home return, camera persistence on Home and camera release on End Session remain.
Memory Peek still waits for all flips, then resets dwell for a full second.
Nothing records/uploads camera footage. Balloon Pop and shared camera/worker code
remain untouched. No branch switch, commit, push, merge or integration was performed.

## 6. Files changed

Runtime: new `framing.ts`; `CardMatchingGame.tsx`, `CardMatchingGame.module.css`,
`useHandPointer.ts`, `logic.ts`, `session.ts`.

Tests: new `immersive.test.ts`, `browser/immersive.spec.ts`; updated
`logic.test.ts`, `session.test.ts`, `memory.test.ts`, `browser/helpers.ts`,
`browser/audit.spec.ts`, `browser/fixes.spec.ts`, `browser/game.spec.ts`,
`browser/phase6.spec.ts`.

Documentation: `README.md`, this report and the new current section in
`PERFORMANCE.md`. Generated screenshots/timing JSON live in ignored artifacts.

## 7. Physical acceptance still required

- Check the intended TV/USB webcam at native resolution and actual browser scaling,
  including ultrawide use. Adjust camera height/angle and framing so the face and
  comfortable hand movements remain visible above/between cards.
- Verify mirror-aligned palm/cursor positions after resize and pan; try Assisted
  reach/Recenter with seated staff. Test hands outside the crop, hand loss,
  crossings, a phone obscuring a hand, steady dwell and adjacent cards.
- Watch multiple real rounds with normal motion. Confirm clear above-screen entry,
  smooth deceleration and no selection until every card lands. Check reduced motion
  separately; then test Memory Peek preview, every flip, pause/resume and fresh dwell.
- Operate staff panels/confirmations by hand. Verify idle warning/Home return keeps
  the camera active, another game can start by hand, and End Session releases it.
  Browser-owned permission/fullscreen prompts may require a physical click.
- Listen to English Test Voice/phrases through the actual TV speakers, offline,
  including mute/volume/cancellation/missing assets. No human recordings are supplied.
- Run a sustained real-inference session for capture-to-display latency, thermal
  behaviour and native/GPU/process memory. Synthetic browser results cannot establish
  audible playback, clinical suitability or real webcam reliability/performance.

Current preview: **http://127.0.0.1:5176/src/games/jayanth-card-matching/index.html**.


## 8. Final checks and measurements

- **46/46 Card Matching unit tests passed.**
- **48/48 distinct current Card Matching browser cases passed across the full run
  and focused follow-ups.** The first full 46-case run passed 42 and found four
  genuine overlap failures: reveal feedback intersected the enlarged reference,
  and a wrapped inactivity warning extended into the answer row. The redundant
  reveal message was removed; feedback is anchored by its bottom edge above the
  cards. A 12-case layout/warning/descent rerun passed. Two additional camera-panel
  reachability cases passed at 2048×700 and 1280×620, including dwell on Done.
- Screenshot inspection prompted a stacking correction so falling tiles pass behind
  the instruction/reference rather than covering their text. The real descent
  case passed again with instruction paint-order checks throughout the frame sample.
- **9/9 Balloon Pop unit and 7/7 unchanged browser regressions passed.**
- TypeScript/root production build and independent game build passed. The existing
  root large-chunk warning remains. Diff whitespace checks passed; the tracked
  diff outside this game folder is empty. The game remains uncommitted/untracked
  on the existing branch.

| Warm 6.5-second sample | Phase 6.1 one hand | Phase 6.1 two hands | Phase 6.2 one hand | Phase 6.2 two hands |
| --- | ---: | ---: | ---: | ---: |
| Frame p95 | 16.7 ms | 16.8 ms | 16.8 ms | 16.7 ms |
| Frame p99 | 33.3 ms | 16.8 ms | 16.8 ms | 16.8 ms |
| Frames >25 ms | 5/384 | 2/387 | 2/388 | 3/386 |
| React root commits | 0 | 0 | 0 | 0 |
| Worker-result → DOM p95 | 0.6 ms | 0.4 ms | 0.6 ms | 0.5 ms |
| Post-GC JS heap | 7.42 MB | 7.42 MB | 7.49 MB | 7.49 MB |

The final real-time descent sample contained 140 frame-position samples across 2.32 seconds. All four animation events reported 1.8-second travel; sampled frame-interval p95/p99/max were 17.9/19.7/26.2 ms. The heading stayed topmost at the sampled instruction point throughout.

These are synthetic video/worker measurements, not evidence of audible English,
real two-hand inference performance or physical palm-to-screen latency.
[PERFORMANCE.md](PERFORMANCE.md) records raw files, entry-render counts, cleanup
and measurement limits. All screenshots depict a synthetic figure. Additional
camera-panel screenshots are `phase62-framing-{width}-{height}.png`.
