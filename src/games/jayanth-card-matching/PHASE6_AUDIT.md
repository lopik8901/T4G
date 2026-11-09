# Phase 6 engineering refinement — 8 November 2026

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


## Findings and implementation

**Wrong-hand root cause:** `CardMatchingGame.tsx` previously called `useMirror(1)`;
`useHandPointer.ts` selected `frame.hands[0]`. The shared worker already accepts
`numHands: data.hands`, so the game limited the detector to one candidate and
provided no intent selection. The shared hook smooths nearest palms but has no
persistent identity in its public frame. Its worker does not supply confidence
or handedness. These are inspected code facts, not assumptions about phones.

The new game-local adapter requests two candidates from the same worker/model.
`HandSelector` associates predicted positions across array reordering, scores
sustained movement, and locks a selected hand while it operates a control.
Stationarity during dwell does not trigger a switch. Missing/stale hands cancel
dwell; loss does not silently transfer to a stationary remaining hand. Deliberate
movement or explicit staff assignment reacquires control. Overlapping palms fail
closed instead of pretending geometric association can reliably identify them.
Partial model output with invalid/missing landmarks is rejected. The system
cannot identify an undetected phone-obscured hand. No phone classifier, biological
handedness assumption, face recognition or resident identification is used.

Staff-only diagnostics show visible count, transient hand IDs, movement, controlling
ID, freshness and selection/rejection reasons. Confidence is explicitly unavailable.
The latest capture/worker round trip includes bitmap/transfer/inference overhead;
it is not labelled pure inference latency. No video or detailed tracking history
is saved. Association is geometric and still needs physical validation, especially
crossing paths, abrupt movements and occlusion.

**Mandarin evidence:** no Git history exists for this untracked game folder, so
there is no verifiable earlier working revision to compare. Earlier inspected
code allowed remote voices; Phase 5 restricted selection to voices with
`localService === true`. That can remove a previously used voice, but does not
prove that the user's earlier voice was remote. The earlier six-second watchdog
also misclassified slow startup as permission denial. Local-only matching,
asynchronous discovery and cancellation guards are retained; a completion event
is now explicitly described as audibility-unverified. A headless voice probe
returned an empty list in one short sample; this does not establish what the
interactive Mac/Chrome exposes after loading or voice installation.

Approved bundled recordings take priority, then a compatible local system voice.
Only same-origin recording URLs are accepted. Mandarin never substitutes English.
There are separate English/Mandarin preview controls, volume settings, late-voice
retry and English missing/error diagnostics. Missing clips report failure before
trying matching local synthesis. `recording-manifest.json` lists 234 required
clips with exact text, filenames and missing status; **none has been supplied**.
[RECORDINGS.md](RECORDINGS.md) includes verified Apple setup guidance and the
mandatory listening checklist. Audible Mandarin is an outstanding manual dependency,
not a claimed success from mocks or speech events.

## Interface and gameplay

The resident view has one instruction, persistent reference, four large answers,
a separate contained mirror, a dedicated Singapore scene and one Staff Controls
button. The split is approximately 31% camera / 66% matching, with a 2×2 grid.
Images use contain framing. The small preview marker aligns with the mirrored
palm; the large selection pointer maps mirrored motion over the full interface.
This explicit mapping permits selecting cards outside the camera column and
supports seated recenter/reach calibration. It is not falsely described as a
literal palm overlay on the answer area.

Staff Controls pauses play and confines dwell hit testing to the native modal.
It includes Resume, Repeat, Skip, Restart confirmation, audio/inactivity settings,
camera device selection, calibration, hand assignment/diagnostics, fullscreen,
Home, End Session confirmation and credits. The overlay, subpanels and confirmations
retain mouse/touch/keyboard/dwell operation. Browser-owned prompts still need staff.

Default answering inactivity is 30 seconds, warning around 25. Meaningful movement
and actions reset it; tiny jitter does not. Loading, permission waits, animations,
pauses and dialogs exclude idle time. Return Home retains the single stream and
worker; End Session terminates them and audio. The previous Exit confusion has
been removed from the resident view.

Target reveal uses decoded imagery and FLIP transforms. Answers enter with short,
staggered ease-out motion instead of falling across the viewport. Input stays
locked until entry completes. Reduced-motion alternatives avoid travel/flip effects.
Each success illuminates a skyline stage and modestly warms the background;
five/ten progression, persistence and restart resets retain full regression checks.

Optional Level 2 gives a three-second peek, flips answers face-down, keeps the
reference visible, greys wrong choices and offers staff Reveal cards again.
Optional two-player mode is **staff-assisted**: assign/confirm each turn, alternate
after a round and share the skyline. An assigned hand is required for hand input;
loss requires reassignment. Mouse/touch turns require staff supervision because
these devices cannot identify which resident clicked. No automatic multiplayer
identity reliability is claimed. Single-player Direct Match stays the default.

## Layout/content review

Bounding-box checks cover 1920×1080, 1366×768, 1280×720 and a shorter 1280×620
window. Existing reveal, wrong/correct, settings, completion and fullscreen checks
were adapted to the new overlay/split while retaining their gameplay assertions.
Screenshot review caught an opaque camera placeholder hiding the stream and an
overly crowded short-window setup; layering was corrected and Level/Players/pool
choices moved into Game Options. An invalid label on a generic camera element
was fixed after axe reported it. These were implementation findings, not ignored
visual failures.

All 50 animal and 50 fruit photos were inspected in local contact sheets. The
12-colour catalogue and near-shade exclusions remain. Familiar items are now the
default pool; the extended catalogue is preserved. Tree-grown fruits and partial
animal representations in the extended pool still need recognition review. No
new photos, changed licences, generated human recordings or resident testing are
claimed. Reference and correct choice use the same representation.

Screenshots in `artifacts/card-matching/` use a synthetic camera figure:

- `phase6-home-{width}-{height}.png`: Home, including short browser window.
- `phase6-level1-*`: mirrored preview, reference and 2×2 answers.
- `phase6-staff-*`: paused management overlay.
- `phase6-success-*`: feedback and illuminated skyline.
- `phase6-memory.png`: face-down Memory Peek.
- `phase6-content-animals.png`, `phase6-content-fruits.png`: complete asset review.

Legacy regression screenshot filenames may be regenerated by the current suite;
they should not be treated as immutable historical before-images.

## Changed files in this phase

New runtime/data: `useGameMirror.ts`, `tracking.ts`, `TrackingPanel.tsx`,
`recording-manifest.json`.

Changed runtime: `CardMatchingGame.tsx`, `CardMatchingGame.module.css`,
`useHandPointer.ts`, `session.ts`, `speech.ts`, `useSpeech.ts`, `vite.config.ts`.

New tests: `tracking.test.ts`, `expanded.test.ts`, `browser/phase6.spec.ts`,
`browser/audio-assets.spec.ts`.

Updated verification: `browser/helpers.ts`, `browser/game.spec.ts`,
`browser/audit.spec.ts`, `browser/fixes.spec.ts`, `browser/measure.mjs`.

Documentation: `README.md`, new `RECORDINGS.md`, this report; current measurements
are appended to `PERFORMANCE.md`. Generated screenshots/measurements live under
ignored `artifacts/card-matching/`.

No Balloon Pop source, shared camera hook/worker or root build configuration was
changed. No branch switch, commit, push, merge, deployment or unified app integration.

## Manual acceptance checklist

- Use the intended TV and externally mounted USB webcam, with seated staff first.
  Verify face/upper body, overscan, fullscreen and a reduced-height Chrome window.
- One visible hand: acquire, reach all four cards, hold steadily for one second,
  move directly between adjacent wrong/correct cards and test calibration/dwell.
- Two visible hands: keep one stationary, move the intended hand; verify the
  selected ID and pointer. Repeat with the phone in either hand and partly obscuring
  the hand. If the intended hand is not detected, confirm there is no invented input.
- Cross hands, occlude/remove the active hand and reintroduce it. Confirm dwell
  cancels, no stationary-hand substitution occurs and reacquisition/assignment works.
- Operate Staff Controls, settings, camera selection, Resume, Restart/End confirmations
  entirely by dwell where browser permission allows. Check there is no answer
  pass-through. Test mouse/touch/keyboard staff overrides.
- Wait idle: warning around 25 seconds, Home at 30, camera still active; restart
  by hand. Check disabled/60-second settings and pausing during dialogs/loading.
- Follow the separate English/Mandarin offline listening checklist in RECORDINGS.md,
  using the actual demonstration TV speakers. Verify every familiar target phrase,
  comfortable volume, missing assets and cancellation/language changes.
- Run both supervised player turns with explicit hand assignment; remove the
  assigned hand and confirm the other cannot answer until reassigned. Test staff
  mouse/touch turn mode. No competitive scoring should appear.
- Test Memory Peek's three-second preview, accessible hidden faces, repeated reveal,
  calm retries and reduced motion. Validate recognition and comfort with KWSH staff.
- Run a sustained real inference session for heat, capture-to-display latency,
  frame consistency and native/GPU/process memory. Synthetic results are insufficient
  for an on-hardware performance guarantee or clinical suitability claim.

Current preview: **http://127.0.0.1:5176/src/games/jayanth-card-matching/index.html**.

## Final verification results

- **38/38 Card Matching unit tests passed**, including raw association order,
  movement preference, stationary dwell identity, crossing ambiguity, loss,
  no stationary-hand transfer, staff assignment, player isolation, Memory Peek,
  exact bilingual target manifests and remote recording URL rejection.
- **47/47 distinct game browser cases passed across the full run and targeted
  follow-ups.** The full 41-case suite passed; two acceptance regressions and
  the explicit fullscreen case, a 4:3 seated-calibration transition case and two camera-selection cases were subsequently added and passed. An
  11-case hand/geometry/navigation run passed after moving smoothing after raw
  identity association. The two-hand acceptance test actually completes the
  correct-card dwell, removes the active hand mid-dwell to verify cancellation,
  and reacquires without transferring input to the stationary candidate.
- Local recording priority, volume, missing-file fallback, English/Mandarin
  switching, late voice discovery, startup timeout and stale callbacks passed
  with controlled API fixtures. A late cancellation callback cannot erase the
  startup-timeout diagnostic. **No audible Mandarin verification occurred.**
- **9/9 Balloon Pop unit and 7/7 unchanged browser regressions passed**.
- TypeScript/root production build and isolated game production build passed.
  The existing root large-chunk warning remains. Diff whitespace checks passed;
  the tracked diff outside this game folder is empty. The game remains untracked
  and uncommitted on the existing branch.

Early implementation runs found camera-border measurement assumptions, an ARIA
role issue, a recording-test module-instance mismatch and dialog-transition test
races. These were corrected and affected cases rerun. Tests wait for the specific
confirmation heading before dwelling on its confirm control. None of these
failures is presented as an audible-speech or hardware test result.

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

Final warm runs each contained one >25 ms frame, with result-to-DOM p99 of
0.7/14.9 ms respectively. This is synthetic delivery-to-DOM latency, not sensor
latency. The historical comparison is not a simultaneous controlled experiment.
[PERFORMANCE.md](PERFORMANCE.md) contains raw-file references, cold-window details,
tail timings and reproduction commands. Real inference time, two-hand hardware
cost, capture overhead, thermal behaviour and long-run native/GPU memory remain
unmeasured here. End Session cleanup passed in both benchmark runs.

A subsequent 13-case hand/layout/navigation run passed after unifying full-camera
coordinates across Home, dialogs and gameplay. The new calibration test verifies
that a seated 4:3 camera position remains centred after starting a game. The small
preview marker continues to use the actual contained-video geometry.

Additional changed files: `localisation.ts` (gentler spoken retry prompts),
`mirror.ts` (updated mapping comment). Final screenshots also include
`phase6-memory-{1920,1280}.png` and `phase6-fullscreen-1920.png`.

Camera selection was additionally verified in single- and two-player modes. It
releases the previous stream; cooperative mode pauses for fresh hand assignment
after the camera reset. Leaving hand diagnostics without an assigned player hand
is prevented. The final four-case camera/cooperative regression run passed.
