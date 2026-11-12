> Historical static-authoring milestone. The subsequent Docker/build/preview implementation and current blockers are documented in [ISOLATED-PREVIEW.md](ISOLATED-PREVIEW.md).

> Historical static-authoring milestone. The subsequent Docker/build/preview implementation and current blockers are documented in [ISOLATED-PREVIEW.md](ISOLATED-PREVIEW.md).

# Autonomous builder architecture assessment

## Existing application

CarePlay has a working React editor, IndexedDB saves, versioned Zustand configuration, MediaPipe worker, local sound analyser, and Three.js balloon renderer. `editableSchema` enumerates templates and object types. `askCodex` returns a complete editable configuration, converted into a patch. `GamePreview` dispatches fixed rules by template. There is no module discovery, source-generation contract, isolated test executor, artifact provenance, or promotion gate. A missing mechanic cannot be expressed, so the current agent refuses it.

## Roseblox evidence and decision

Inspected the public [README](https://github.com/rosebudai/roseblox), [GameSystems implementation](https://github.com/rosebudai/roseblox/blob/main/src/gameSystems.js), [entry point](https://github.com/rosebudai/roseblox/blob/main/src/index.js), [authoring guide](https://github.com/rosebudai/roseblox/blob/main/docs/ROSEBLOX.md), and [MIT licence](https://github.com/rosebudai/roseblox/blob/main/LICENSE). Sources retrieved on 2026-11-08; upstream main is mutable and the older raw entry point differs from newer documented instance APIs.

`GameSystems` uses a Miniplex world, resource factories, setup systems, and priority-ordered runtime systems. Gameplay owns its rules rather than being limited to an object-type enum. This suggests stable capability contracts and a registry, with rendering outside generated behavior. The newer guide describes per-game ownership/disposal and fixed-step lifecycle. These are useful design patterns, not evidence of a public production AI generator. The public engine does not supply CarePlay's required untrusted-code isolation or proprietary Rosebud orchestration.

Retain the current engine and React UI. Add plain typed entities, normalized input snapshots, behavior factories, command outcomes, component metadata, and independent preview sessions. Do not adopt Rapier, camera controls, the singleton entry point, or a second rendering loop for this 2D mirror application. No Roseblox code/assets are copied or dependency installed; architecture references only.

## Scope and trust boundaries

The orchestrator chooses configuration editing or a code-generation proposal. Missing mechanics trigger planning and TypeScript/test authoring rather than a template rejection. Codex receives only the contract, registry metadata, text, and configuration; no camera, microphone, hand landmarks, photos, credentials, or repository checkout. It returns source as schema-constrained text with tools disabled. Source is written to a quarantined job directory using fixed filenames.

Static TypeScript diagnostics are **not** a security sandbox or evidence that tests passed. No generated module is imported, evaluated, bundled, or executed on the privileged backend. A validator adapter must provide restricted filesystem/network, no secrets, explicit build tools/dependencies, execution timeout, CPU/memory/process limits, behavioral tests, tracking-loss tests, runtime loading, and integration evidence. An iframe by itself is insufficient. Sandbox evidence and an immutable source hash are required before experimental preview; developer approval is separately required before shared-library promotion.

## Available environment and honest fallback

Codex CLI is available with ChatGPT sign-in. Docker/Podman are absent and WSL reports not installed. Therefore this iteration provides a real model-backed local development workflow: request → plan → source/tests → static diagnostics → bounded repair → quarantined proposal saved for a developer. Autonomous execution, behavioral test execution, preview bundling, and generated-code promotion are unavailable. Staff see that limitation; existing trusted games keep working.

The Butterfly Garden and fishing requests should generate the same reusable hand-guidance/target-transformation concept; circle drawing should cause a new recognizer proposal. Tests distinguish contract/diagnostic/pipeline behavior from actual isolated runtime evidence. This is not a claim that those generated games are playable on the current laptop.
