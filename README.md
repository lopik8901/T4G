# CarePlay Studio

**Branch game demos:** [Latest Balloon Pop](http://127.0.0.1:5173/demos/balloon-pop/), [Direct Match](http://127.0.0.1:5173/demos/direct-match/), [Memory Peek](http://127.0.0.1:5173/demos/memory-peek/). Run `npm run dev`; see [demo operating notes](demos/README.md). These standalone pages do not integrate their game state or camera ownership into Studio.

A local activity creation workspace for care staff. Create → play → chat-edit → save → reopen, using one validated configuration and shared interaction engine. The original Balloon Pop is preserved at **/balloon**.

**New-mechanic requests:** Codex now attempts planning, TypeScript authoring, generated test authoring and bounded compiler repairs when the trusted engine cannot express an activity. This laptop has no configured execution sandbox, so these results are **quarantined developer drafts, not playable games**. Existing games continue to work. See the [architecture assessment](docs/AUTONOMOUS-ASSESSMENT.md) and [development workflow, setup and limitations](docs/AUTONOMOUS-DEVELOPMENT.md).

## Start Studio

Use Node.js **22.18+**, then:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. This starts Vite and a Node AI API on loopback port 3001. The API is a local development service, not a public multi-user server. Production builds use `npm run build`; start the API with `npm run dev:api` and the built frontend with `npm run preview`.

### Configure AI or use demo

**Codex CLI is the default provider. No API key is needed.** Install Codex CLI (or the Codex Windows app), run `codex login` and sign in with ChatGPT, then start CarePlay with `npm run dev`. Check the account with `codex login status`. CarePlay calls `codex exec` on the backend using your saved sign-in; it does not read, copy, or expose login tokens. Requests use your account's Codex allowance and require an internet connection. The interface shows **Codex CLI connected**. This integration requires a recent CLI supporting `--ignore-user-config`, `--ephemeral`, and `--output-schema` (tested with CLI 0.154.0).

Optional: copy `.env.example` to `.env`. `CAREPLAY_AI_PROVIDER=codex` and `CAREPLAY_DEMO=false` select Codex. The Windows app executable is detected automatically; elsewhere put `codex` on PATH, or set `CODEX_CLI_PATH` to its executable. `CODEX_MODEL` optionally selects a model available to your Codex account; blank uses the CLI default. Restart the backend after changing these settings. No login files belong in this repository.

Each Codex request runs in its own temporary folder with a read-only sandbox, shell tools disabled, web search disabled, user configuration/rules ignored, and an ephemeral session. Only the text request and relevant configuration are supplied. Structured output is converted to a minimal allowlisted patch and validated again. The app never executes returned code. Temporary request files are removed after completion; there is a two-minute request timeout. It is a local desktop integration, not a public service sharing one person's account.

Verify the CLI connection with `npx tsx scripts/smoke-codex.ts`. An opt-in real-browser check is in `tests/codex-live.spec.ts`; run it with `CAREPLAY_TEST_CODEX=true` in the environment. These checks use your account's Codex allowance. The normal browser suite should still run against explicit demo mode. The CLI bridge and complete browser chat-edit path have been verified with ChatGPT sign-in.

With `CAREPLAY_DEMO=true`, the assistant is explicitly labelled **Demo assistant** and uses deterministic supported commands. No LLM call is made. Try “make the flowers bigger”, “slow down”, “remove scoring”, “two players”, “add music”, “change to a balloon game”, “butterflies”, “fruit”, or “use sound detection”. Unsupported requests explain the available options. Without a running API, **Offline demo** uses the same deterministic rules locally.

As an alternative to Codex, set `CAREPLAY_AI_PROVIDER=openai`, `CAREPLAY_DEMO=false` and `OPENAI_API_KEY` on the **server**, then restart. `AI_MODEL` defaults to `gpt-4.1-mini`; `OPENAI_BASE_URL` optionally selects a compatible provider endpoint. This path uses stable AI SDK 6 + OpenAI provider 3 with structured outputs and the same validation. Do not put credentials in a `VITE_` variable. Only textual staff requests and relevant game configuration go to the provider; avoid including resident information in requests.

### Use the workspace

- Choose **Create new game**, select hand tracking and/or sound detection, and describe an activity. Voice and body tracking are labelled Coming soon.
- Try a starter directly: Balloon Pop, Collaborative Garden, or Memory Reveal. Each is a playable configuration of the shared engine.
- Start the preview. Touch/click and keyboard interaction are available without camera permissions. Enable the camera for a local mirrored feed and hand interaction. Enable the microphone separately for sound detection.
- Garden seeds grow into flowers and butterflies appear as shared progress increases. Memory cards reveal in four touches or a slow hand dwell; upload up to six local JPEG/PNG/WebP photos (5 MB each). Illustrated sample cards are clearly used until staff add photographs.
- The assistant and manual settings update the same Zustand store. Undo, redo, and version history restore configurations; uploaded photos are a separate local library. Any configuration change revokes staff approval. Late AI responses are rejected if staff edited the activity in the meantime.
- Save to IndexedDB. Saved configs, versions, and photos remain after refresh in the same browser and origin. No API call is needed to open or play saved games. Dashboard actions include Play, Edit, Duplicate, and Delete; deletion asks for confirmation. Leaving the editor through Activities auto-saves.
- **Launch game** asks staff to review and approve suitability, then opens a distraction-free play view. Start the preview to play and use Fullscreen for a TV. Clearing browser data deletes local games. This V1 does not sync across devices.

### Privacy and interaction details

Camera frames use the existing MediaPipe classic worker. Mirrored crop mapping, smoothed hand points, stale detection expiry, generous hit zones, and frame throttling are reused. Audio input uses a local Web Audio analyser, RMS threshold, quiet re-arm and cooldown; audio is never recorded or uploaded. Each sound activates one available object. Use headphones or mute game audio if speakers trigger the mic. Stop permissions using Camera off/Mic off or leave the editor. Browser tab hiding pauses play. The original 3D balloon renderer is reused; garden, reveal, fruit, and butterfly visuals use lightweight SVG/DOM overlays with shared input/rule logic. Howler plays gentle locally generated pop sounds and an optional ambient loop; there are no downloaded sound assets.

No mandatory timers, lives, flashing, penalties, or medical-outcome claims. Size, pace, sensitivity, participants, seated/standing preference, audio and scoring are editable. The selected difficulty applies a preset; subsequent individual changes are allowed. Garden and Memory default to no points. Staff should review standing activities, higher speeds, and smaller objects before residents play.

### Architecture and checks

`src/studio/config.ts` defines the Zod boundary; `store.ts` owns configuration/history; `persistence.ts` owns IndexedDB; `GamePreview.tsx`, `rules.ts`, `useSound.ts`, and `audio.ts` share the playable pipeline; `server/index.ts` owns provider orchestration. The original `src/App.tsx`, camera module, game logic and rendering remain available. [Implementation contract](docs/CAREPLAY.md), [licence/reference notes](docs/THIRD_PARTY.md).

```sh
npm test
npm run build
npx playwright test
```

Keep `npm run dev` running in **demo mode** for deterministic browser tests. Tests use installed Chrome, local synthetic video/microphone devices, and controlled hand data. They exercise creation, schema rejection, edit synchronization, undo/redo, save/reopen, photos, duplicate/delete, approval, provider errors, stale response rejection and the preserved Balloon Pop. Real-provider output requires provider credentials; physical hand tracking, sound thresholds, two-person calibration, and HDMI setup require checks on the actual laptop and TV. The API is protected with loopback binding, host/origin checks, bounded input, a timeout and a concurrency limit; add authentication and production rate limits before hosting it for other users.

## Original Balloon Pop

A gentle AR magic mirror activity for elderly residents. The live webcam fills the play screen; residents pop glossy 3D balloons by reaching with either hand. Seated play, slow movements, and two residents are supported. No countdown, penalties, or game-over screen.

## Run locally

Install **Node.js 22.18+** (Node 24 LTS recommended), then:

```sh
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge. Use the localhost address printed by Vite if that port is occupied.

The first install downloads dependencies and Google's versioned Hand Landmarker model, and copies MediaPipe's matching WebAssembly files into `public/mediapipe`. After installation, fonts, code, the model, and WebAssembly are all served locally. If the model download is interrupted, run `npm run setup:assets` again. Do not use `npm install --ignore-scripts` without subsequently running that command.

1. Select **Enable camera**, then allow camera access in the browser.
2. Wait for **Live mirror**. Confirm that residents and their hands are visible.
3. Select **Start activity**. The mirror fills the window and the setup controls disappear.
4. Reach naturally toward a balloon. Palm or fingertip contact pops it. Regular balloons score 1; red balloons score 3 with a gentle extra burst.
5. Use **Pause** for a break or **Finish** to stop the webcam and return to setup.

**Try a preview** uses clickable balloons without requesting a camera. It is clearly labeled and is useful for checking the interface. Balloon targets also work with Tab and Enter. This preview does not demonstrate hand detection.

## Set up a TV

Connect the laptop to a TV using HDMI. On Windows, press **Win + P → Duplicate**; on macOS, enable display mirroring. Put the laptop/webcam where it faces the residents, choose **Fullscreen**, then start the activity. A 16:9 TV is supported, including cameras with a different aspect ratio.

Use a well-lit space with hands visible to the camera. Start with the default gentle pace and large balloons. Residents can remain seated and use either hand. Adjust the laptop or seating so balloons are comfortably reachable without standing or leaning.

## Staff controls

- Balloon pace, size, and number (3–6). Each balloon has its own gentle speed and direction; the pace control adjusts them all together.
- Sound volume, including mute.
- Touch sensitivity: higher values enlarge collision zones.
- Optional glow around detected palms.
- **2 hands** by default for predictable performance; **4 hands** can be selected before connecting the camera for two residents.
- Reset the current score while retaining the highest score in this page session.
- Fullscreen, pause, resume, and finish.

Opening settings during play pauses the activity. Close settings and choose **Continue playing** to resume. Switching away from the browser tab also pauses play. Balloons drift horizontally, vertically, and at gentle diagonals. Popped balloons return after a 1.2-second delay from a randomly selected screen edge, with a fresh direction and speed; missed balloons recycle the same way. Reduced-motion preferences remove nonessential swaying and particles; gentle travel is retained as part of the activity.

## Privacy and implementation

React + Vite + TypeScript, Tailwind CSS, Three.js through React Three Fiber and Drei, and MediaPipe Hand Landmarker. No backend, account, database, paid API, analytics, or recording.

The browser requests **video only**, never microphone access. Camera frames are transferred to a local worker for inference and closed after processing. They are never uploaded or persisted. The score is held in memory and resets on page reload. Finishing the activity stops all camera tracks and terminates the worker.

Video uses a horizontal mirror with `object-fit: cover`. Hand coordinates use the same crop and mirror transform, recalculated from the video and viewport dimensions. Collision checks include palm centers and all five fingertips, smooth nearby tracks, and discard stale detections. Rendering uses its own animation loop; inference is limited to approximately 12.5 requests per second with only one frame in flight. Pop handling marks a balloon unavailable before scoring so simultaneous contacts cannot double-count it. Three.js resources are disposed by React Three Fiber when unmounted.

## Checks

```sh
npm test                 # Mirror mapping, collisions, scoring, respawning
npm run build            # TypeScript check and production bundle
npm run preview          # Serve the production build locally
```

Browser checks use Playwright with an installed Google Chrome and a synthetic camera. Keep `npm run dev` running in another terminal, then run:

```sh
npx playwright test
```

They cover setup, responsive overflow, accessibility, preview scoring, staff controls, pause/resume, fullscreen, permission denial, local worker inference, camera cleanup, mapped palm contact, and hand loss. Screenshots are saved in `artifacts/`. Contact and reconnection use controlled landmarks and a canvas video stream. Chrome's fake device disappeared from device enumeration after shutdown in this environment, including for direct browser calls, so physical camera reconnection remains a manual check. Synthetic checks do not establish real-hand detection accuracy or performance on every laptop.

Before using the activity with residents, check on the actual laptop and TV:

- The live image appears immediately after camera permission and behaves like a mirror.
- A raised hand's glow aligns with its palm, including near the left and right edges.
- Slow palm and fingertip contact pop balloons; red gives 3 and other colors give 1.
- Hands can leave and re-enter the image without a stuck marker or score changes.
- Balloon speed, size, sensitivity, volume, pause, and fullscreen suit the space.
- Four-hand mode remains responsive on the chosen laptop; use two hands if needed.

## Troubleshooting

- **Camera blocked:** allow camera access in the browser's site settings and retry. Webcam access requires localhost or HTTPS, rather than an insecure LAN URL.
- **No camera / camera busy:** connect a webcam and close other apps using it.
- **Tracking does not load:** run `npm run setup:assets`, reload, and reconnect. Model and WASM files must both be present under `public/mediapipe`.
- **3D graphics unavailable:** enable browser hardware acceleration and restart Chrome or Edge.
- **Poor tracking:** improve lighting, bring hands into view, and try the two-hand setting. Use larger balloons and higher touch sensitivity for smaller movements.

Technical references: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [React Three Fiber](https://r3f.docs.pmnd.rs/api/hooks), [Drei](https://drei.docs.pmnd.rs/cameras/orthographic-camera), and [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite).

## Experimental isolated previews

Normal game creation now automatically prepares genuinely missing reusable components identified by the Planner, validates/stores them, and links exact versions into the same isolated game. Later games can reuse those versions without another Component Author call. Failures may fall back to safe local behavior; developer approval remains separate. See [automatic-generation trace and live evidence](docs/AUTOMATIC-COMPONENT-GENERATION-EVIDENCE.md).

Reusable generated components now persist under `.careplay/components`. Use `npm run components -- list` or `npm run components -- generate scripts/component-visual-request.json`; `npm run validate:components` validates the two focused mechanic examples and demonstrates no-author reuse. Developer-only approval requires an exact version/hash and review reason. All reusable generated code stays isolated, including after approval. See [component registry setup, API and verified evidence](docs/COMPONENT-REGISTRY-EVIDENCE.md).

Complete generated games now use a schema-validated Game Designer, trusted-first Component Discovery, a shared rounds/progress/replay SDK and approved local illustrations. The planner receives structured reuse/adapt/generate recommendations; reviewed Phaser, PixiJS, Kenney and Rosebud entries remain reference-only until compatible local adapters/assets are explicitly added. No extra provider key or paid asset service is required.

See [upgrade evidence and limitations](docs/DESIGN-UPGRADE-EVIDENCE.md), [research and licenses](docs/DESIGN-UPGRADE-ASSESSMENT.md), and [agents and exact prompts](docs/AGENTS-AND-PROMPTS.md). New artwork outside the approved library is currently unavailable; the system must not disguise unrelated art as a requested new asset.

See [setup, isolation boundaries and validation evidence](docs/ISOLATED-PREVIEW.md). Run `npm run sandbox:build` to build the trusted image, then `npm run validate:autonomous` for real model/container acceptance checks. Windows Docker Desktop installations are discovered automatically, including per-user installs; no PowerShell PATH troubleshooting is needed. Docker/WSL2 is required for generated-code execution; static drafts remain available when it is missing.
