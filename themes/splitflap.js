// Now Departing: the split-flap board of a 1970s station hall. Every letter is cut at the seam between its two flaps.
// A turn is a flight. The board riffles only when the word changes, then holds still; only BOARDING flashes, as on a real board.
import { svg, bitmap } from './kit.js'

// A 5x8 flap font: four rows above the seam and four below, so the seam never deletes a crossbar
const FONT = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  A: ['01110', '10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '10000', '11111'],
  3: ['11111', '00010', '00100', '01110', '00001', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '10001', '01110'],
  7: ['11111', '00001', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '10001', '01111', '00001', '00010', '01100'],
}
const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ', DIGITS = '0123456789', TENS = '012345'

// Whole pixels everywhere, so the board stays crisp at 1x. The glyph sits on the text baseline.
const GY = 6                  // glyph rows 6-9 above the seam
const SEAM = GY + 4           // the seam: one empty pixel row at y=10
const TOP = GY - 2, FLAP = 6  // upper flap y 4-10, lower flap y 11-17
const CELLS = 8

// The fold, in discrete frames (scaled pixel art would blur): the upper flap falls, then lands on the lower half
const FRAME = 0.05, STAGGER = 0.03, LEAD = 0.05   // seconds: one half-fold, the left-to-right cascade, the pause before it
// Every animation starts at load and plays once: discrete keyTimes, then it holds its last value.
// The resting attributes are the final board, so anything that ignores SMIL still shows the right word.
const ms = t => `${Math.round(t * 1000)}ms`
function once(values, times, tag = 'animate attributeName="opacity"') {
  const dur = times[times.length - 1] + 0.02
  return `<${tag} values="${values.join(';')}" keyTimes="${times.map(t => +(t / dur).toFixed(4)).join(';')}" calcMode="discrete" dur="${ms(dur)}" fill="freeze"/>`
}
const shown = (t0, t1) => once([0, 1, 0], [0, t0, t1])
const shownUntil = t => once([1, 0], [0, t])
const hiddenUntil = t => once([0, 1], [0, t])

const half = (ch, lower) => lower ? FONT[ch].slice(4) : FONT[ch].slice(0, 4)
const or = (a, b) => [...a].map((c, i) => c === '1' || b[i] === '1' ? '1' : '0').join('')
const squash = rows => [or(rows[0], rows[1]), or(rows[2], rows[3])]
const gx = (ch, x, cw) => x + Math.floor((cw - FONT[ch][0].length) / 2)
const glyph = (ch, x, cw) => bitmap(half(ch, 0), gx(ch, x, cw), GY, 1) + bitmap(half(ch, 1), gx(ch, x, cw), SEAM + 1, 1)

// The letters a flap passes on its way, in the order they hang on the drum: at most three
function riffle(from, to, order) {
  if (from === to) return [to]
  const a = order.indexOf(from), b = order.indexOf(to), n = order.length
  const steps = Math.min(3, (b - a + n) % n - 1), seq = [from]
  for (let k = steps; k >= 1; k--) seq.push(order[(b - k + n) % n])
  return [...seq, to]
}

// A row of flap cells, each riffling from its previous character. Returns the markup and when the last flap lands.
// order is the drum every cell hangs on, or one drum per cell.
function cells(chars, prev, o, order, stagger = STAGGER) {
  let body = '', end = 0
  ;[...chars].forEach((ch, i) => {
    const x = i * o.pitch, seq = riffle(prev[i] ?? ch, ch, typeof order === 'string' ? order : order[i])
    if (seq.length === 1) { body += `<path d="${glyph(ch, x, o.cw)}" fill="${o.ink}"/>`; return }
    const start = LEAD + i * stagger
    body += `<path d="${glyph(seq[0], x, o.cw)}" fill="${o.ink}" opacity="0">${shownUntil(start)}</path>`
    for (let k = 0; k + 1 < seq.length; k++) {
      const from = seq[k], to = seq[k + 1], t = start + k * 2 * FRAME
      // the upper flap falls: the next letter's top shows behind it, the old top squashed onto the seam
      const falling = bitmap([half(to, 0)[0]], gx(to, x, o.cw), GY, 1) + bitmap(squash(half(from, 0)), gx(from, x, o.cw), SEAM - 2, 1) +
        bitmap(half(from, 1), gx(from, x, o.cw), SEAM + 1, 1)
      // it lands: the new bottom unfolds from the seam over the old one
      const landing = bitmap(half(to, 0), gx(to, x, o.cw), GY, 1) + bitmap(squash(half(to, 1)), gx(to, x, o.cw), SEAM + 1, 1) +
        bitmap([half(from, 1)[3]], gx(from, x, o.cw), SEAM + 4, 1)
      body += `<g opacity="0">${shown(t, t + FRAME)}${o.shade(x, SEAM - 3, 3)}<path d="${falling}" fill="${o.ink}"/></g>`
      body += `<g opacity="0">${shown(t + FRAME, t + 2 * FRAME)}${o.shade(x, SEAM + 1, 3)}<path d="${landing}" fill="${o.ink}"/></g>`
    }
    const done = start + (seq.length - 1) * 2 * FRAME
    end = Math.max(end, done)
    body += `<path d="${glyph(ch, x, o.cw)}" fill="${o.ink}">${hiddenUntil(done)}</path>`
  })
  return { body, end }
}

// Flap outlines: square, whole pixels, so the 1px gaps between them stay crisp at 1x
const flaps = (xs, w, lower) => xs.map(x => `M${x} ${lower ? SEAM + 1 : TOP}h${w}v${FLAP}h${-w}z`).join('')

// A turn is a flight
function word(s) {
  if (s.mode === 'requesting') return 'CHECK IN'
  if (s.mode === 'thinking') return 'BOARDING'
  if (s.mode === 'responding') return 'LANDING'
  if (s.mode === 'done') return 'ARRIVED'
  // the whole tool phase is one leg of the flight; only a failure changes the board
  return s.result === 'error' ? 'DELAYED' : 'EN ROUTE'
}

// The board only moves when its word changes. The same word returns the same markup, so a redraw never replays the riffle.
// o: { cw cell width, pitch, inset, ink, shade(x, y, h) under a moving flap, back(width, cellXs) behind the cells }
function board(o) {
  let last = null
  return s => {
    const w = word(s).padEnd(CELLS, ' ')
    if (last && last.word === w) return last.markup
    const prev = !last || (s.mode === 'requesting' && last.word !== w) ? ' '.repeat(CELLS) : last.word
    const { body, end } = cells(w, prev, o, LETTERS)
    // a delay lands with one hard clack: the row drops a pixel and settles
    const clack = s.result === 'error' && end
      ? once(['0 0', '0 1', '0 0'], [0, end, end + 0.08], 'animateTransform attributeName="transform" type="translate"') : ''
    // once BOARDING lands it flashes in place, like the status column of a real board; the fold itself never blinks.
    // Chrome holds a discrete value from its keyTime to the next, so the dim value needs a keyTime before 1.
    const flash = s.mode === 'thinking'
      ? `<animate attributeName="opacity" values="1;0.35" keyTimes="0;0.6" calcMode="discrete" dur="1.4s" begin="${ms(end)}" repeatCount="indefinite"/>` : ''
    const width = (CELLS - 1) * o.pitch + o.cw + 2 * o.inset
    const xs = Array.from({ length: CELLS }, (_, i) => o.inset + i * o.pitch)
    last = { word: w, markup: svg(width, `<g>${clack}${o.back(width, xs)}<g transform="translate(${o.inset} 0)">${flash}${body}</g></g>`) }
    return last.markup
  }
}

// Elapsed time as the board's time column: MM:SS, or H:MM:SS past an hour, in your text color beside the board.
// The seconds flap folds once a second; tens of minutes and seconds hang on a 0-5 drum, so 59 folds straight to 00.
const two = n => String(n).padStart(2, '0')
const clock = sec => { const t = Math.max(0, Math.floor(+sec || 0)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60
  return h ? `${h}:${two(m)}:${two(t % 60)}` : `${two(m)}:${two(t % 60)}` }
function flapClock(o) {
  let last = null
  return s => {
    const text = clock(s.elapsed)
    if (last && last.text === text) return last.markup
    const before = clock(Math.floor(+s.elapsed || 0) - 1), prev = before.length === text.length && s.elapsed >= 1 ? before : text
    const groups = text.split(':')
    let x = 0, at = 0, body = '', colons = ''
    groups.forEach((g, gi) => {
      if (gi) { colons += `M${x + 1} ${GY + 2}h1v1h-1zM${x + 1} ${SEAM + 2}h1v1h-1z`; x += 3; at += 1 }
      const hours = groups.length === 3 && gi === 0
      const drums = [...g].map((_, i) => !hours && i === 0 && g.length === 2 ? TENS : DIGITS)
      body += `<g transform="translate(${x} 0)">${cells(g, prev.slice(at, at + g.length), o, drums, 0).body}</g>`
      x += (g.length - 1) * o.pitch + o.cw
      at += g.length
    })
    last = { text, markup: svg(x, `<path d="${colons}" fill="${o.ink}"/>` + body) }
    return last.markup
  }
}

// The looks differ only in what the flaps are made of
const PLATFORM = { cw: 7, pitch: 8, inset: 0, ink: 'currentColor',
  shade: (x, y, h) => `<rect x="${x}" y="${y}" width="7" height="${h}" fill="currentColor" opacity="0.16"/>`,
  // Two tones, like the night board: the upper flap catches a little more light, so the split reads at rest
  back: (width, xs) => `<path d="${flaps(xs, 7, 0)}" fill="currentColor" opacity="0.2"/><path d="${flaps(xs, 7, 1)}" fill="currentColor" opacity="0.15"/>` }

// The one look with its own colors: the board at night, a small dark object like the approved little screen
const NIGHT = { upper: '#171717', lower: '#202020', gap: '#060606', ink: '#ecebe5', moving: '#0e0e0e' }
const ARRIVALS = { cw: 7, pitch: 8, inset: 1, ink: NIGHT.ink,
  shade: (x, y, h) => `<rect x="${x}" y="${y}" width="7" height="${h}" fill="${NIGHT.moving}"/>`,
  back: (width, xs) => `<rect x="0" y="${TOP - 1}" width="${width}" height="${2 * FLAP + 3}" rx="2" fill="${NIGHT.gap}"/>` +
    `<path d="${flaps(xs, 7, 0)}" fill="${NIGHT.upper}"/><path d="${flaps(xs, 7, 1)}" fill="${NIGHT.lower}"/>` }
// Both looks share this clock: plain flap digits in your text color (beside the night board, the line still has one dark object)
const CLOCK = { cw: 5, pitch: 6, ink: 'currentColor',
  shade: (x, y, h) => `<rect x="${x}" y="${y}" width="5" height="${h}" fill="currentColor" opacity="0.12"/>` }

const LOOKS = [
  { name: 'platform', label: 'Classic', note: 'split letters on faint flap tiles, with a flap clock', art: board(PLATFORM), tail: flapClock(CLOCK) },
  { name: 'arrivals', label: 'Night', note: 'the board after dark, with a flap clock', art: board(ARRIVALS), tail: flapClock(CLOCK) },
]

export default {
  key: 'splitflap',
  title: 'Now Departing',
  blurb: 'A turn is a flight: check-in, boarding, en route, landing, arrived, and delayed when a tool fails. The board riffles only when the word changes.',
  looks: LOOKS,
}
