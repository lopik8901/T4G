# Phase 6.1 simplification and layout audit

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


## Changes and root causes

Memory Peek previously changed directly from its three-second preview to the
input-enabled state. CSS then began rotating the cards, so mouse/touch/keyboard
and dwell could act before closure. There was no completion barrier or fresh dwell
boundary tied to closure.

The state model now explicitly separates **previewing, flipping, selecting and
feedback**. A selecting transition requires the flip clock AND completion callbacks
from all four individual card-back animations. Duplicate, unknown and stale-revision
callbacks are ignored. Reduced motion supplies explicit completions without animated
rotation, while retaining the state gate. Pausing freezes the clock and CSS timeline;
actual completion events can be retained while paused without enabling input.
All input routes use the same `canSelect` guard. Answer elements remain disabled
through preview/flip. The pointer's dwell state resets at selection start, with a
minimum one-second hover for Memory Peek. Disabled time cannot count toward it.

Face-down answers have generic position labels, no rendered target images/names,
and no answer-specific accessible labels. Only the selected answer is revealed for
feedback; wrong choices grey out without a penalty before another attempt. The
reference stays visible. Staff Reveal cards again repeats preview and closure.
Direct Match retains its face-up behaviour and existing input/skyline regressions.

The active runtime is now **English only and single-player**. Mandarin voice
selection, spoken resources, previews, recording requirements and corresponding
obsolete tests were removed/replaced. The English local-recording map remains
language-keyed and extensible, with 117 required English phrases. Dormant bilingual
catalogue/attribution metadata is retained; it cannot select or narrate another
language. Multiplayer player counts, turn phases, assignment restrictions, turn
indicators and tests were removed. Two-hand detection and one active hand's
association/movement preference/locking/reassignment remain.

The side column has been replaced by a large centred mirrored camera behind the
interface. `object-fit: contain` preserves the whole camera frame and aspect ratio.
Opaque answer cards occupy the lower region, leaving the known synthetic face
region clear. Instructions are above centre, reference top-left, and skyline in a
separate lower band. The only bottom management button is **Recenter Hand**;
**Staff Controls** stays top-right and pauses play. Settings, navigation and destructive
confirmations stay in the hand-operable modal. Home/inactivity return retains the
single stream; End Session alone explicitly stops it. Pointer calibration stays in
sensor coordinates, with a literal mirrored preview marker and calibrated reach
pointer independent of letterboxing/resizing.

Screenshot/geometry review found and fixed a CSS specificity regression: an explicit
`display: grid` on the new answer layout overrode its `[hidden]` rule during reveal,
showing cards behind the enlarged reference. Removing that redundant declaration
restored the intended staged reveal. Flip projection is contained within each card;
the skyline caption sits beside the artwork to improve its scale in the compact band.

## Verification scope

TV geometry and screenshots cover 1920×1080, 1366×768, 1280×720 and a reduced-height
1280×620 window, with additional fullscreen checks. Pairwise card/text/control
bounding boxes exclude the camera background's intentional overlap; the camera has
separate centre/size/aspect/mirror checks. The known synthetic face rectangle is
checked against answer, instruction and reference boxes. Visible management controls
are checked to contain only Staff Controls and Recenter Hand during play.

Memory browser checks use actual CSS animation time, including pausing the CSS
animations beyond the logical timeout, attempting disabled inputs and holding a
synthetic palm over a slot through closure. Selection remains unavailable until all
animations finish, then requires a fresh full dwell. Pause/resume and staff reveal
are exercised separately. English fixtures verify local discovery, blocked playback,
volume, mute, late/stale callbacks, missing voices/files and local recording priority.
These are API checks, not actual audible listening.

Current screenshots (synthetic camera only) under `artifacts/card-matching/`:

- `phase61-home-{width}-{height}.png`
- `phase61-level1-{width}-{height}.png`
- `phase61-memory-before.png`, `phase61-memory-during.png`, `phase61-memory-after.png`
- `phase61-memory-{1920,1280}.png` (reduced-motion, face-down state)
- `phase61-staff-{width}-{height}.png`
- `phase61-fullscreen-1920.png`
- `phase61-success-{width}-{height}.png`

## Files changed

Runtime: `CardMatchingGame.tsx`, `CardMatchingGame.module.css`, `session.ts`,
`useHandPointer.ts`, `tracking.ts`, `speech.ts`, `useSpeech.ts`, `localisation.ts`,
`recording-manifest.json`, `mirror.ts` (comment).

Unit verification: new `memory.test.ts`; updated `expanded.test.ts`, `audit.test.ts`,
`fixes.test.ts`, `session.test.ts`, `tracking.test.ts`.

Browser verification: new `browser/english.spec.ts`, `browser/memory.spec.ts`;
updated `browser/audit.spec.ts`, `browser/audio-assets.spec.ts`, `browser/fixes.spec.ts`,
`browser/game.spec.ts`, `browser/phase6.spec.ts`.

Documentation: `README.md`, `RECORDINGS.md`, this report and a Phase 6.1 measurement
section in `PERFORMANCE.md`. Generated screenshots and measurements are ignored
artifacts. No catalogue photos, licences, dependencies, Balloon Pop implementation,
shared camera hook, shared tracking worker or root build config were changed.

## Physical checks still required

- Test the intended TV/USB webcam with seated staff: face/upper-body framing,
  lighting, camera angle, comfortable reach and display scaling/overscan. The fixed
  lower card row cannot guarantee that every physical camera position leaves a
  resident's face unobstructed; verify placement on the actual setup.
- Verify one hand, two hands, a phone partially obscuring a hand, crossings, loss
  and reacquisition, steady dwell, adjacent choices, staff reassignment and recenter.
  Synthetic landmarks do not establish real detection or intention reliability.
- Listen to local English Test Voice and all phrase types using the TV speakers,
  including offline use, volume/mute, cancellation and missing voice/recording
  behaviour. No genuine recordings have been supplied or audible output verified.
- In Memory Peek, try early mouse/touch/keyboard/hand inputs, pause halfway through
  the flip, resume and hold a face-down card for a full second. Check generic backs
  disclose no item clues and that the chosen answer is revealed calmly.
- Operate Staff Controls and confirmations by hand; test idle warning/30-second
  Home return, start another game by hand, then End Session and confirm the camera
  indicator goes out. Browser permission/fullscreen prompts may require staff.
- Run a sustained physical session to assess real inference/hand-to-display latency,
  thermal behaviour and native/GPU/process memory. Synthetic frame timing is not
  a hardware FPS, clinical suitability or audible-playback guarantee.

Preview: **http://127.0.0.1:5176/src/games/jayanth-card-matching/index.html**.
No branch switch, commit, push, merge or unified-game integration was performed.


## Final results

- **39/39 game unit tests passed.**
- **42/42 distinct current browser cases passed across the full run and targeted
  corrections/follow-ups.** The full run passed 40/41; its reduced-motion test
  incorrectly expected a transient flipping state after the short closure gate
  had completed. The corrected expectation passed. An additional visibility-loss
  Resume case passed, along with a nine-case final timing/layout run except for
  one screenshot-delay-sensitive dwell assertion. That assertion was replaced
  by direct elapsed-time measurement and passed: even with staff's 0.8-second
  setting selected, Memory Peek waited at least 1000 ms after selecting began.
- **9/9 Balloon Pop unit and 7/7 unchanged browser regressions passed.**
- TypeScript/root build and independent game production build passed. The existing
  root large-chunk warning remains; no new build errors remain.
- Tracked diff outside this game folder and whitespace checks passed. The game
  folder remains untracked/uncommitted on the existing branch.

Opening Staff Controls still pauses automatically. Resume was also corrected to
unpause explicitly when the game had already paused due to browser visibility
loss; closing another settings panel continues to respect its prior pause state.
The redundant completion-screen Exit action was removed.

| Warm sample | Phase 6 one hand | Phase 6 two hands | Phase 6.1 one hand | Phase 6.1 two hands |
| --- | ---: | ---: | ---: | ---: |
| Frame p95 | 16.8 ms | 16.8 ms | 16.7 ms | 16.8 ms |
| Frame p99 | 16.8 ms | 16.8 ms | 33.3 ms | 16.8 ms |
| Frames >25 ms | 1/388 | 1/388 | 5/384 | 2/387 |
| React root commits | 0 | 0 | 0 | 0 |
| Result → DOM p95 | 0.5 ms | 0.6 ms | 0.6 ms | 0.4 ms |
| Post-GC JS heap | 7.47 MB | 7.47 MB | 7.42 MB | 7.42 MB |

The after one-hand run had a 33.3 ms frame p99 and five >25 ms frames; two-hand
p99 was 16.8 ms with two such frames. These are short synthetic samples, not
evidence of uniformly better tail latency or real webcam performance. See
[PERFORMANCE.md](PERFORMANCE.md) for raw paths, entry timings, cleanup measurements
and reproduction details. Actual audio listening and physical-camera acceptance
remain the manual checks above.
