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

A camera-based balloon game. The live webcam fills the play screen like a mirror. Move your hand circle over a balloon to pop it automatically. Seated play and two players are supported.

Choose a **Round type** and a **Pace** before starting:

- **Standard (timed):** pop as many balloons as possible in 30, 60, or 90 seconds. The default is 60 seconds. Missing a balloon does not end the round.
- **Endless:** start with an empty screen. After a one-second pause, balloons begin entering from the edges, with the initial arrivals spaced 0.6 seconds apart. All configured balloon slots (four by default, adjustable from three to six) keep returning after pops, so multiple balloons stay in play. There is no time limit; the first missed regular or rainbow balloon ends the round. Penalty balloons are safe to miss. Replay and Reset round repeat the empty opening.
- **Pace:** Standard uses the former Lively speed. Very fast moves balloons 16 times faster, making them easy to miss. Either pace works with either round type. Staff can also set a custom speed.

Each round starts with zero pops and points. A balloon is missed when it travels completely beyond the play area's outer margin. Results show **balloons popped**, **points**, **time played**, and your **best round this visit**. Best balloon totals are tracked separately for Endless and each timed duration, across all paces, and reset on page reload. Every regular or rainbow balloon counts as one successful pop; rainbow balloons award three points and the other colors award one. Choose **Play again** to start a fresh round with the same settings. Preview practice before starting does not count toward the round. Pausing, opening Staff controls, or switching browser tabs freezes the round and timer.

**Rainbow balloons are the bonus balloons:** their rainbow stripes and **+3** badge distinguish them from single-colour balloons worth one point. They still count as one balloon in the round total.

## Optional penalty balloons

Turn **Penalty balloons** on in setup or Staff controls for a dodge challenge. This setting is off by default and works with either round type and pace.

- Dark balloons marked **-3 / DODGE** subtract three points when your hand circle touches them. Scores can go below zero.
- Let them float away. Missing a penalty balloon never ends Endless and does not count as a miss.
- Penalty contacts do not add to your successful balloon total. Regular balloons still give +1 and rainbow balloons give +3.
- About one in five new arrivals is a penalty when enabled. Timed rounds also start with one penalty balloon. Endless keeps its empty, staggered opening.
- Enabling the option during play adds penalties as new balloons arrive. Turning it off immediately converts existing penalties to ordinary balloons.

## How to pop with your hand

1. Raise either hand in view of the camera.
2. Move the circle around your palm over a balloon. It pops automatically.
3. Move straight to the next balloon.

Keep your hand in whatever position feels comfortable; there is no need to close it or make a special gesture. Balloons that reach your hand circle also pop automatically. Mouse clicks and keyboard pops are available only in the camera-free preview.

## Where to find things

```text
src/                       The app's screen, appearance, and gameplay
  App.tsx                  Main screen, setup, start, pause, and finish
  main.tsx                 Starts the React app
  styles.css               Colors, spacing, and screen layouts
  camera/
    useMirror.ts           Camera access and hand-tracking connection
  components/
    SettingsPanel.tsx       Staff controls for speed, size, sound, and hands
    RoundControls.tsx       Round type and time limit choices
    RoundDisplay.tsx        Round progress, results, and replay buttons
  game/
    BalloonScene.tsx        Draws balloons and handles hand or tap contact
    logic.ts               Default settings, balloon movement, and scoring
    logic.test.ts          Checks the game rules and movement
    round.ts               Round timer, balloon totals, and end conditions
    round.test.ts          Checks timed and Endless round rules
    sound.ts               Balloon pop sounds
public/                    Files the browser loads directly
  balloon.svg              Balloon logo
  hand-tracker.js          Detects hands in the background
  mediapipe/               Hand-tracking files downloaded during setup
scripts/
  setup-assets.mjs         Prepares the local hand-tracking files
tests/
  activity.spec.ts         Browser checks for the complete activity
  rounds.spec.ts           Browser checks for round results and replay
package.json               Dependencies and commands to run the project
playwright.config.ts       Browser test settings
vite.config.ts             Development server and build settings
tsconfig.json              TypeScript settings
index.html                 The page that loads the app
```

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
3. Choose a round type, time limit (for timed rounds), and pace. Select **Start activity**. The mirror fills the window and the setup controls disappear.
4. Move your hand circle over a balloon. It pops on contact. Regular balloons score 1; rainbow balloons score 3 with a gentle extra burst.
5. Use **Pause** for a break or **Finish** to stop the webcam and return to setup.

**Try a preview** uses clickable balloons without requesting a camera. It is clearly labeled and is useful for checking the interface. Balloon targets also work with Tab and Enter. This preview does not demonstrate hand detection.

## Set up a TV

Connect the laptop to a TV using HDMI. On Windows, press **Win + P → Duplicate**; on macOS, enable display mirroring. Put the laptop/webcam where it faces the residents, choose **Fullscreen**, then start the activity. A 16:9 TV is supported, including cameras with a different aspect ratio.

Use a well-lit space with hands visible to the camera. The game starts at the standard pace with large balloons. Use **Staff controls → Balloon speed** to slow the activity down when needed. Residents can remain seated and use either hand. Adjust the laptop or seating so balloons are comfortably reachable without standing or leaning.

## Staff controls

- Pace (**Standard** or **Very fast**), custom balloon speed, size, and number (3–6). Each balloon has its own speed and direction; the speed control adjusts them all together. Round type and time limit are chosen on the setup screen.
- Optional penalty balloons: dodge the dark -3 balloons.
- Sound volume, including mute.
- Touch sensitivity: higher values make contact with a balloon easier.
- Optional glow around detected palms.
- **2 hands** by default for predictable performance; **4 hands** can be selected before connecting the camera for two residents.
- **Reset round** clears the current score, round timer, and balloon totals while retaining completed-round records and the highest points total in this page session.
- Fullscreen, pause, resume, and finish.

Opening settings during play pauses the activity. Close settings and choose **Continue playing** to resume. Switching away from the browser tab also pauses play. Balloons travel horizontally, vertically, and diagonally. Popped balloons return after a 1.2-second delay from a randomly selected screen edge, with a fresh direction and speed. Missed balloons return during timed rounds; in Endless, the first missed regular or rainbow balloon ends play. Penalty balloons are always safe to miss. Reduced-motion preferences remove nonessential swaying and particles; balloon travel remains part of the game.

## Privacy and implementation

React + Vite + TypeScript, Tailwind CSS, Three.js through React Three Fiber and Drei, and MediaPipe Hand Landmarker. No backend, account, database, paid API, analytics, or recording.

The browser requests **video only**, never microphone access. Camera frames are transferred to a local worker for inference and closed after processing. They are never uploaded or persisted. The score is held in memory and resets on page reload. Finishing the activity stops all camera tracks and terminates the worker.

Video uses a horizontal mirror with `object-fit: cover`. The hand circle uses the same crop and mirror transform, recalculated from the video and viewport dimensions. Nearby hand tracks are matched and their palm positions smoothed. Each active frame checks whether a hand circle overlaps a balloon's touch area. Contact pops the balloon without any gesture requirement. Missing or stale hand detections cannot pop balloons, and pausing or ending a round disables contact.

Rendering uses its own animation loop; inference is limited to approximately 12.5 requests per second with only one frame in flight. The round timer uses active elapsed time independently of movement's frame-jump limit. Pop handling marks a balloon unavailable before scoring so simultaneous contacts cannot double-count it. Three.js resources are disposed by React Three Fiber when unmounted.

## Checks

```sh
npm test                 # Movement, scoring, touch detection, and round rules
npm run build            # TypeScript check and production bundle
npm run preview          # Serve the production build locally
```

Browser checks use Playwright with an installed Google Chrome and a synthetic camera. Keep `npm run dev` running in another terminal, then run:

```sh
npx playwright test
```

They cover setup, responsive overflow, accessibility, preview scoring, staff controls, pause/resume, fullscreen, permission denial, local worker inference, camera cleanup, hand-circle contact, hand loss, penalty scoring and controls, timed results, Endless losses, and replay. Screenshots are saved in `artifacts/`. Contact and reconnection checks use controlled landmarks and a canvas video stream. Physical camera reconnection remains a manual check. Synthetic checks do not establish real-hand detection accuracy or performance on every laptop.

Before using the activity with residents, check on the actual laptop and TV:

- The live image appears immediately after camera permission and behaves like a mirror.
- A raised hand's glow aligns with its palm, including near the left and right edges.
- Moving the hand circle over a balloon pops it automatically; rainbow gives 3 points and other colors give 1.
- Keeping your hand still also pops balloons that move into the circle.
- Timed play stops at the selected limit. Endless ends on the first missed regular or rainbow balloon; penalty balloons may pass safely. Play again clears the timer and totals.
- When hands leave the image, their circles disappear and no further contact is counted. When they return, contact works again.
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
