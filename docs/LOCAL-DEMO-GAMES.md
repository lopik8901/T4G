# Branch games imported for local demos — 2026-11-11

Fetched origin and inspected remote main plus all feature branches. Relevant game files were copied into the existing AI_workflow working tree. No branch switch, merge, cherry-pick, commit, push or overwrite of existing CarePlay game code was performed. Existing uncommitted work remains intact.

## Sources

| Source | Revision | Game |
|---|---|---|
| origin/main | e7e24908aebf984e30f3397a61a610586f53485e | Latest Balloon Pop: timed/endless rounds, optional penalties, updated contact handling |
| origin/feature/balloonpop | a635f06924557c6127d18596a74b20ed4d36bc26 | Identical tree to fetched main; not another distinct game |
| origin/feature/jayanth-card-matching | cebd66fd07a45a2e3265ee54af81bef49ff0c56c | Singapore Skyline Journey, with Direct Match and Memory Peek levels |

There are two standalone games in those remote branches; the two card-game levels provide the third playable demo mode. CarePlay Studio remains a separate existing entry.

## Separation and changes

- Main's Balloon source is copied under `demos/balloon-pop/src`. Its HTML points to its local main module. Existing `src/App.tsx`, original Balloon logic/styles/camera and `/balloon` were not replaced.
- The complete card-game folder, including tests, photos, guides and attribution, is copied under `src/games/jayanth-card-matching`. It keeps its own state machine, CSS Modules, camera adapter, speech and audio.
- The only card adapter is an optional initial-level prop selected by the two new HTML entry paths or the original entry's `?level=memory` query. Default Level 1 behavior is preserved.
- Dedicated documents at `/demos/balloon-pop/`, `/demos/direct-match/` and `/demos/memory-peek/` keep runtime mounting and styles separate. No shared camera/state, Studio registration or AI-component integration was added.
- Root Vite serves and builds Studio plus the three demo HTML entries. Shared static bundles do not imply shared game state. No dependency was added; `test:demos` uses the installed test tooling. Type checking includes the imported Balloon source.

## Assets and licensing

The existing root hand-tracker worker, local `public/mediapipe` files and fonts serve all pages. The card game uses a game-local camera owner with the existing worker protocol. End or close one camera session before opening another.

Per-photo credits/source/license manifests, GFDL text, illustration notice and recording manifest were preserved. The root production build includes notices under `dist/demos/card-matching-notices/`. The illustration CC0 notice does not cover all photos or application code. No new external asset download was performed; source/assets came from the user's repository.

## Verification

- `npm run test:demos`: **75 passed** — latest Balloon movement/scoring/rounds and card matching/memory/pacing/tracking/speech/skyline rules.
- Existing `npm test`: **50 passed**, six opt-in integrations skipped.
- `npm run build`: passed with all HTML entries, photos and notices; existing large Three.js chunk warning remains.
- `npx playwright test tests/branch-demos.spec.ts`: **4 passed** in development. Verified Balloon preview scoring, correct default level for each card entry, successful matching/skyline progress, memory concealment, synthetic hand navigation and explicit camera cleanup.
- The same four tests **passed** against the built production preview on port 5178. This secondary preview was for verification only; demo links use 5173.
- HTTP 200 confirmed for Studio, original Balloon, all three demo URLs, hand worker and local model. Saved Balloon and Memory screenshots were inspected.

Browser tests use camera-denied mouse/keyboard play or controlled synthetic hands. Physical tracking quality, resident comfort and local voice pronunciation still need a real-laptop check. No AI generation is required to play these branch games.

See [local links and operating notes](../demos/README.md).
