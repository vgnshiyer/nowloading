import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { NAMES, THEMES } from '../themes/index.js'
import { FRAMES } from '../themes/frames/index.js'
import { fallback, frameState, type Snapshot } from '../hooks/state.ts'

const APPROVED = ['floppy', 'dotmatrix', 'rally', 'filmstrip'] as const
const STATES: Snapshot[] = [
  { mode: 'requesting', running: false, elapsed: 0 },
  { mode: 'thinking', running: false, elapsed: 0 },
  { mode: 'tool-use', running: true, elapsed: 0 },
  { mode: 'tool-use', running: false, result: 1, elapsed: 0 },
  { mode: 'tool-use', running: false, result: 'error', elapsed: 0 },
  { mode: 'responding', running: false, elapsed: 0 },
]
const TURN = { text: 'read the files', turnId: 'new-themes' }
const typed = (args: string) => ({ command: 'nowloading', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }) as const
const spinner = (surface: 'desktop' | 'terminal', word = 'Reading files') => ({
  plugin: 'nowloading', surface, component: 'Spinner', props: { word, message: null, suffix: '…', mode: 'thinking' },
}) as const

function engine(on: On, saved: Record<string, unknown> = {}, blits: string[] = []) {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('store.get', ($, e) => ({ value: saved[e.key] }))
  on('store.set', ($, e) => { saved[e.key] = e.value; return { value: undefined } })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.blit', ($, e) => {
    if ('source' in e && 'png' in e.source) blits.push(e.source.png)
    return { value: {} }
  })
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Reading files… (1s · ↓ 20 tokens)'] }))
  return clock
}

test('theme registry and generated packs stay in sync; new fallback words fit their terminal cells', () => {
  expect(Object.keys(FRAMES)).toEqual(NAMES)
  for (const name of APPROVED) {
    const pack = FRAMES[name]
    expect(pack.fps).toBe(10)
    for (const s of STATES) {
      const sequence = pack.states[frameState(s)]
      expect(sequence.loop.length).toBeGreaterThan(0)
      for (const index of [...sequence.intro, ...sequence.loop]) {
        expect(Number.isInteger(index) && index >= 0 && index < pack.frames.length).toBe(true)
        expect(pack.frames[index].startsWith('iVBORw0KGgo')).toBe(true)
      }
      expect(fallback(name, s).length <= pack.columns).toBe(true)
      const art = THEMES[name].art(s)
      expect(art).toMatch(/^<svg [^>]*height="20"/)
      expect(THEMES[name].art({ ...s, elapsed: 1234 })).toBe(art)
    }
    // Spinner props can remain tool-use between hook events. Both surfaces still draw a running tool.
    expect(THEMES[name].art({ mode: 'tool-use', running: false, elapsed: 0 })).toBe(THEMES[name].art(STATES[2]))
  }
})

for (const name of APPROVED) {
  test(`/nowloading ${name} switches the terminal drawing and remembers the choice`, { options: { theme: 'rewind' } }, async ($, on) => {
    const saved: Record<string, unknown> = {}
    engine(on, saved)
    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    await $.turn.start(TURN)
    const ui = await $.ui.mount(spinner('terminal'))
    expect(await $.command.run(typed(name))).toEqual({})
    const art = await ui.find({ key: 'art' })
    expect(FRAMES[name].frames).toContain((art?.props.source as { png: string }).png)
    expect(saved.theme).toBe(name)
    expect(saved.config).toBe('rewind')
  })

  test(`${name} leaves the generic desktop word out and keeps the real elapsed time`, { options: { theme: name } }, async ($, on) => {
    const clock = engine(on)
    await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
    await $.turn.start(TURN)
    await clock.advance(5000)
    const ui = await $.ui.mount(spinner('desktop', 'Working'))
    expect(await ui.find({ type: 'Text', text: /Working/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^5s$/ })).toBeDefined()
    expect(await ui.findAll({ type: 'Svg' })).toHaveLength(1)
  })

  for (const surface of ['desktop', 'terminal'] as const) {
    test(`${name} shows tool results and immediately yields to a new running tool on ${surface}`, { options: { theme: name } }, async ($, on) => {
      const clock = engine(on)
      type Result = { result: string; isError?: boolean }
      let finish: ((result: Result) => void) | undefined
      on('tool.call', () => new Promise<Result>(resolve => { finish = resolve }))
      await $.session.start({ surface, isInteractive: true, cwd: '/work' })
      await $.turn.start(TURN)
      const ui = await $.ui.mount(spinner(surface))
      const check = async (s: Snapshot) => {
        if (surface === 'desktop') {
          expect((await ui.find({ type: 'Svg' }))?.props.source).toBe(THEMES[name].art(s))
        } else {
          const art = await ui.find({ key: 'art' })
          const sequence = FRAMES[name].states[frameState(s)]
          const pictures = [...sequence.intro, ...sequence.loop].map(i => FRAMES[name].frames[i])
          expect(pictures).toContain((art?.props.source as { png: string }).png)
          expect(art?.props.alt).toBe(fallback(name, s))
        }
      }
      // Each call begins before the previous result's 1.5-second hold expires.
      for (const isError of [false, true, false]) {
        finish = undefined
        const pending = $.tool.call({ tool: 'Bash', command: 'read files' })
        await clock.advance(100)
        expect(finish).toBeDefined()
        await check(STATES[2])
        const response: Result = isError ? { result: 'failed', isError: true } : { result: 'read' }
        finish!(response)
        expect(await pending).toEqual(response)
        await clock.advance(100)
        await check(isError ? STATES[4] : STATES[3])
      }
      await clock.advance(3000)
      await check(STATES[1])
    })
  }
}

test('Rally plays its error intro once, then holds the final frame across redraws', { options: { theme: 'rally' } }, async ($, on) => {
  const blits: string[] = []
  const clock = engine(on, {}, blits)
  on('tool.call', () => ({ result: 'miss', isError: true }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  await $.ui.mount(spinner('terminal'))
  await $.tool.call({ tool: 'Bash', command: 'read files' })
  blits.length = 0
  await clock.advance(1200)
  const pack = FRAMES.rally, sequence = pack.states.error
  const expected = Array.from({ length: 12 }, (_, i) => {
    const at = i + 1
    return pack.frames[at < sequence.intro.length ? sequence.intro[at] : sequence.loop[(at - sequence.intro.length) % sequence.loop.length]]
  })
  expect(blits).toEqual(expected)
})
