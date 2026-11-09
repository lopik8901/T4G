# Singapore Skyline Journey

A single-player, English-language card matching activity developed for KWSH
Serangoon RCA through the NTU Renaissance Engineering Programme Tech-for-Good
project. It is intended for supported use by seniors with dementia, with RCA staff
supervising setup and helping residents choose a comfortable level and pace.

The project aims to make picture matching accessible through large visual choices,
familiar subjects, gentle pacing and natural hand movements. Residents can remain
seated and take their time. The application is an engineering prototype; clinical
benefit and suitability for individual residents have not been established.

This game lives in `src/games/jayanth-card-matching/` on
`feature/jayanth-card-matching`. The existing [Balloon Popper application](../../../README.md)
remains at `/`. The two games have separate entries and are not yet integrated.

## Documentation

| Reader/task | Guide |
| --- | --- |
| RCA staff operating the activity | [Staff guide](STAFF_GUIDE.md) |
| Developer understanding the implementation | [Architecture](ARCHITECTURE.md) |
| Verification, commands and evidence limits | [Testing](TESTING.md) |
| Teammate reviewing or integrating the branch | [Integration guide](INTEGRATION_GUIDE.md) |
| Synthetic measurements and methodology | [Performance](PERFORMANCE.md) |
| English speech and future human recordings | [Recording guide](RECORDINGS.md) |
| Photograph attribution | [Photo credits](assets/PHOTO_CREDITS.md), [photo manifest](assets/photo-manifest.json) |
| Original illustration licensing | [Illustration notice](assets/LICENSE.md) |

## Activities

**Level 1 — Direct Match:** a reference picture appears, moves to the top-left,
and four answer cards descend into fixed positions. Select the matching picture.
A wrong choice gently greys out; the resident can try another card without penalty.

**Level 2 — Memory Peek: Look → Remember → Match:** four pictures arrive face-up
before the target is known. After the configured preview, all four close. Only
then does the reference appear and its optional English instruction play. Selection
becomes available after the reference animation finishes. Wrong choices open and
grey out while the remaining cards stay closed.

Both levels have exactly four answer cards and one match. References and correct
positions avoid immediate repetition; pictures do not shuffle after closing.
Animals and Fruits each contain 50 locally bundled photographs. Colours contains
12 labelled solid swatches. Game Options selects the level and Familiar/Extended
picture collection; Home selects the category and session length.

### Comfortable pacing and replay

Cards descend over 1.5 seconds each, staggered by 0.4 seconds; the final landing is
about 2.7 seconds after entry begins. Memory preview time starts after every card
lands, rather than at the beginning of descent.

Staff Controls → Game Pace selects **Relaxed 14 seconds**, **Standard 10 seconds
(default)** or **Brisk 8 seconds**. The last three preview seconds show a quiet
“Pictures will turn over soon” cue. Closing takes 0.9 seconds and target reveal
1.5 seconds; both actual animation completion and logical time gates protect input.
There is no memory timer in Level 1 and no resident response countdown.

Staff Controls → **Replay Pictures**, available only during Level 2 selection,
opens the same cards in the same positions, then repeats the chosen preview,
closing and same-target reveal. It preserves the question, rejected choices,
round number and skyline progress. It is hidden in Level 1 and disabled while busy.

### Singapore skyline rewards

Each correct answer illuminates the next locally drawn SVG landmark/section,
with gentle feedback and a restrained warm tint. Five-round sessions have five
increments; ten-round sessions have ten. Continuous play cycles through six
landmark stages. Progress persists between rounds and resets on a fresh session.
There are no negative scores, lives or failure screens.

## Interaction and accessibility

The live mirrored webcam covers the gameplay viewport without stretching. Staff
can adjust the crop to favour the resident's face and raised hand. Cover framing
necessarily crops some source edges on mismatched aspect ratios; it does not
promise that the whole camera frame is visible.

Two hands can be detected, but only one controlling hand/pointer is active. Move
an open hand towards a card or control and hold the pointer still for one second.
A visible ring shows dwell progress. Staff can adjust dwell/reach; Memory Peek
always requires at least one second. A hand pre-positioned over a closed card must
leave and re-enter, or move to a different card, before starting a fresh dwell.
Mouse, keyboard (Tab/Enter/Space) and touch provide alternatives.

Large cards, clear labels, contrast, fixed landing positions and reduced-motion
support aim to reduce interaction demands. Reduced motion removes spatial travel
and rotation while retaining preview and selection locks. Formal resident
usability and clinical effectiveness have not been verified.

Only Staff Controls appears at the top-right; Recenter Hand is the bottom gameplay
action. Management functions stay in the staff dialog. Opening it pauses the game.
The default 30-second inactivity return to Home counts answer time, not preview,
replay or animation time. Staff can choose 60 seconds or disable this return.

**Home keeps camera tracking active. End Session explicitly stops camera tracks,
worker, hand pointer and audio.** Home is not a privacy stop. Seek consent and
follow RCA procedures before enabling the camera; end the session when finished.
Frames are processed locally, with no application recording/upload or resident
identification. The initial installation needs internet access for packages/model.

## Technology and local development

React 19, TypeScript, Vite 8, CSS Modules and the existing local MediaPipe Hand
Landmarker worker are used. The root `package.json` and lockfile supply dependencies;
there is no separate game package. Node.js **22.18 or newer** is required by the
repository; recent checks used Node 26 and installed Google Chrome.

From the repository root:

```sh
npm ci
npm run dev
```

The install script prepares `public/mediapipe/`, downloading the model if absent.
If it fails or installation scripts were skipped, run `npm run setup:assets` before
using hands. Do not commit the downloaded model/WASM directory.

Open:

- Balloon Popper: `http://127.0.0.1:5173/`
- Card Matching: `http://127.0.0.1:5173/src/games/jayanth-card-matching/index.html`

Use the port printed by Vite if 5173 is occupied. Loopback HTTP permits camera
access; deployment to other devices requires a suitable HTTPS origin. There are
no application API keys or environment secrets to configure.

### Independent production preview

```sh
npm run build
npx vite build --config src/games/jayanth-card-matching/vite.config.ts
npx vite preview --config src/games/jayanth-card-matching/vite.config.ts --host 127.0.0.1 --port 5178
```

The root build remains Balloon Popper. The second build creates
`dist/card-matching/`; open `http://127.0.0.1:5178/` for its independent preview.
Serve that output as its own site root. It is not currently a nested route in the
Balloon Popper build: absolute asset/worker paths require deliberate integration.
See [integration constraints](INTEGRATION_GUIDE.md#production-entries-and-paths).

## Verification and limitations

Commands and current results are in [TESTING.md](TESTING.md). Synthetic fixtures
exercise timing, input locks, hand navigation, camera lifecycle and TV geometry;
they do not establish real tracking quality, speaker audibility, clinical benefit
or comfort for RCA residents. Physical checks remain necessary for lighting,
occlusion, seated reach, crop, TV contrast, photographs and English pronunciation.

English narration uses compatible local system voices. **No human recordings have
been supplied or bundled.** A missing voice does not block written gameplay;
Test Voice and diagnostic messages help staff troubleshoot. Future recordings
require consent, reuse permission and listening checks; see [RECORDINGS.md](RECORDINGS.md).

Photographs retain individual licences; keep author/source/licence notices and
GFDL text with redistributed assets. CC0 for the twelve original illustrations
does not license the photographs or all application code. No overall repository
software licence has been provided; agree reuse terms with the project owners.

Phase audit files are historical implementation records, not current operating
instructions. Generated screenshots/raw benchmark files live in ignored
`artifacts/` locally and are regenerated by tests; they are not required downloads
or tracked handover assets. See [TESTING.md](TESTING.md#evidence-and-historical-reports).
