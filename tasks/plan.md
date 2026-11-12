# CarePlay complete-game and discovery upgrade

1. Assess upstream code/licenses and current boundaries. Record decisions before implementation.
2. Define game designs and component requirements. Implement deterministic trusted-first discovery, explicit compatibility/quality gates and an external catalog. Test decisions and avoid forced reuse.
3. Add a shared data-only SDK: lifecycle, progress, seeded randomness, geometry and context construction. Preserve legacy mechanics and use the same implementation in Docker/browser.
4. Add approved illustrated asset IDs, scene/visual specifications and trusted progress/replay rendering. No untrusted URLs or generated HTML.
5. Integrate designer, planner, discovery, visual selection, mechanics and deterministic QA into bounded authoring. Freeze executable tests after compilation and feed genuine failures back. Retain normal configuration editing for trivial requests.
6. Validate actual Fruit Sorting through the wizard, a different game, lifecycle/replay behavior, Docker and existing regressions. Update prompts/evidence/security/setup documentation and report limits honestly.

Highest-value vertical slice: full design/discovery through playable multi-round/replay previews with attractive local assets. External paid asset generation and engine replacements remain explicitly optional, not placeholders for working local features.
