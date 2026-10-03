// nowloading: the line that animates while Claude works, redrawn as something from before.
// Purely cosmetic. Every hook below observes and passes straight through with next(e): nothing touches
// Claude's context, prompts or tool calls, and nothing waits. The one "hold" (a finished tool call stays on
// screen for a moment) lives in the drawing only.
import type { EngineInterface, Register } from 'claude-code'
import type { SavedTurn } from '../types/index.d.ts'
import { NAMES, THEMES } from '../themes/index.js'
import { FRAMES } from '../themes/frames/index.js'
import { nativeTime } from '../themes/kit.js'
import { fallback, frameState, snapshot, words, type Snapshot, type Turn } from './state.ts'

/** A theme: its art where the dots were and, when it draws its own time, a tail in place of the engine's */
type Look = { name: string; art: (s: Snapshot) => string; tail?: (s: Snapshot) => string }
const LOOKS: Record<string, Look | undefined> = THEMES

const TICK_MS = 100 // the terminal's frame clock, ten pictures a second
const HOLD_MS = 1500 // how long a finished tool call stays on screen
const STORE_KEY = 'theme' // the person's pick, kept across sessions
const STORE_CONFIG = 'config' // the /config theme at the time of that pick: a later /config change wins
const SAVED_TURN = { plugin: 'nowloading', key: 'turn' } as const // the turn's start, kept across a hot reload

let configured = 'rewind' // the theme /config names
let choice = 'rewind' // a theme name, or 'random'
let current = 'rewind' // the theme drawn this turn; 'random' picks one per turn
const turn: Turn = { t0: 0, working: false, running: 0, result: null }
let started = false // turn.start has run for this turn
let spinnerId = '' // the terminal Spinner's instance, so frames can be swapped in place
let playing = '' // `${theme}:${state}` the terminal is playing
let position = 0 // frames into that sequence
let ticks = 0

const isTheme = (name: unknown): name is string => typeof name === 'string' && (name === 'random' || Object.hasOwn(LOOKS, name))
const widthOf = (markup: string) => Number(/width="([\d.]+)"/.exec(markup)?.[1] ?? 20)

function pick(previous: string): string {
  if (choice !== 'random') return choice
  const others = NAMES.filter(name => name !== previous)
  return others[Math.floor(Math.random() * others.length)] ?? previous
}

function sequence(name: string, state: string) {
  const pack = FRAMES[name as keyof typeof FRAMES]
  return pack.states[state as keyof typeof pack.states]
}

// Two states that play the same frames (the board's EN ROUTE while a tool runs and just after) are one picture
function samePicture(a: string, b: string): boolean {
  const [an = '', as = ''] = a.split(':'), [bn = '', bs = ''] = b.split(':')
  if (an !== bn) return false
  const x = sequence(an, as), y = sequence(bn, bs)
  return x !== undefined && y !== undefined && String(x.intro) === String(y.intro) && String(x.loop) === String(y.loop)
}

// The frame `position` steps into a state's sequence: the intro plays once, then the loop repeats
function frameAt(name: string, state: string, at: number): string {
  const pack = FRAMES[name as keyof typeof FRAMES]
  const seq = sequence(name, state)
  const index = (at < seq.intro.length ? seq.intro[at] : seq.loop[(at - seq.intro.length) % seq.loop.length]) ?? 0
  return pack.frames[index] ?? ''
}

function tick($: EngineInterface) {
  if (!turn.working) return
  ticks += 1
  // Once a second: the desktop's clock reads the time, and a held tool result expires
  if (ticks % 10 === 0) $.ui.invalidate('ui.render')
  if (spinnerId === '' || playing === '') return
  const [name = '', state = ''] = playing.split(':')
  position += 1
  $.ui.blit({ requestId: spinnerId, key: 'art', source: { png: frameAt(name, state, position) } })
    .then(r => {
      // Not mounted (a permission prompt covers the line) or no pictures here: wait for the next drawing
      if (r.deny) playing = ''
    })
    .catch(() => {
      playing = ''
    })
}

export const register: Register = (on, options) => {
  configured = isTheme(options.theme) ? String(options.theme) : 'rewind'
  choice = configured
  current = pick('')

  on('session.start', async ($, e, next) => {
    // Whichever was set last wins: a /nowloading pick, unless /config has changed since it was made
    const saved = await $.store.get(STORE_KEY).catch(() => undefined)
    const savedConfig = await $.store.get(STORE_CONFIG).catch(() => undefined)
    if (isTheme(saved) && savedConfig === configured) choice = saved
    current = pick('')
    // A hot reload mid-turn (a /config change, an update) keeps the turn's real start time
    const held = await $.state.get(SAVED_TURN).catch(() => undefined)
    if (held?.value?.working) {
      turn.working = true
      started = true
      turn.t0 = held.value.t0
    }
    await $.command.register({
      name: 'nowloading',
      description: 'Pick the loading animation: a theme, random, or nothing to list them',
      argumentHint: '[theme | random]',
      immediate: true,
    })
    $.clock.every(TICK_MS, () => tick($))
    return next(e)
  })

  // A subagent's turn runs inside the main one, so only the first start and the main loop's end count.
  // The time is read without holding the turn; a drawing made before it lands stamps the start itself.
  on('turn.start', async ($, e, next) => {
    if (!started) {
      started = true
      turn.working = true
      void $.clock.now().then(now => {
        if (turn.t0 === 0) turn.t0 = now
        const saved: SavedTurn = { t0: turn.t0, working: true }
        return $.state.set(SAVED_TURN, saved)
      }).catch(() => undefined)
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      started = false
      turn.working = false
      turn.t0 = 0
      turn.running = 0
      turn.result = null
      playing = ''
      current = pick(current)
      const saved: SavedTurn = { t0: 0, working: false }
      void $.state.set(SAVED_TURN, saved).catch(() => undefined)
    }
    return next(e)
  })

  // Observes the main loop's tool calls: the result passes through untouched and is only drawn
  on('tool.call', async ($, e, next) => {
    if (e.agentId) return next(e)
    turn.running += 1
    $.ui.invalidate('ui.render')
    try {
      const r = await next(e)
      const result = { value: r.deny !== undefined || r.isError ? ('error' as const) : 1, at: Number.POSITIVE_INFINITY }
      turn.result = result
      void $.clock.now().then(now => {
        result.at = now
      })
      return r
    } finally {
      turn.running = Math.max(0, turn.running - 1)
      $.ui.invalidate('ui.render')
    }
  })

  // /nowloading lists the themes, /nowloading <theme> switches now and for every session, random rotates
  on('command.run', { command: 'nowloading' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '') {
      $.ui.toast(`nowloading: ${choice} · themes: ${NAMES.join(', ')}, random`)
      return {}
    }
    if (!isTheme(arg)) {
      $.ui.toast(`nowloading: no theme "${arg}" · themes: ${NAMES.join(', ')}, random`)
      return {}
    }
    choice = arg
    current = pick(current)
    await $.store.set(STORE_KEY, choice)
    await $.store.set(STORE_CONFIG, configured)
    $.ui.toast(arg === 'random' ? 'nowloading: a new theme every turn' : `nowloading: ${arg}`)
    $.ui.invalidate('ui.render')
    return {}
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const look = LOOKS[current]
    if (!look) return next(e)
    const now = await $.clock.now()
    // The line is only drawn while a turn runs: a drawing before turn.start (or after a reload) starts the clock
    if (turn.t0 === 0) turn.t0 = now
    turn.working = true
    const s = snapshot(e.props.mode, turn, now, HOLD_MS)
    const text = words(e.props)

    // The desktop: the art where the dots were, the step text, and the time (the theme's own, or as the
    // engine writes it), since a drawn row hides the engine's dots and its elapsed time alike
    if (e.surface === 'desktop') {
      const { Box, Text, Svg } = $.ui.resolve(e)
      const art = look.art(s)
      const tail = look.tail?.(s)
      const time = nativeTime(s.elapsed)
      return Box({
        flexDirection: 'row',
        alignItems: 'center',
        children: [
          Svg({ source: art, alt: `${current}: ${fallback(current, s)}`, width: widthOf(art), height: 20 }),
          Text({ children: [` ${text} `] }),
          tail ? Svg({ source: tail, alt: time, width: widthOf(tail), height: 20 }) : Text({ children: [` ${time}`] }),
        ],
      })
    }

    // The terminal: the art as a picture (Ghostty, kitty), then the engine's own line with its verb, time and
    // tokens. Terminals without pictures draw the alt: the theme's words, dim. The engine's line starts with a
    // blank row, so the picture starts one row down to sit beside its text.
    if (e.surface === 'terminal') {
      const { Box, Text, Image } = $.ui.resolve(e)
      const state = frameState(s)
      const key = `${current}:${state}`
      if (key !== playing && !samePicture(key, playing)) position = 0
      playing = key
      spinnerId = e.requestId
      const pack = FRAMES[current as keyof typeof FRAMES]
      const picture = Image({
        key: 'art',
        source: { png: frameAt(current, state, position) },
        columns: pack.columns,
        rows: 1,
        alt: fallback(current, s),
      })
      return Box({ flexDirection: 'row', children: [Box({ marginTop: 1, children: [picture] }), Text({ children: [' '] }), await next(e)] })
    }

    return next(e)
  }).catch(($, e, next) => next(e))
}
