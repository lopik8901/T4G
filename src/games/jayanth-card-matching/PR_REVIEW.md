# Pull request review — coexistence with latest main

Reviewed on 11 November 2026 for `feature/jayanth-card-matching` → `main` in
`lopik8901/T4G`. This is coexistence of independent games, not a shared launcher
or camera-service integration. The pull request must be reviewed before merging.

## Base and scope

Fetched main was `e7e2490` (the Balloon Popper feature merge). The feature's initial
published commit was `cebd66f`, with common ancestor `5268b4c`. Main had six commits
not on the feature branch. The feature adds its game folder without replacing any
Balloon source, root package/lockfile or root Vite entry. A non-mutating
`git merge-tree --write-tree` simulation found no textual conflicts.

The simulated merged tree retained every file outside the Card Matching folder
from main unchanged. Main's newer Balloon rounds, gestures, speeds and optional
penalty behaviour therefore remain main's own implementation. No actual branch
merge, rebase, history rewrite, main push or branch deletion was performed.

## Compatibility correction

A conflict-free textual merge initially failed TypeScript. Main changed its
`src/camera/useMirror.ts` `TrackedHand` to a palm-centre-only shape. Card Matching's
selector imported that shared type, but its local camera adapter still needs
`points` for its own smoothing. This caused TS2339 at `selected.points` and derived
implicit-any errors in the combined tree.

`tracking.ts` and `useHandPointer.ts` now import Card Matching's already-defined
`TrackedHand`/`HandFrame` from `useGameMirror.ts`. These are type-only imports:
no Balloon hook or gameplay changes, and no runtime behaviour changes. The local
adapter/frame contract can evolve independently of Balloon Popper's centre-only
frames. Architecture and integration documentation reflect the distinction.

## Dependencies, assets and entries

- No new package declarations, nested package manifests or dependency versions.
  Main's lockfile changes are metadata; comparing resolved package versions found
  no differences from the installed feature environment. Existing dependencies
  and generated local MediaPipe files were reused for review.
- All 100 active catalogue JPGs are tracked and credited, along with illustration
  notices, GFDL text, photo/recording manifests, tests and the developer/staff guides.
  No human audio recordings are supplied. The unused local cantaloupe PNG remains
  untracked and is not required by source, build or tests.
- Development: `/` remains Balloon Popper;
  `/src/games/jayanth-card-matching/index.html` remains Card Matching.
- Root `npm run build` remains the Balloon build. The game-local Vite configuration
  produces the independent `dist/card-matching/` build. These remain separate
  deployment roots; current absolute worker/model/asset URLs need deliberate work
  before deployment together under one production homepage/subpath.
- Two separate camera adapters are intentional game isolation, not duplicate npm
  dependencies. Mounting both games together would duplicate streams/workers;
  future integration must introduce explicit teardown or one shared owner.

## Verification method

A temporary snapshot was extracted from the simulated merged tree, without
switching or merging branches. Only the game-local compatibility correction and
its documentation were overlaid. An isolated Vite server on port 5191 served the game entries. The snapshot reused installed packages only after verifying equal
resolved versions, and reused the existing generated MediaPipe assets.

Card Matching uses its base-URL environment override. Balloon's tests/config
hard-code port 5173, including its external-request privacy assertion. A temporary
copy of the same activity tests and config changed only that origin to the review port (finally 5192);
the original Balloon test and application files were not edited or committed.
The initial run's external-request assertion classified local port-5191 requests
as external. A subsequent fixture run also revealed font requests blocked by Vite's
filesystem boundary because node_modules was symlinked. A second temporary server
on 5192 allowed only the review root/reused dependency/model directories and used
its own dependency cache. No original project configuration was changed; the
corrected isolated harness preserves the same-origin and console-error assertions.

Unit and build checks ran on both the feature checkout and the combined snapshot.
Browser checks targeted the combined snapshot so they cover main's newer Balloon
implementation. Results below distinguish initial runs and isolated reruns.

See [TESTING.md](TESTING.md) for synthetic versus physical evidence limits,
[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for future ownership/asset-path work,
and [README.md](README.md) for current game operation.

## Results

- Card Matching unit tests: 57/57 pass on feature and combined trees.
- Balloon unit tests: feature baseline 9/9; current-main combined tree 18/18 pass,
  including its added round/penalty tests. Main's newer npm test script is retained.
- TypeScript and both production builds pass after the local type correction.
  The existing root large-chunk warning remains.
- Current-main Balloon browser tests: 11/11 pass after correcting the temporary
  review origin/dependency-serving fixture; no committed Balloon test changes.
- Card Matching full browser run: 65/67 pass. Two ultrawide cases failed in the
  full run: a five-second pointer-position poll, and a reference-absence assertion
  made after the short closing phase had advanced. Both isolated reruns passed
  (2/2, 32.2 seconds), giving 67 distinct passing cases across full run/reruns.
  This is not a single uninterrupted 67-case green run.
- Both production builds were served independently and smoke-tested: Balloon's
  preview canvas and Card Matching's four-card selectable scene loaded without
  page/resource errors. Required worker/model/manifest/licence URLs returned OK.
- 100 active photo/credit entries, required manifests/licences and all seven core
  guides are tracked. Local documentation links and feature diff scope checked.

No shared homepage or combined production routing was added. Later integration
must address absolute asset/worker paths, camera/worker ownership and shared CSS
scope. Root build cleans dist; build root first, then Card Matching if retaining
both outputs together. The game-local build remains an independent site root.

Tests use synthetic/fake cameras and do not establish clinical benefit, physical
webcam comfort or audible narration. The known narrow animation-window/pointer
poll timing sensitivity should be reviewed before treating the browser suite as
fully deterministic. The unused local PNG is preserved outside the commit.
