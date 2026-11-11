# Local English narration

The active game is English only. No genuine human recordings have been supplied.
`recording-manifest.json` lists **117 required English clips**: 112 target phrases
and five shared clips for encouragement, retry, reminder, completion and Test Voice.
Each entry has exact text, phrase ID, proposed filename and missing status.

Approved local recordings take priority over compatible locally installed English
system voices. Network voices and external recording URLs are rejected. Missing
clips produce an English diagnostic and try local English synthesis; missing voices
do not prevent written gameplay. Volume/mute apply to both sources.

Have staff review the vocabulary, delivery and comfortable volume. Obtain speaker
consent and redistribution permission. Bundle approved MP3 files under
`recordings/en/` and map static URLs in `speech.ts`, for example:

```ts
recordedClips.en = {
  'find:animals:bird': new URL('./recordings/en/find-animals-bird.mp3', import.meta.url).href,
}
```

Vite includes statically referenced clips in production. Keep consent originals
outside the application and include appropriate audio credits. Mark a manifest
entry supplied only after licensing and listening checks. No synthetic test clip
should be described as human narration. The language-keyed map remains extensible;
no other language is selectable or played by the current runtime.

If Chrome exposes no compatible local English voice, install an English system
voice through the computer's accessibility/speech settings, restart Chrome and
use Staff Controls → English Audio Settings → Test Voice. Apple's
[voice settings guide](https://support.apple.com/en-om/guide/mac-help/mchlp2290/mac)
explains the Mac controls. Voice installation may require a one-time download;
playback must be checked offline.

## Mandatory listening checklist

- Physically click Test Voice with Audio On; listen through the intended TV speakers.
- Check English target instructions in all three categories and comfortable volume.
- Listen to encouragement, retry, reminder and completion separately.
- Check mute, volume, Repeat, rapid Skip/Restart, Pause/Resume, Home and End Session.
  No obsolete instruction should continue or overlap the next request.
- Test approved recordings offline. Remove one temporarily to check the diagnostic
  and local-system fallback; test neither source available as well.
- Confirm missing speech never blocks either game level.

Speech/API completion events and mocked audio tests do not prove audible playback.

## Related guides

See [Staff guide](STAFF_GUIDE.md) for operation, [Architecture](ARCHITECTURE.md) for cancellation/lifecycle and [Testing](TESTING.md) for API versus audible verification. The 117-entry manifest does not currently include the neutral Memory Peek preview phrase; add a separate consented clip/mapping if recording that cue.
