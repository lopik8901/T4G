import type { CardItem } from './categories.ts'
// Extend this type and resources if narration languages are reintroduced.
export type Language = 'en'
const en = {
  title: 'Card Matching', welcome: 'Let’s find a matching pair.', category: 'Category',
  animals: 'Animals', fruits: 'Fruits', colours: 'Colours', language: 'Language',
  length: 'Session length', continuous: 'Continuous', five: '5 rounds', ten: '10 rounds',
  audio: 'Audio', hints: 'Automatic hints', on: 'On', off: 'Off', start: 'Start playing',
  fullscreen: 'Fullscreen', pause: 'Pause', resume: 'Resume', skip: 'Skip Round', restart: 'Restart',
  repeat: 'Repeat Instruction', exit: 'Exit Game', reference: 'Match this card',
  success: 'Well Done!', retry: 'Let’s try another card. Take your time.', complete: 'A lovely session. Thank you for playing!',
  paused: 'Paused. Take your time.', help: 'Click, tap, or use Tab and Enter. With the camera, hold your hand pointer over a card for one second.',
  camera: 'Enable hand pointer', cameraOff: 'Turn camera off', cameraLoading: 'Connecting hand tracking…',
  cameraReady: 'Hand pointer ready', cameraError: 'Hand tracking is unavailable. Check camera permission and connection, then try again. You can still click, tap or use the keyboard.',
  cameraWaiting: 'Raise one hand to show the pointer.', rearm: 'Move to another card to try again.',
  voiceMissing: 'No matching speech voice is available. Written instructions remain available.',
  fullscreenError: 'Use your browser’s fullscreen control to fill the TV screen.', answers: 'Answer cards',
  choose: 'Choose', noRush: 'Take your time. There is no rush.', round: 'Round', hint: 'Here is a little help.',
  pointer: 'Hand pointer', staff: 'Staff controls',
  voice: 'Voice', autoVoice: 'Recommended local voice', testVoice: 'Test Voice', voiceSample: 'Take your time. Let’s find a matching card together.',
  rate: 'Speaking pace', volume: 'Speech volume', timeout: 'Return home after inactivity', seconds30: '30 seconds', seconds60: '60 seconds', disabled: 'Disabled',
  reminder: 'I’m here when you’re ready. Move your hand or choose a card.', warning: 'Returning home soon. Move your hand or press any key to keep playing.',
  prepare: 'Look at this card.', falling: 'Here come the choices…', ready: 'Choose the matching card.', familiar: 'Familiar pictures', allContent: 'All available pictures', content: 'Picture collection',
  credits: 'Picture credits',
  photoPending: 'More photographs are awaiting sourcing and review. Only available pictures are used.',
  cameraDefault: 'Uses your browser’s default camera. Select the USB webcam in browser camera settings before starting.',
}
export const messages = { en }
export function cardName(item:CardItem,_language:Language='en'):string{return item.label}
export function instruction(item:CardItem,_language:Language='en'):string{return `Find ${item.colour?'':'the '}${item.label.toLowerCase()}!`}
