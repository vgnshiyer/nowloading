import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { NAMES } from '../themes/index.js'
import { FRAMES } from '../themes/frames/index.js'

const SURFACES = ['desktop', 'terminal'] as const
const TURN = { text: 'fix the refund bug', turnId: 't1' }
const DONE = { turnId: 't1', answer: 'done', durationMs: 60000, isAborted: false, reason: 'answer' } as const
// The slash command as the person types it
const typed = (args: string) => ({ command: 'nowloading', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }) as const
const spinner = (surface: (typeof SURFACES)[number], props: Record<string, unknown> = {}) =>
  ({ plugin: 'nowloading', surface, component: 'Spinner', props: { word: 'Running npm test', message: null, suffix: '…', mode: 'tool-use', ...props } }) as const

// Stands in for Claude Code: answers what the mod passes on, and draws the engine's own spinner line
function engine(on: On, store: Record<string, unknown> = {}, blits: string[] = [], saved: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: 1_000_000 })
  // The store, in memory: what the mod saves lands in `saved` for the test to read
  const memory: Record<string, unknown> = { ...store }
  on('store.get', ($, e) => ({ value: memory[e.key] }))
  on('store.set', ($, e) => {
    memory[e.key] = saved[e.key] = e.value
    return { value: undefined }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.blit', ($, e) => {
    if ('source' in e && 'png' in e.source) blits.push(e.source.png)
    return { value: {} }
  })
  on('ui.render', ($, e) => ({
    type: 'Text',
    props: {},
    children: [e.component === 'Spinner' ? `✻ ${e.props.message ?? e.props.word}… (12s · ↓ 300 tokens)` : ''],
  }))
  return clock
}

for (const name of NAMES) {
  for (const surface of SURFACES) {
    test(`${name} draws in place of the dots on the ${surface}, and keeps the step and the time`, { options: { theme: name } }, async ($, on) => {
      const clock = engine(on)
      await $.session.start({ surface, isInteractive: true, cwd: '/work' })
      await $.turn.start(TURN)
      await clock.advance(75_000)
      const ui = await $.ui.mount(spinner(surface))
      if (surface === 'desktop') {
        const art = await ui.find({ type: 'Svg' })
        expect(art?.props.source).toMatch(/^<svg /)
        expect(await ui.find({ type: 'Text', text: /Running npm test…/ })).toBeDefined()
        // The real elapsed time: the theme's own (a tape counter, a flap clock) or the engine's wording
        const svgs = await ui.findAll({ type: 'Svg' })
        const time = await ui.find({ type: 'Text', text: /1m 15s/ })
        expect(svgs.length === 2 ? svgs[1]?.props.alt : time?.text).toMatch(/1m 15s/)
      } else {
        const art = await ui.find({ key: 'art' })
        expect(art?.type).toBe('Image')
        expect(FRAMES[name as keyof typeof FRAMES].frames).toContain((art?.props.source as { png: string }).png)
        // The engine's own line follows, with its verb, time and tokens
        expect(await ui.find({ type: 'Text', text: /Running npm test… \(12s · ↓ 300 tokens\)/ })).toBeDefined()
      }
    })
  }
}

test("another mod's message shows in the step text", { options: { theme: 'sandglass' } }, async ($, on) => {
  engine(on)
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('desktop', { message: 'Preparing TPS reports' }))
  expect(await ui.find({ type: 'Text', text: /Preparing TPS reports…/ })).toBeDefined()
})

test('the terminal swaps frames in place while Claude works', { options: { theme: 'sandglass' } }, async ($, on) => {
  const blits: string[] = []
  const clock = engine(on, {}, blits)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  await $.ui.mount(spinner('terminal'))
  await clock.advance(2000)
  expect(blits.length).toBeGreaterThan(10)
  expect(new Set(blits).size).toBeGreaterThan(1)
  // and stop once the turn is over
  await $.turn.complete(DONE)
  const after = blits.length
  await clock.advance(2000)
  expect(blits.length).toBe(after)
})

test('/nowloading <theme> switches the drawing at once and remembers it', { options: { theme: 'rewind' } }, async ($, on) => {
  const saved: Record<string, unknown> = {}
  engine(on, {}, [], saved)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('terminal'))
  const before = (await ui.find({ key: 'art' }))?.props.columns
  expect(await $.command.run(typed('arrivals'))).toEqual({})
  const art = await ui.find({ key: 'art' })
  expect(FRAMES.arrivals.frames).toContain((art?.props.source as { png: string }).png)
  expect(art?.props.columns).not.toBe(before)
  expect(saved.theme).toBe('arrivals')
})

test('a saved pick wins over the /config theme it was made under', { options: { theme: 'rewind' } }, async ($, on) => {
  engine(on, { theme: 'platform', config: 'rewind' })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('terminal'))
  expect(FRAMES.platform.frames).toContain(((await ui.find({ key: 'art' }))?.props.source as { png: string }).png)
})

test('a /config change made after the pick wins', { options: { theme: 'sandglass' } }, async ($, on) => {
  engine(on, { theme: 'platform', config: 'rewind' })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('terminal'))
  expect(FRAMES.sandglass.frames).toContain(((await ui.find({ key: 'art' }))?.props.source as { png: string }).png)
})

test('/nowloading with no theme, or an unknown one, changes nothing and says nothing to Claude', { options: { theme: 'cassette' } }, async ($, on) => {
  engine(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(await $.command.run(typed(''))).toEqual({})
  expect(await $.command.run(typed('jukebox'))).toEqual({})
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('terminal'))
  expect(FRAMES.cassette.frames).toContain(((await ui.find({ key: 'art' }))?.props.source as { png: string }).png)
})

test('random picks a new theme every turn', { options: { theme: 'random' } }, async ($, on) => {
  engine(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const seen: number[] = []
  for (let i = 0; i < 6; i++) {
    await $.turn.start({ ...TURN, turnId: `t${i}` })
    const ui = await $.ui.mount(spinner('terminal'))
    const png = ((await ui.find({ key: 'art' }))?.props.source as { png: string }).png
    seen.push(NAMES.findIndex(n => FRAMES[n as keyof typeof FRAMES].frames.includes(png)))
    await $.turn.complete({ ...DONE, turnId: `t${i}` })
  }
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
})

test('a failed tool call shows on the board, and the call itself is untouched', { options: { theme: 'arrivals' } }, async ($, on) => {
  const clock = engine(on)
  const failed = { result: 'exit 1', text: 'exit 1', isError: true } as const
  on('tool.call', () => failed)
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' })
  await $.turn.start(TURN)
  const ui = await $.ui.mount(spinner('desktop'))
  const running = (await ui.find({ type: 'Svg' }))?.props.source
  expect(await $.tool.call({ tool: 'Bash', command: 'npm test' })).toEqual(failed)
  await clock.advance(100)
  const after = (await ui.find({ type: 'Svg' }))?.props.source
  expect(after).not.toBe(running)
  // and the board goes back to its usual word once the moment has passed
  await clock.advance(3000)
  expect((await ui.find({ type: 'Svg' }))?.props.source).not.toBe(after)
})

test("never touches the prompt or Claude's tool calls", { options: { theme: 'channel3' } }, async ($, on) => {
  const clock = engine(on)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  on('tool.call', () => ({ result: 'ok' }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const prompt = await $.prompt.submit({ text: TURN.text, origin: { kind: 'composer' }, wait: false })
  await $.turn.start(TURN)
  await clock.advance(5000)
  expect(prompt.context).toBeUndefined()
  expect(await $.tool.call({ tool: 'Bash', command: 'npm test' })).toEqual({ result: 'ok' })
})
