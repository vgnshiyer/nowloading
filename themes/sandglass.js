// Please Wait: the one-bit hourglass wait cursor of late-80s and early-90s desktops, drawn on its own pixel grid.
// Every pixel is a 1px square at an integer position, in currentColor; all motion is discrete frames.
import { svg } from './kit.js'

const grid = rows => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === '1' ? [[x, y]] : [])))
// pixels -> path data, merged into horizontal runs
function ink(pixels, ox = 0, oy = 0) {
  const rows = new Map()
  for (const [x, y] of pixels) rows.set(y, [...(rows.get(y) || []), x])
  let d = ''
  for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b)
    let start = xs[0]
    for (let i = 1; i <= xs.length; i++) {
      if (xs[i] === xs[i - 1] + 1) continue
      const n = xs[i - 1] - start + 1
      d += `M${ox + start} ${oy + y}h${n}v1h${-n}z`
      start = xs[i]
    }
  }
  return d
}
const pix = (pixels, ox, oy, op = 1) => pixels.length ? `<path d="${ink(pixels, ox, oy)}" fill="currentColor"${op < 1 ? ` opacity="${op}"` : ''}/>` : ''
const t4 = n => +n.toFixed(4)

// Show content only during spans [[t0, t1], ...] of a T-second timeline, as a discrete opacity animation.
// Loops rest on their first frame and one-shots on their last, so a still rasterizer draws a sensible frame.
function show(content, spans, T, loop = true) {
  if (!content) return ''
  const at = new Map([[0, 0]])
  for (const [a, b] of spans) { at.set(t4(a), 1); if (b < T - 1e-6) at.set(t4(b), 0) }
  const vals = [], keys = []
  for (const k of [...at.keys()].sort((a, b) => a - b)) {
    if (vals.length && vals[vals.length - 1] === at.get(k)) continue
    vals.push(at.get(k)); keys.push(k)
  }
  if (vals.length === 1) return vals[0] ? content : ''
  const rest = loop ? vals[0] : vals[vals.length - 1]
  return `<g opacity="${rest}"><animate attributeName="opacity" values="${vals.join(';')}" keyTimes="${keys.map(k => t4(k / T)).join(';')}" dur="${t4(T)}s" calcMode="discrete" ${loop ? 'repeatCount="indefinite"' : 'fill="freeze"'}/>${content}</g>`
}
// A sequence of frames, each [content, seconds]
function frames(list, loop = true) {
  const T = list.reduce((a, [, d]) => a + d, 0)
  let t = 0, out = ''
  for (const [content, d] of list) { out += show(content, [[t, t + d]], T, loop); t += d }
  return out
}
// The 1px shake of a stuck cursor: three times right and left, about 70ms a step, then rest
const SHAKE_S = 0.5
const SHAKE = `<animateTransform attributeName="transform" type="translate" values="1 0;-1 0;1 0;-1 0;1 0;-1 0;0 0" dur="${SHAKE_S}s" calcMode="discrete" fill="freeze"/>`
const crisp = body => `<g shape-rendering="crispEdges">${body}</g>`

// ---- sandglass: an 11x15 one-bit hourglass ----
const GLASS_ROWS = [
  '11111111111',
  '01111111110',
  '01000000010',
  '01000000010',
  '00100000100',
  '00010001000',
  '00001010000',
  '00001010000',
  '00001010000',
  '00010001000',
  '00100000100',
  '01000000010',
  '01000000010',
  '01111111110',
  '11111111111',
]
const GW = 11, GH = 15, GLASS = grid(GLASS_ROWS)
// Sand leaves the top centre first, a symmetric pair at a time, and piles up on the floor as a mound
const TOP = [[[5, 3]], [[4, 3], [6, 3]], [[3, 3], [7, 3]], [[2, 3], [8, 3]], [[5, 4]], [[4, 4], [6, 4]], [[3, 4], [7, 4]], [[5, 5]], [[4, 5], [6, 5]]]
const BOTTOM = [[[5, 12]], [[4, 12], [6, 12]], [[5, 11]], [[3, 12], [7, 12]], [[4, 11], [6, 11]], [[5, 10]], [[2, 12], [8, 12]], [[3, 11], [7, 11]], [[4, 10], [6, 10]]]
const FULL_TOP = TOP.flat(), FULL_BOTTOM = BOTTOM.flat()
const NECK = 5, FALL = [6, 7, 8, 9, 10, 11, 12] // the grain's column and rows, neck to floor
const SAND_W = 15, UX = 2, UY = 2 // upright glass in a 15px slot; the turned glass is 15x11
const SX = 0, SY = UY + (GH - GW) / 2
const GLASS_OP = 0.8
const turn = ([x, y]) => [GH - 1 - y, x] // 90 deg clockwise
const upright = sand => pix(GLASS, UX, UY, GLASS_OP) + pix(sand, UX, UY)
const sideways = sand => pix(GLASS.map(turn), SX, SY, GLASS_OP) + pix(sand.map(turn), SX, SY)
const FLIP = 0.09

// Knocked over: the glass lies on its side on the same floor as the upright one, and the sand it held
// mid-run (8 grains above, 7 below) has slumped flat against the lower wall of each bulb. In the 15x11 turned frame.
const FALLEN_Y = UY + GH - GW
const SLUMPED = [[11, 8], [12, 8], [10, 7], [11, 7], [12, 7], [10, 6], [11, 6], [12, 6],
  [2, 8], [3, 8], [2, 7], [3, 7], [4, 7], [2, 6], [3, 6]]
const fallen = pix(GLASS.map(turn), SX, FALLEN_Y, GLASS_OP) + pix(SLUMPED, SX, FALLEN_Y)

// One grain falling the length of the neck, 1px per step; the floor heap covers it where it lands
function grain(step, period) {
  return FALL.map((r, i) => show(pix([[NECK, r]], UX, UY), [[i * step, (i + 1) * step]], period)).join('')
}
// A dotted stream, 1 on and 2 off, marching down 1px per step
function stream(step) {
  let out = ''
  for (let k = 0; k < 3; k++) out += show(pix(FALL.filter(r => (r - FALL[0]) % 3 === k).map(r => [NECK, r]), UX, UY), [[k * step, (k + 1) * step]], 3 * step)
  return out
}
// The glass drains one step every `each` seconds while `falling` runs (a loop of `period` seconds),
// rests with all the sand below, then turns over; the cycle is a whole number of periods so it loops seamlessly
function drain(each, falling, period) {
  const run = TOP.length * each, T = +(Math.ceil((run + 0.25 + FLIP) / period - 1e-9) * period).toFixed(4)
  let out = show(pix(GLASS, UX, UY, GLASS_OP), [[0, T - FLIP]], T)
  TOP.forEach((p, i) => { out += show(pix(p, UX, UY), [[0, (i + 1) * each]], T) })
  BOTTOM.forEach((p, i) => { out += show(pix(p, UX, UY), [[(i + 1) * each, T - FLIP]], T) })
  out += show(falling, [[0, run]], T)
  out += show(sideways(FULL_BOTTOM), [[T - FLIP, T]], T)
  return out
}

function sandglass(s) {
  let body
  if (s.mode === 'requesting') {
    // The wait cursor turning over and over: a 90 deg frame, then a rest with the sand where it fell
    body = frames([[upright(FULL_TOP), 1], [sideways(FULL_TOP), 0.17], [upright(FULL_BOTTOM), 1], [sideways(FULL_BOTTOM), 0.17]])
  } else if (s.mode === 'thinking') {
    body = drain(5, grain(0.08, 1), 1)
  } else if (s.mode === 'responding') {
    body = drain(1.5, stream(0.12), 0.36)
  } else if (s.mode === 'done') {
    body = upright(FULL_BOTTOM)
  } else if (s.result === 'error') {
    // Jammed: the sand stops with one grain caught at the mouth of the neck, the glass rattles, then tips over and stays down
    const jammed = `<g>${SHAKE}${upright([...TOP.slice(4).flat(), ...BOTTOM.slice(0, 4).flat(), [NECK, 9]])}</g>`
    body = frames([[jammed, SHAKE_S], [fallen, FLIP]], false)
  } else if (s.result !== undefined) {
    // The job is done: the glass turns over, sand back on top for the next one
    body = frames([[upright(FULL_BOTTOM), FLIP], [sideways(FULL_BOTTOM), FLIP], [upright(FULL_TOP), FLIP]], false)
  } else {
    // A tool is running: a fast dotted pour, but a slow enough drain that most tools end before the glass needs turning
    body = drain(1, stream(0.06), 0.18)
  }
  return svg(SAND_W, crisp(body))
}

const LOOKS = [
  { name: 'sandglass', label: 'Hourglass', note: 'the sand runs while it works; the glass turns over when a tool succeeds and tips over when one fails', art: sandglass },
]

export default {
  key: 'sandglass',
  title: 'Please Wait',
  blurb: 'The one-bit wait cursor, on its own pixel grid. Sand trickles while it thinks, pours through tools, and the glass turns over when a job is done.',
  looks: LOOKS,
}
