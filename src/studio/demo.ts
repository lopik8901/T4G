import { applyPatch, templateGame, type GameConfig, type GamePatch } from './config.ts'

export function demoAgent(prompt: string, config: GameConfig, action: 'create' | 'edit') {
  const text = prompt.toLowerCase()
  if (/voice|speech|body tracking|jump|shoot|race|violent|flash|timer|countdown/.test(text)) return { patch: {}, explanation: 'That mechanic is not available. Try hand tracking or sound detection with balloons, a garden, or photo reveal.', unsupported: true }
  if (action === 'create' && !/garden|flower|seed|memory|photo|reminisc|balloon|butterfl|fruit/.test(text)) return { patch: {}, explanation: 'Demo mode can create balloon, garden, photo reveal, butterfly, and fruit activities. Try one of those ideas, or connect an AI provider for broader descriptions.', unsupported: true }
  let patch: GamePatch = {}
  let template = config.template
  if (/garden|flower|seed/.test(text) && (action === 'create' || /change|switch|create|make a garden/.test(text))) template = 'garden'
  if (/memory|photo|reminisc/.test(text) && (action === 'create' || /change|switch|create/.test(text))) template = 'memory'
  if (/balloon/.test(text) && (action === 'create' || /change|switch/.test(text))) template = 'balloons'
  if (template !== config.template || action === 'create') {
    const defaults = templateGame(template, config.id)
    patch = { template, object: defaults.object, name: defaults.name, scoring: defaults.scoring }
  }
  if (/butterfl/.test(text)) patch = { ...patch, template: 'balloons', object: 'butterfly' }
  if (/fruit/.test(text)) patch = { ...patch, template: 'balloons', object: 'fruit' }
  if (/bigger|larger|twice/.test(text)) patch.size = Math.min(2, config.size * (/twice/.test(text) ? 2 : 1.25))
  if (/smaller/.test(text)) patch.size = Math.max(0.8, config.size * 0.8)
  if (/slow/.test(text)) patch.speed = Math.max(0.2, config.speed * 0.65)
  if (/faster/.test(text)) patch.speed = Math.min(1.8, config.speed * 1.25)
  if (/remove scor|no scor|without scor/.test(text)) patch.scoring = false
  if (/add scor|enable scor/.test(text)) patch.scoring = true
  if (/two|2 player/.test(text)) patch.players = 2
  if (/one player|1 player/.test(text)) patch.players = 1
  if (/sensitiv|easier to reach/.test(text)) patch.sensitivity = Math.min(2, config.sensitivity + 0.2)
  if (/music/.test(text)) patch.music = !/remove|no music|stop music/.test(text)
  if (/mute|quieter/.test(text)) patch.volume = /mute/.test(text) ? 0 : config.volume / 2
  if (/ocean|blue/.test(text)) patch.theme = 'ocean'
  if (/sunshine|warm/.test(text)) patch.theme = 'sunshine'
  if (/sound|clap/.test(text)) patch.inputs = /hand/.test(text) ? ['hand_tracking', 'sound_detection'] : ['sound_detection']
  if (/hand/.test(text) && !/sound|clap/.test(text)) patch.inputs = ['hand_tracking']
  if (/seated|sitting/.test(text)) patch.seated = true
  if (!Object.keys(patch).length) return { patch: {}, explanation: 'Demo supports: bigger objects, slower/faster, remove scoring, two players, sensitivity, music, themes, hand/sound input, and switching templates. Configure a provider for free-form AI requests.', unsupported: true }
  applyPatch(config, patch)
  return { patch, explanation: `Updated ${Object.keys(patch).map(key => key.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}. Your other settings are preserved.`, unsupported: false }
}
