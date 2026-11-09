# Phase 5 usability and quality audit

> Historical phase record. For the current English-only, single-player implementation, use [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Generated screenshot/benchmark paths below are local outputs, excluded from Git; regenerate them using the testing guide. Earlier features and measurements describe that phase, not current availability.


## Scope and fixes

All changes are inside this game folder. Balloon Pop, shared camera hook, worker,
staff controls and root entry are unchanged. No branch switch, commit, push or
application integration was performed. Earlier game source is untracked, so the
comparison is against the inspected implementation, not a historical Git revision.

### 1. Local speech

The prior voice policy accepted network voices, which could fail offline. Its
six-second startup watchdog also classified a slow voice as permission-blocked.
The new policy requires `localService === true` and matching language metadata;
Mandarin accepts Mandarin metadata and excludes English/Cantonese-only voices.
Startup now has a distinct 15-second timeout; actual permission errors are reported
separately. Cancellation/interruption is not presented as a playback failure.
Late `voiceschanged` discovery, generation guards and the latest pending request
prevent stale English callbacks from affecting Mandarin. Interface text stays English.

Home/settings Test Voice and English diagnostics remain available. Install a
system language voice through accessibility/speech settings, restart Chrome and
check Test Voice. Chrome must expose it as local; installation alone is not proof.
There is no network TTS fallback. The namespaced local recording map remains;
no approved human recordings have been supplied. Automated speech tests verify
API selection/callback flow, not speaker output or voice quality.

### 2. Visible mirrored webcam

The earlier video was effectively hidden in a tiny element. One persistent video
now uses the existing stream: full viewport, mirrored and cover-cropped during
play; contained in the Home preview to keep the head visible. Answer cards remain
opaque. Instructions sit top-left, leaving central upper-body space visible.
Cursor mapping shares the exact cover/mirror geometry in gameplay, bypassing menu
amplification/recentring. Menus retain assisted reach. No second stream, recording,
upload or shared camera/worker modification was introduced.

### 3. Home and stopping

The old Exit callback explicitly stopped the mirror and entered a closed screen,
which prevented subsequent hand navigation. Exit now confirms Return to Home and
keeps the stream, as do Home, completion, Pause and inactivity return. A distinct
End Session confirmation stops tracks/worker/audio/pointer. Unmount cleans up too.
The closed screen explains this; staff use mouse/touch/keyboard to reopen it.

### 4. Layout and content

Tests inspect actual bounding boxes at 1920×1080, 1366×768 and 1280×720 across
Home, settings, reveal, answering, wrong/correct feedback, skyline unlock, Pause,
Exit and completion. Fullscreen is also exercised. The inactivity warning was
reproducibly overlapping all four answers at all three sizes: it now replaces
ordinary feedback instead of stacking above it. Home cover-cropping clipped the
head; contain fixes that. Central instructions obscured the upper body and moved
left. Completion-to-Home missed repositioning the persistent video because both
states were inactive; session presence now triggers the positioning update.

The mulberry image showed a tree without recognisable fruit. It was replaced by
a close-up of mulberries with updated Commons CC BY-SA attribution. Catalogue
counts and four-choice mechanics remain. Less familiar fruits and busy backgrounds
still need staff/resident recognition review. No resident usability study occurred.

### 5. Screenshot evidence

Screenshots use an explicitly synthetic figure, not residents or a physical webcam.
Files are in `artifacts/card-matching/` at the repository root:

- `phase5-home-{1920,1366,1280}.png`
- `phase5-game-{1920,1366,1280}.png`
- `phase5-settings-*`, `phase5-reveal-*`, `phase5-wrong-*`
- `phase5-unlock-*`, `phase5-exit-*`, `phase5-complete-*`
- `phase5-fullscreen.png`

### 6. Performance and verification

Comparable synthetic 640×480 video/controlled landmarks, 6.5-second warm sample:

| Measure | Before visible video | After |
| --- | ---: | ---: |
| Frames | 389 | 389 |
| Frame p95 | 16.7 ms | 16.7 ms |
| Frames over 25 ms | 0 | 0 |
| React root commits | 0 | 0 |
| Result-to-DOM p95 | 0.3 ms | 0.5 ms |
| Post-GC JS heap | 7.25 MB | 7.29 MB |

First reveal/fall p95 was 16.8 ms both; one after-frame exceeded 25 ms versus zero
before. End Session stopped the stream and hid the cursor. Raw results:
`artifacts/card-matching/phase5-before.json` and `phase5-after.json`.
This excludes actual inference, capture-to-display latency, native/GPU memory,
thermal load and long-run leak assessment. It is not a hardware performance claim.

Unit checks: 29 game tests and 9 Balloon Pop tests passed. TypeScript/root production
build and independent game build passed. The root build retains its large-chunk
warning. Browser results are recorded below after the final regression run.

### 7. Physical verification still required

Use the intended TV, above-TV USB webcam and seated volunteers/staff. Verify
head/upper-body framing, exact visible palm alignment, comfortable reach to all
four answers, lighting, hand loss/reacquisition and adjacent dwell selection.
Check actual TV scaling/overscan and fullscreen at its native output resolution.
Test English then Mandarin, language changes between sessions, offline playback,
Audio Off/On, Test Voice and real speaker volume. Confirm Home/Exit can start a
second game by hand, and End Session releases the camera indicator.
Run a sustained session to assess heat, real inference latency and memory.

### 8. Before KWSH use

Physical audio/camera checks and a supervised usability review remain necessary.
Confirm approved vocabulary/photo recognition, Mandarin pronunciation and comfortable
dwell/timeout settings with staff. Browser mocks cannot establish audible narration,
resident comfort, clinical suitability or therapeutic benefit. No such claims are made.

## Changed files

Runtime: `speech.ts`, `useSpeech.ts`, new `mirror.ts`, `useHandPointer.ts`,
`CardMatchingGame.tsx`, `CardMatchingGame.module.css`.
Content: `assets/photos/fruits-mulberry.jpg`, `assets/photo-manifest.json`,
`assets/PHOTO_CREDITS.md`.
Verification: new `audit.test.ts`, `fixes.test.ts`, new `browser/audit.spec.ts`,
`browser/helpers.ts`, `browser/game.spec.ts`, `browser/fixes.spec.ts`, `browser/measure.mjs`.
Documentation: `README.md`, this `AUDIT.md`.

## Final browser results

All 31 Card Matching cases passed across the full run and targeted retry. The
full run passed 30/31; the alignment test sampled video bounds before the resize
layout effect completed. The test now waits for viewport-sized video bounds
before calculating its expected pixel position, and passed on retry. No runtime
change was needed for that timing failure. The earlier targeted audit passed
12/12. All seven unchanged Balloon Pop browser regressions passed in one run.
`git diff --check` passed; the tracked diff outside this game folder is empty.
The game folder was already untracked and remains uncommitted.
