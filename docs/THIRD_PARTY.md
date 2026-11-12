# References, dependencies, and licences

No repository was copied wholesale. Existing Balloon Pop source remains local project code. New illustrations and PCM sound assets are generated in project source, with no stock-photo or external-audio dependency. Uploaded photos are supplied by staff and stay in their browser.

| Reference | Use | Licence |
|---|---|---|
| [Vercel AI SDK](https://github.com/vercel/ai) | Installed AI SDK 6 and OpenAI provider 3. Studied installed version's structured-output example (`generateText`, `Output.object`). | Apache-2.0 |
| [MediaPipe web samples](https://github.com/google-ai-edge/mediapipe-samples-web) / [official Hand Landmarker guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) | Reuse existing local worker with mirrored mapping and throttled inference. | Apache-2.0; model licences accompany Google distributions |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | Reuse existing balloon scene, resources and render loop. | MIT |
| [Drei](https://github.com/pmndrs/drei) | Existing orthographic camera and line components. | MIT |
| [React Three Examples](https://github.com/pmndrs/react-three-examples) | Reference requested; no code/assets incorporated because the supplied path was unavailable during verification. | Not relied on; verify before future incorporation |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Adapted Button composition/variant pattern using Radix Slot; project owns the CSS and markup. | MIT notice below |
| [Zustand](https://github.com/pmndrs/zustand) | Installed store for synchronized configuration and history. | MIT |
| [Howler](https://github.com/goldfire/howler.js) | Installed playback for generated gentle effects/music. | MIT |
| [React Flow](https://github.com/xyflow/xyflow) | Not installed; no visual mechanics editor in V1. | No code incorporated |

Dependencies retain upstream licence files in npm packages. Direct dependency licences were checked in installed package metadata as part of implementation. Fonts retain their Fontsource package licences. Avoid removing upstream notices when redistributing dependencies.

[Roseblox](https://github.com/rosebudai/roseblox) (MIT, original copyright 2025 Mike Liu) was inspected as an architectural reference for entity/system/resource registration and lifecycle separation. No Roseblox source or assets are incorporated. [TypeScript](https://github.com/microsoft/TypeScript) 5.9.3 (Apache-2.0) is installed under the `typescript-compiler` alias for non-executing source diagnostics; the existing TypeScript 7 CLI remains the app build checker.

## shadcn/ui pattern attribution

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
