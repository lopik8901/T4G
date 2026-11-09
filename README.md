# Balloon Pop

A gentle AR magic mirror activity for elderly residents. The live webcam fills the play screen; residents pop glossy 3D balloons by reaching with either hand. Seated play, slow movements, and two residents are supported. No countdown, penalties, or game-over screen.

Choose **Standard** or **Very fast** under **Game mode** on the setup screen or in **Staff controls**. Standard is the default and uses the former Lively speed. Very fast moves balloons **16 times faster**, so they cross the screen in a few seconds and are easy to miss. Missed balloons return without a score penalty. Staff can also use the balloon speed slider to set a custom speed.

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
  game/
    BalloonScene.tsx        Draws balloons and handles hand or tap contact
    logic.ts               Default settings, balloon movement, and scoring
    logic.test.ts          Checks the game rules and movement
    sound.ts               Balloon pop sounds
public/                    Files the browser loads directly
  balloon.svg              Balloon logo
  hand-tracker.js          Detects hands in the background
  mediapipe/               Hand-tracking files downloaded during setup
scripts/
  setup-assets.mjs         Prepares the local hand-tracking files
tests/
  activity.spec.ts         Browser checks for the complete activity
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
3. Select **Start activity**. The mirror fills the window and the setup controls disappear.
4. Reach naturally toward a balloon. Palm or fingertip contact pops it. Regular balloons score 1; red balloons score 3 with a gentle extra burst.
5. Use **Pause** for a break or **Finish** to stop the webcam and return to setup.

**Try a preview** uses clickable balloons without requesting a camera. It is clearly labeled and is useful for checking the interface. Balloon targets also work with Tab and Enter. This preview does not demonstrate hand detection.

## Set up a TV

Connect the laptop to a TV using HDMI. On Windows, press **Win + P → Duplicate**; on macOS, enable display mirroring. Put the laptop/webcam where it faces the residents, choose **Fullscreen**, then start the activity. A 16:9 TV is supported, including cameras with a different aspect ratio.

Use a well-lit space with hands visible to the camera. The game starts at the standard pace with large balloons. Use **Staff controls → Balloon speed** to slow the activity down when needed. Residents can remain seated and use either hand. Adjust the laptop or seating so balloons are comfortably reachable without standing or leaning.

## Staff controls

- Game mode (**Standard** or **Very fast**), custom balloon speed, size, and number (3–6). Each balloon has its own speed and direction; the speed control adjusts them all together.
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
