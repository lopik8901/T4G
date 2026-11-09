# KWSH staff guide

Singapore Skyline Journey is a supported picture-matching activity for one
resident at a time. Use your RCA consent and activity procedures. Choose a
comfortable pace, supervise the resident and stop if they seem uncomfortable.
This prototype is not a clinical assessment or a proven treatment.

## Prepare the room and equipment

You need the prepared MacBook, its charger, Google Chrome, a TV, an HDMI cable
(and a compatible adaptor if needed), and a webcam. A USB webcam mounted securely
on or near the TV helps the resident look towards the screen. Use good, even
lighting and a clear view of the resident's face and hand. Keep cables out of the
way and let the resident remain comfortably seated without leaning or reaching far.

1. Connect the MacBook to the TV with HDMI and select the matching TV input.
2. In the Mac's display settings, mirror the laptop display to the TV. Check that
   the whole game and controls are visible; avoid TV zoom/overscan that cuts edges.
3. Connect the USB webcam's data cable to the **MacBook** or its USB adaptor/hub.
   Plugging it into a TV USB port usually does not make it available to the laptop;
   HDMI alone does not return webcam video to the MacBook.
4. Check the intended sound output and keep volume comfortable. A wired connection
   and mains power are preferable for a session.

Ask the project team to install and prepare the application before residents
arrive. The first installation downloads software/model files. Normal play uses
local files and local camera processing; it does not record or upload the resident.

## Open the activity

Use the project team's prepared browser address or launch instructions. If the
MacBook is already set up for development, open Terminal in the T4G folder, run
`npm run dev`, and leave that window open. Open the address printed by the launcher,
followed by `/src/games/jayanth-card-matching/index.html`.

For example:
`http://127.0.0.1:5173/src/games/jayanth-card-matching/index.html`.
The port number may differ. The shorter address ending at `/` opens Balloon Popper,
not this game. Ask the project team for help rather than installing software during
a resident session. Developers have separate [setup instructions](README.md#technology-and-local-development).

Chrome requests camera permission automatically. Choose Allow, confirm the correct
webcam and wait for the live mirror/hand pointer. Browser permission and fullscreen
prompts may require a mouse or touch; hand hovering cannot approve browser-owned
prompts. Close video-call applications if the webcam is already in use.

For a TV session, select Fullscreen on Home, or Staff Controls → Fullscreen during
play. A direct mouse/keyboard action may be required by Chrome. The Mac's ordinary
fullscreen controls can also help. Confirm the face and raised hand are visible;
the mirror crops some camera edges to fill the TV without stretching.

## Choose the activity

On Home:

1. Select **Animals**, **Fruits** or **Colours**.
2. Open **Game Options**. Choose **1 — Direct Match** or **2 — Memory Peek**.
   Start with the Familiar picture collection; Extended includes less familiar
   pictures that should be reviewed with staff. Select Done.
3. Choose Continuous, 5 rounds or 10 rounds. There are no lives or negative scores.
4. Check Audio On/Off and, if using speech, test it before play.
5. Select **Start Game**.

### Level 1: Direct Match

The reference appears first and settles at the top-left. Four large cards descend
and stop. Ask the resident to find the same picture. There is unlimited answer
time apart from the configurable inactivity return to Home. A wrong card gently
greys out and the resident can try another. Correct matches light the Singapore
skyline and lead to the next round.

### Level 2: Look, Remember, Match

Four pictures arrive before the target is shown. Let the resident look at all four.
The preview is Standard 10 seconds by default; a quiet message says the pictures
will turn over soon. All cards close before the reference appears. Ask the resident
to find the picture they remember. Input stays disabled until the reveal finishes.

Use **Staff Controls → Game Pace** for Relaxed 14 seconds, Standard 10 seconds or
Brisk 8 seconds. These choices also apply to replay. Changing pace pauses play;
if a preview has already started, its elapsed time is retained when you change its
total duration. Use Relaxed if the resident needs more time. Level 1 has no memory
preview timer.

## Selecting with a hand

Move one open hand so the large pointer rests over a card or button. Hold still
while its ring fills, normally for one second. No pinching, waving or tapping is
required. Four answer cards are the same size and remain in fixed positions.
Two hands may be detected, but only one controls the pointer. Avoid crossing hands
or covering the intended hand with a phone or another object.

For Memory Peek, a hand already over a card before selection opens must move away
and back, or move to another card, before a fresh hover can count. Similarly, move
intentionally towards a menu button after opening a staff dialog. This prevents
stationary hands accidentally choosing something as the screen changes.

Mouse clicking, touch, or Tab followed by Enter/Space can help. Staff can use these
alternatives without switching off the camera. Do not ask residents to strain to
reach a control.

### Recentring and framing

Select **Recenter Hand** at the bottom-right. Hold the controlling hand in a natural
resting position during the short calibration pause. This centres the large
pointer and enables Assisted reach for smaller seated movements. The small palm
marker still indicates the hand's actual position in the mirror.

Staff Controls → Camera Settings provides vertical/horizontal framing and a camera
choice. Try Upper body/Centre first, then adjust to keep the face and hand visible.
**Mirror aligned** makes the large pointer follow the displayed palm literally;
**Assisted reach** spreads smaller hand movements across the screen. A hand outside
the visible crop may not activate cards in Mirror aligned mode even if detected.
These settings are temporary and are not a record of the resident.

## Staff Controls and breaks

The top-right **Staff Controls** button pauses the activity and contains:

| Task | Action |
| --- | --- |
| Continue after a break | Resume |
| Hear the current cue again | Repeat Instruction; early memory phases repeat a neutral cue |
| See memory pictures again | Replay Pictures, during Level 2 selection only |
| Change preview duration | Game Pace |
| Move to another question | Skip Round |
| Begin a fresh journey | Restart, then confirm |
| Check sound | English Audio Settings |
| Choose webcam or crop | Camera Settings |
| Choose the controlling hand | Select Hand / Diagnostics |
| Support smaller movement | Recenter / Calibrate Hand |
| Adjust automatic Home return | Inactivity Settings |
| Leave this game but keep hand navigation | Return Home |
| Finish private camera use | End Session, then confirm |

**Replay Pictures** opens the same pictures in their existing positions, holds them
for the selected pace, then closes them and reveals the same target again. It does
not count as another round, change skyline progress or penalise the resident.
Previously rejected choices remain disabled afterwards. Replay is unavailable
while a protected animation/preview is busy and is hidden in Level 1. You can pause
and resume a replay using Staff Controls.

By default, about 25 seconds of inactivity during answer selection shows a warning;
after 30 seconds it returns to Home. Move meaningfully, press a key or use a control
to continue. Preview, replay, flip, reveal and paused time do not use that allowance.
Staff can select 60 seconds or disable it. Home continues to show/use the camera.

## Finish the session

Choose **Staff Controls → End Session**, then confirm **End Session**. The camera,
tracking worker, hand pointer and audio stop. Reopening after End requires mouse,
keyboard or touch. Closing the application tab also ends its browser session.

**Return Home is not a camera stop.** Always use End Session when residents have
finished or withdraw consent. Follow RCA procedures for supervision and consent;
no individual resident details need to be entered in the application.

## Troubleshooting

| What you see/hear | What to try |
| --- | --- |
| No camera or permission denied | Check the USB cable, close video-call apps, allow camera access in Chrome's site controls and Retry camera. Ask the team if Mac camera privacy permission is blocked. |
| Laptop camera instead of TV webcam | Staff Controls → Camera Settings → select the USB webcam. Confirm the face/hand view after changing it. |
| Pointer missing or unstable | Improve lighting, bring one open hand into view, uncover it, separate crossing hands and move the intended hand clearly. Use Select Hand / Diagnostics or Recenter. |
| Pointer does not follow the palm exactly | Assisted reach deliberately changes pointer reach. Use Mirror aligned if literal alignment is wanted; check framing/crop. |
| Card will not select | Wait for every arrival/flip/reveal to finish. In Memory Peek move off the card and back, then hold for a full second. Rejected grey cards are disabled. |
| Silent English narration | Check Audio On, Mac/TV sound output and volume. Physically click Test Voice in English Audio Settings. Install a compatible local English system voice with project-team help, restart Chrome and test again. Human recordings are not installed. Written play still works. |
| Camera/tracking disconnected | Check the cable and Retry camera or restart the page. End the session first if a resident needs privacy. |
| Edges clipped or face covered | Exit fullscreen temporarily, check TV zoom/mirroring and adjust camera framing or physical placement. |
| Accidental Home return | Open Inactivity Settings and choose a longer allowance or disable it for supported play. |

For unresolved problems, stop and use another activity; send the project team the
browser message and steps taken. Do not record residents to demonstrate an issue
without the required RCA consent and procedures.
