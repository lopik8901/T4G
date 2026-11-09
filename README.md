# Balloon Pop

A camera-based balloon game. The live webcam fills the play screen like a mirror. Move an open hand over a balloon, then close it into a fist to pop it. Seated play and two players are supported.

Choose a **Round type** and a **Pace** before starting:

- **Standard (timed):** pop as many balloons as possible in 30, 60, or 90 seconds. The default is 60 seconds. Missing a balloon does not end the round.
- **Endless:** there is no time limit. The first missed balloon ends the round.
- **Pace:** Standard uses the former Lively speed. Very fast moves balloons 16 times faster, making them easy to miss. Either pace works with either round type. Staff can also set a custom speed.

Each round starts with zero pops and points. A balloon is missed when it travels completely beyond the play area's outer margin. Results show **balloons popped**, **points**, **time played**, and your **best round this visit**. Best balloon totals are tracked separately for Endless and each timed duration, across all paces, and reset on page reload. Every balloon counts as one pop, including red balloons; red balloons award three points and the other colors award one. Choose **Play again** to start a fresh round with the same settings. Preview practice before starting does not count toward the round. Pausing, opening Staff controls, or switching browser tabs freezes the round and timer.

## How to pop with your hand

1. Show an open hand to the camera.
2. Move the palm glow over a balloon.
3. Close your hand into a fist. The glow turns gold.
4. Open your hand again before popping the next balloon.

An open hand cannot pop a balloon. Keeping a fist closed, moving a closed fist onto another balloon, or returning to view with an already closed fist cannot trigger another pop. One closure pops at most one balloon per hand. The thumb can remain outside the fist. Mouse clicks and keyboard pops are available only in the camera-free preview.

## Where to find things

```text
src/                       The app's screen, appearance, and gameplay
  App.tsx                  Main screen, setup, start, pause, and finish
  main.tsx                 Starts the React app
  styles.css               Colors, spacing, and screen layouts
  camera/
    useMirror.ts           Camera access and hand-tracking connection
    handGestures.ts        Recognizes open hands and closed fists
    handGestures.test.ts   Checks fist detection and tracking tolerances
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
4. Move an open hand over a balloon and close it into a fist. Open your hand again for the next pop. Regular balloons score 1; red balloons score 3 with a gentle extra burst.
5. Use **Pause** for a break or **Finish** to stop the webcam and return to setup.

**Try a preview** uses clickable balloons without requesting a camera. It is clearly labeled and is useful for checking the interface. Balloon targets also work with Tab and Enter. This preview does not demonstrate hand detection.

## Set up a TV

Connect the laptop to a TV using HDMI. On Windows, press **Win + P → Duplicate**; on macOS, enable display mirroring. Put the laptop/webcam where it faces the residents, choose **Fullscreen**, then start the activity. A 16:9 TV is supported, including cameras with a different aspect ratio.

Use a well-lit space with hands visible to the camera. The game starts at the standard pace with large balloons. Use **Staff controls → Balloon speed** to slow the activity down when needed. Residents can remain seated and use either hand. Adjust the laptop or seating so balloons are comfortably reachable without standing or leaning.

## Staff controls

- Pace (**Standard** or **Very fast**), custom balloon speed, size, and number (3–6). Each balloon has its own speed and direction; the speed control adjusts them all together. Round type and time limit are chosen on the setup screen.
- Sound volume, including mute.
- Grab sensitivity: higher values enlarge the area where a fist closure counts.
- Optional glow around detected palms.
- **2 hands** by default for predictable performance; **4 hands** can be selected before connecting the camera for two residents.
- **Reset round** clears the current score, round timer, and balloon totals while retaining completed-round records and the highest points total in this page session.
- Fullscreen, pause, resume, and finish.

Opening settings during play pauses the activity. Close settings and choose **Continue playing** to resume. Switching away from the browser tab also pauses play. Balloons travel horizontally, vertically, and diagonally. Popped balloons return after a 1.2-second delay from a randomly selected screen edge, with a fresh direction and speed. Missed balloons return during timed rounds; in Endless, the first miss ends play. Reduced-motion preferences remove nonessential swaying and particles; balloon travel remains part of the game.

## Privacy and implementation

React + Vite + TypeScript, Tailwind CSS, Three.js through React Three Fiber and Drei, and MediaPipe Hand Landmarker. No backend, account, database, paid API, analytics, or recording.

The browser requests **video only**, never microphone access. Camera frames are transferred to a local worker for inference and closed after processing. They are never uploaded or persisted. The score is held in memory and resets on page reload. Finishing the activity stops all camera tracks and terminates the worker.

Video uses a horizontal mirror with `object-fit: cover`. The palm glow uses the same crop and mirror transform, recalculated from the video and viewport dimensions. Nearby hand tracks are matched and their palm positions smoothed. Fist detection compares each fingertip's distance from the wrist with its middle joint's distance, accounting for video proportions and landmark depth. At least three fingers must curl. Separate opening and closing thresholds reduce repeated grabs from small tracking fluctuations. Only a fresh open-to-closed transition can pop the nearest overlapping balloon. Stale or newly reacquired detections cannot trigger a pop.

Rendering uses its own animation loop; inference is limited to approximately 12.5 requests per second with only one frame in flight. The round timer uses active elapsed time independently of movement's frame-jump limit. Pop handling marks a balloon unavailable before scoring so simultaneous contacts cannot double-count it. Three.js resources are disposed by React Three Fiber when unmounted.

## Checks

```sh
npm test                 # Movement, scoring, fist detection, and round rules
npm run build            # TypeScript check and production bundle
npm run preview          # Serve the production build locally
```

Browser checks use Playwright with an installed Google Chrome and a synthetic camera. Keep `npm run dev` running in another terminal, then run:

```sh
npx playwright test
```

They cover setup, responsive overflow, accessibility, preview scoring, staff controls, pause/resume, fullscreen, permission denial, local worker inference, camera cleanup, deliberate hand closures, hand loss, timed results, Endless losses, and replay. Screenshots are saved in `artifacts/`. Gesture and reconnection checks use controlled landmarks and a canvas video stream. Physical camera reconnection and natural fist recognition remain manual checks. Synthetic checks do not establish real-hand detection accuracy or performance on every laptop.

Before using the activity with residents, check on the actual laptop and TV:

- The live image appears immediately after camera permission and behaves like a mirror.
- A raised hand's glow aligns with its palm, including near the left and right edges.
- An open palm over a balloon does not pop it. Closing into a fist does; red gives 3 points and other colors give 1.
- Holding a fist or moving it onto a different balloon does not trigger another pop. Opening and closing again does.
- Timed play stops at the selected limit. Endless ends on the first missed balloon. Play again clears the timer and totals.
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
