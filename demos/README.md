# Local game demos

Run `npm run dev` from the repository root. The configured workspace needs no additional dependencies or API key for these games.

| Demo | Local link |
|---|---|
| Latest Balloon Pop — timed/endless rounds | http://127.0.0.1:5173/demos/balloon-pop/ |
| Singapore Skyline Journey — Level 1 Direct Match | http://127.0.0.1:5173/demos/direct-match/ |
| Singapore Skyline Journey — Level 2 Memory Peek | http://127.0.0.1:5173/demos/memory-peek/ |
| Existing CarePlay Studio | http://127.0.0.1:5173/ |
| Existing original Balloon Pop | http://127.0.0.1:5173/balloon |

These are three playable modes from two standalone game implementations. Direct Match and Memory Peek are levels of the same game, not separate branch projects.

Balloon: enable the webcam, or choose **Or try a preview → Start preview** for keyboard/mouse play. The card game requests the camera when opened; allow it for hand control, or use mouse/keyboard if permission is denied. Choose **Start Game**. Memory Peek opens at Level 2 automatically.

Use one camera game at a time. Card Matching's **Return Home** retains the camera; **End Session** stops it. End/close that tab before starting another camera game. Balloon has **Finish**. Check real camera positioning/reach and audio before the demo.

See [source revisions and verification](../docs/LOCAL-DEMO-GAMES.md). Imported upstream READMEs describe their original branch layouts; this guide gives this branch's current URLs.
