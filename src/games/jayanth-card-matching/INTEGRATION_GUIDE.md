# Teammate handover and future integration

## Repository and scope

Repository: <https://github.com/lopik8901/T4G>\
Feature branch: `feature/jayanth-card-matching`\
Game source: `src/games/jayanth-card-matching/`

This branch adds Singapore Skyline Journey as an independent game. Balloon Popper
remains the root application. No shared homepage, cross-game route, camera context
or runtime handover is implemented. Do not infer integration from sharing a Git
repository or worker script.

The [README](README.md) covers setup, [ARCHITECTURE](ARCHITECTURE.md) describes the
runtime, and [TESTING](TESTING.md) gives checks. The repository-root README describes
Balloon Popper; the README in this folder describes Card Matching.

## Fetch and review

In your own clone, with local changes committed or otherwise safely preserved:

```sh
git fetch origin
git log --oneline origin/feature/jayanth-card-matching
git diff --stat origin/main...origin/feature/jayanth-card-matching
git diff origin/main...origin/feature/jayanth-card-matching -- src/games/jayanth-card-matching
```

Use the repository's actual default/base branch if it differs from `main`; no main
branch update is required for review. To run the branch in an isolated checkout,
use an unused local directory:

```sh
git worktree add ../T4G-card-review origin/feature/jayanth-card-matching
cd ../T4G-card-review
npm ci
npm run dev
```

The detached review worktree avoids changing an existing development checkout.
Open the Vite port plus `/src/games/jayanth-card-matching/index.html`. The review
commands are instructions for the teammate, not an instruction to merge or switch
the publishing checkout. Check ownership/permissions before contributing edits.

## Existing dependencies

| Dependency | How Card Matching uses it |
| --- | --- |
| Root package/lockfile and TypeScript configuration | Existing React/TypeScript/Vite/MediaPipe/testing stack; no second package |
| `public/hand-tracker.js` | Existing classic worker; init requests two hands; one worker instance per active game camera |
| `public/mediapipe/` | Generated local model, JS bundle and WASM; prepared by `npm run setup:assets` / postinstall |
| `src/game/logic.ts` | `Point` type, plus `mapToMirror` in the retained legacy `mirror.ts` test helper |
| `src/camera/useMirror.ts` | Not imported or mounted by Card Matching; its frame schema is independent |

The live camera implementation and frame/hand types are game-local
`useGameMirror.ts`. The November 11 main comparison found that Balloon Popper now
uses centre-only hands; importing its `TrackedHand` broke Card Matching's combined
TypeScript build. Card Matching now imports its own types, retaining its existing
points-based smoothing without changing either camera implementation. Current gameplay
mapping is `framing.ts`; do not mistake legacy `mirror.ts` for the active geometry.
The public worker file is shared, but two mounted hooks would still create two
streams and two worker/model instances. Hand control is one active pointer even
though two palms can be detected.

## Production entries and paths

Development uses Vite's existing nested HTML entry without changing `/`:

- `/` → root Balloon Popper entry.
- `/src/games/jayanth-card-matching/index.html` → Card Matching.

The default `npm run build` builds Balloon Popper and type-checks the repository.
Card Matching's local `vite.config.ts` supplies an independent root, copies the
root public directory, emits credit/recording manifests and writes
`dist/card-matching/`. Build and preview it separately:

```sh
npx vite build --config src/games/jayanth-card-matching/vite.config.ts
npx vite preview --config src/games/jayanth-card-matching/vite.config.ts --host 127.0.0.1 --port 5178
```

Open `/` on that preview origin. Current Vite output uses origin-root asset URLs,
and tracking uses `/hand-tracker.js` and `/mediapipe/...`. Merely opening
`/card-matching/index.html` inside the root production build is not a supported
combined deployment. Serving under a subpath needs consistent Vite base, asset,
worker/model and static-server fallback handling. Configure all of them together
and test a built deployment; development success alone is insufficient.

Preserve photo notices, `GFDL-1.2.txt`, `photo-manifest.json`, image credits and the
recording manifest in any new build pipeline. Model/WASM files are generated and
must be included by the deployment process, not committed from node_modules.

## Proposed shared homepage

A future integration can introduce a neutral activity launcher with Balloon Popper
and Singapore Skyline Journey choices. Keep each game's state machine, CSS and
staff controls isolated. Prefer lazy mounting only the selected game. Define how
a resident returns to the launcher, and distinguish that action from each game's
existing Home (which retains tracking).

Two sensible implementation stages are:

1. **Explicit teardown on switch.** Before mounting the next game, stop the former
   camera owner, terminate its worker, cancel capture/input RAF, observers, timers,
   speech and sound, detach video and invalidate queued callbacks. Then initialise
   the next game. A brief camera restart is preferable to parallel ownership.
2. **Deliberate shared camera service.** Once both games pass regressions, extract a
   single owner providing stream/video access, worker lifecycle, timestamped raw
   landmarks and explicit acquire/release/switch operations. Keep game-specific
   active-hand policy, smoothing, calibration, mirrored mapping and dwell separate
   until their contracts are intentionally reconciled.

These are proposed changes, not features present in this branch.

### Runtime ownership contract

Agree and test these rules before reusing a stream across games:

- Exactly one active camera stream, one inference worker/model and one producer
  loop. A context/provider must not mount both existing hooks underneath it.
- Subscribers receive a fresh frame schema with dimensions, timestamps and clear
  stale/error semantics. Card Matching expects 21 source landmarks for adapter
  processing; current Balloon Popper frames expose palm centres only. Preserve both contracts.
- One owner handles permission, device change, unplug, retry and final End. Device
  replacement first disposes the previous run; generation tokens reject late data.
- Switching resets dwell, selected-hand state and input locks. A held hand must not
  select the next game's start button or answer. Do not carry a consumed hover across.
- Preserve mirrored cover/pan mapping; both games' display rectangles may differ.
  Sensor coordinates, displayed palm and assisted pointer positions are distinct.
- Negotiate the active model hand limit: Balloon Popper defaults to two and can
  support four via its settings, while Card Matching requests two. The current
  worker init protocol does not dispose a previous landmarker on repeated init;
  recreate/terminate the worker when changing configuration until explicit safe
  reconfiguration is implemented.
- Only the active game can process collisions/selection or emit audio. Cancel old
  speech/watchdogs and verify delayed recording callbacks cannot overlap games.
- Define whether launcher/Home retains tracking and make it clear to staff. A shared
  End Session must stop resources for all subscribers, not merely hide the video.
- Strict Mode, page visibility, fullscreen, permission denial and rapid switches
  must not leak another owner or leave a background game active.

## Integration risks and checks

Current privacy notices refer to local processing and explicit End. A combined
application must preserve those promises and keep any analytics/recording decision
separate and consent-based. No resident identification or clinical claims should
be inferred from geometric hand association.

There is no overall software licence file in the repository at handover. Obtain
project-owner guidance before external software reuse. Individual photographs have
specific recorded licences; illustration CC0 is not a blanket licence for photos
or code. The unreferenced `fruits-cantaloupe.png` local duplicate is not part of the
feature commit; the active, credited catalogue asset is the JPEG.

Before and after integration, run the [full verification commands](TESTING.md#commands):
Card Matching unit/browser suites, Balloon unit/browser suites, TypeScript and both
builds. Add repeated cross-game switch tests verifying stream/worker counts,
track stop/detach, stale callback rejection, fresh dwell, active audio ownership,
Home/End semantics, permissions and built asset paths. Recheck all TV sizes and
real cameras with one/two visible hands, occlusion, seated reach and staff controls.
A combined build and shared homepage will need their own production smoke tests.

No integration, branch switch, merge, main push or force-push is part of this
handover. Review and agree an integration branch/workflow separately.
