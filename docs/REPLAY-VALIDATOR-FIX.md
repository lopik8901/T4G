# Sequential Fruit Sorting replay validation — 2026-11-09

User-reported draft: `144851c9-efc6-483d-8b6e-429391fcaa0f`. All three authoring attempts failed the same independent check: `Design acceptance: replay must restore selectable objects`. Generated category matching had already validated successfully.

Root cause: `sandbox/design-acceptance.mjs` equated all restored sources with all **visible** sources. This game intentionally exposes one fruit at a time, retaining the other uncollected fruit as hidden entities. Its replay was rejected despite passing all original rounds.

The check now verifies the full restored, uncollected source count plus an initially visible source, then actually plays every item in the first replay batch. This supports sequential presentation while still rejecting games that never reveal the remaining objects. The regression test in `server/design-acceptance.test.ts` verifies both outcomes. No generated source or generated tests were edited.

The unchanged final draft passed real Docker validation: seven generated tests, full-design-lifecycle, new-round-arrangements, completion, replay-playable, wrong-target-no-progress and the existing generic runtime probes. Raw local evidence is `artifacts/fruit-replay-revalidation.json`. Original failed proposal metadata is retained as historical evidence; this revalidation does not silently rewrite the UI's old failure report or publish a recovered activity.

The trusted image was rebuilt as `sha256:df1a17cfec273d7135a0eafeb4638aeeb30ba23be7c6df2a60a72a56290f2ded`. All six previously validated component versions were explicitly revalidated against the updated harness, preserving their source/versions and trust statuses. Results: `artifacts/replay-validator-component-checks.json`.

`npm test`: 42 passed, six opt-in integrations skipped. `npm run build`: passed (existing BalloonScene chunk warning). Backend restarted with the new harness fingerprint. The browser should be refreshed before retrying creation; its existing failure card is a snapshot of the previous job. Physical webcam testing was not repeated for this validator-only change.
