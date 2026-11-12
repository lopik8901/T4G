# CarePlay Studio implementation contract

The supplied CarePlay brief is the product specification. Build on AI_workflow; preserve the original app at /balloon. Default / opens Studio. No cloud deployment or push is part of this task.

Build order: validated configuration → versioned Zustand state and IndexedDB → shared mirror/input/rule/render pipeline → deterministic demo and server-only Vercel AI SDK → dashboard/wizard/editor → integration tests.

Configuration is data, never executable code. Only hand and sound inputs are enabled. Camera/microphone data and local photos never enter AI requests. AI patches use an allowlist, undergo schema and accessibility validation, and apply only if the editor revision has not changed. Save includes history and local images. Changes revoke staff approval. Launch requires explicit staff approval.

Three templates: balloons pop and respawn; garden seeds become flowers with shared progress and butterflies; memory cards reveal locally stored photos gradually. All share camera, interaction and rules. The existing Three.js balloon scene is reused for balloons.

Default AI provider: installed Codex CLI with ChatGPT login, invoked on the loopback backend with ephemeral schema-constrained output in an isolated temporary working directory. User configuration and rules are ignored and shell tools disabled. The OpenAI API/AI SDK path remains an explicit alternative. Account tokens are owned solely by the CLI and never read by CarePlay.

Verify with npm test, npm run build, and Playwright workflow tests. Live provider verification needs an API key; real hands/microphone and HDMI need manual checks. Demo is explicitly deterministic and never described as an LLM.
