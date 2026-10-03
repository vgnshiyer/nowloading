// Campfire: original one-bit art, approved from the browser studies.
// State-only markup lets the animation continue while the elapsed time updates.
import { svg, bitmap } from './kit.js'

const phase = s => s.mode === 'tool-use'
  ? s.result === 'error' ? 'error' : typeof s.result === 'number' ? 'success' : 'running'
  : s.mode
const anim = (name, values, duration, once = false, extra = '') => `<animate attributeName="${name}" values="${values}" dur="${duration}s" ${once ? 'fill="freeze"' : 'repeatCount="indefinite"'} ${extra}/>`
const px = (rows, x, y, opacity = 1) => `<path d="${bitmap(rows, x, y, 1)}" fill="currentColor" opacity="${opacity}"/>`

// Each frame owns its visibility, so one-shots freeze on an intentional final drawing.
function frames(drawings, duration, loop = true) {
  const n = drawings.length
  const keys = Array.from({ length: n + 1 }, (_, i) => +(i / n).toFixed(5)).join(';')
  return drawings.map((drawing, frame) => {
    const values = Array.from({ length: n + 1 }, (_, i) => (i === n ? loop ? 0 : n - 1 : i) === frame ? 1 : 0).join(';')
    return `<g opacity="${frame === (loop ? 0 : n - 1) ? 1 : 0}">${anim('opacity', values, duration, !loop, `keyTimes="${keys}" calcMode="discrete"`)}${drawing}</g>`
  }).join('')
}

// A one-bit flame with an empty, shifting heart. All pixels stay on their integer grid.
const FLAMES = [
  ['000010000','000110000','000111000','001101000','001101100','011001100','011001110','111000110','011101110','001111100'],
  ['000001000','000011000','000011000','000111000','001101100','001101100','011001110','111001110','011101100','001111100'],
  ['000100000','000110000','000111000','001111000','001101100','011001100','011001110','111001110','011101110','001111100'],
  ['000000000','000010000','000110000','001111000','001101000','011001100','011001110','111000110','011101110','001111100'],
]
const flame = i => px(FLAMES[i], 7, 4)
const lowFlame = px(['00100','00110','01110','11011','01110'], 9, 9)
const logs = '<path d="M4 15h3v1h3v1h4v1h3v1h-3v-1h-4v-1H7v-1H4ZM17 15h3v1h-3v1h-4v1h-3v1H7v-1h3v-1h3v-1h4Z" fill="currentColor" opacity="0.7"/>'
const coals = '<path d="M8 14h2v1H8ZM12 14h2v1h-2ZM15 15h1v1h-1Z" fill="currentColor" opacity="0.6"/>'
const smoke = px(['0100','1000','1100','0110','0010','0011'], 10, 7, 0.35)

function campfire(s) {
  const mode = phase(s)
  let fire
  if (mode === 'done') fire = coals
  else if (mode === 'requesting') fire = frames([coals, lowFlame, lowFlame, coals], 1.6)
  else if (mode === 'error') {
    fire = frames([flame(0), lowFlame, coals, coals + smoke], 0.8, false)
  } else if (mode === 'success') {
    // One bright spark rises out of the flame; the fire then holds its shape.
    fire = flame(1) + `<rect x="12" y="2" width="1" height="1" fill="currentColor" opacity="0">${anim('x', '12;14;13', 0.8, true)}${anim('y', '8;4;1', 0.8, true)}${anim('opacity', '1;1;0', 0.8, true, 'keyTimes="0;0.7;1"')}</rect>`
  } else {
    const period = { thinking: 1.6, running: 0.8, responding: 1.2 }[mode] ?? 1.6
    fire = frames(FLAMES.map((_, i) => flame(i)), period) +
      `<rect x="10" y="2" width="1" height="1" fill="currentColor" opacity="0">${anim('x', '10;9;11', period)}${anim('y', '7;3;1', period)}${anim('opacity', '0;0.7;0', period)}</rect>`
  }
  return svg(24, `<g shape-rendering="crispEdges">${logs}${fire}</g>`)
}

export default {
  key: 'campfire',
  title: 'Campfire',
  blurb: 'A small pixel fire flickers over crossed logs. Success sends up a spark; failure leaves smoke and coals.',
  looks: [{
    name: 'campfire',
    label: 'Campfire',
    note: 'gentle flames while thinking, a rising spark on success, smoke after a failed tool',
    art: campfire,
  }],
}
