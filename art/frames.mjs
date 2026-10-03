// Builds the terminal's picture frames from the same SVG art the desktop draws.
//   node art/frames.mjs            -> PNGs and a manifest in art/.frames/, then: python3 art/pack.py
// Ghostty and kitty show an Image, not SVG, so every look is drawn in headless Chrome for each state of a
// turn and stepped through its SMIL clock frame by frame: one-shot motion (a riffle, a flip) plays once as the
// intro, then the repeating motion is captured over one period so it loops seamlessly.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, ROOT } from './cdp.mjs'

const OUT = join(ROOT, 'art', '.frames')
const FPS = 10
const SCALE = 2 // the art is drawn 20px tall; the terminal's row is about 40px on a Retina screen
const INK = '#8b8984' // the terminal has no currentColor for a picture: a muted gray that reads on dark and light
const MAX_LOOP = 3.2 // seconds; a longer common period is cut to this
const MAX_INTRO = 2

// Each terminal state, with the states drawn before it so looks that remember (the flap board) riffle from
// the word that usually comes before
const STATES = {
  requesting: [{ mode: 'requesting' }],
  thinking: [{ mode: 'requesting' }, { mode: 'thinking' }],
  tool: [{ mode: 'thinking' }, { mode: 'tool-use', running: true }],
  ok: [{ mode: 'tool-use', running: true }, { mode: 'tool-use', result: 1 }],
  error: [{ mode: 'tool-use', running: true }, { mode: 'tool-use', result: 'error' }],
  responding: [{ mode: 'tool-use', result: 1 }, { mode: 'responding' }],
}

// The least common multiple of the loop durations, on a 50ms grid, capped
function period(durs) {
  if (!durs.length) return 0
  const ticks = durs.map(d => Math.max(1, Math.round(d * 20)))
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  let l = ticks[0]
  for (const t of ticks.slice(1)) { l = (l * t) / gcd(l, t); if (l / 20 > MAX_LOOP) return MAX_LOOP }
  return Math.min(MAX_LOOP, l / 20)
}

const { evaluate, shot, close } = await open('art/capture.html')
try {
  const names = await evaluate(`import('../themes/index.js').then(m => m.NAMES)`)
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const manifest = {}
  for (const name of names) {
    manifest[name] = { states: {} }
    mkdirSync(join(OUT, name), { recursive: true })
    for (const [state, snapshots] of Object.entries(STATES)) {
      const snaps = snapshots.map(s => ({ elapsed: 75, ...s }))
      const info = await evaluate(`window.place(${JSON.stringify(name)}, ${JSON.stringify(snaps)}, ${SCALE}, ${JSON.stringify(INK)})`)
      manifest[name].cssWidth = info.cssWidth
      const intro = Math.min(MAX_INTRO, Math.ceil(info.intro * FPS) / FPS)
      const loop = period(info.loops)
      const times = []
      for (let t = 0; t < intro - 1e-9; t += 1 / FPS) times.push(t)
      const introFrames = times.length
      if (loop) for (let t = 0; t < loop - 1e-9; t += 1 / FPS) times.push(intro + t)
      else times.push(intro)
      for (const [i, t] of times.entries()) {
        await evaluate(`window.seek(${t})`)
        writeFileSync(join(OUT, name, `${state}-${String(i).padStart(3, '0')}.png`), await shot({ x: 0, y: 0, width: info.width, height: info.height }))
      }
      manifest[name].states[state] = { intro: introFrames, frames: times.length }
      console.log(`${name} ${state}: ${introFrames} intro + ${times.length - introFrames} loop frames`)
    }
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ fps: FPS, scale: SCALE, themes: manifest }, null, 1))
} finally {
  close()
}
