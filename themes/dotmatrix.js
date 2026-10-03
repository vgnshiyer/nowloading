// Dot Matrix: original monochrome art, approved 2026-10-02.
// State-only SVG markup preserves the animation clock across desktop updates.
import { svg } from './kit.js'

function phase(s) {
  if (s.mode !== 'tool-use') return s.mode
  if (s.result === 'error') return 'error'
  if (typeof s.result === 'number') return 'success'
  return 'running'
}

const line = body => `<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`
const move = (values, duration) => `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${duration}s" repeatCount="indefinite"/>`
const pulse = (values, duration) => `<animate attributeName="opacity" values="${values}" dur="${duration}s" repeatCount="indefinite"/>`
const shake = `<animateTransform attributeName="transform" type="translate" values="0 0;0.7 0;-0.7 0;0.7 0;0 0" dur="0.4s" fill="freeze"/>`

// One common period per state fits the terminal's 10fps, 3.2s loop budget.
const DURATION = { requesting: 3.2, thinking: 3, running: 1.4, responding: 2 }

// Perforations and the dot rows are part of the moving paper, not a blinking facade.
function printerPaper(p) {
  const feed = p === 'thinking' ? 0 : DURATION[p]
  let marks = ''
  for (let y = -2; y < 16; y += 3) {
    marks += `<rect x="5.5" y="${y}" width="1.4" height="1.2" rx="0.3"/><rect x="38.1" y="${y}" width="1.4" height="1.2" rx="0.3"/>`
    if (p !== 'success' && p !== 'error') {
      for (let x = 11; x < 33; x += 2) {
        // The ink repeats at the same 3px pitch as the tractor holes. Translating
        // a complete row is visually identical to the start of the next loop.
        if (((x - 11) / 2) % 5 !== 2) marks += `<rect x="${x}" y="${y + 0.2}" width="1" height="0.9" opacity="0.6"/>`
      }
    }
  }
  // Feed only after the carriage returns; the spatial repetition hides the reset.
  const advance = feed ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -3" keyTimes="0;0.88;1" dur="${feed}s" repeatCount="indefinite"/>` : ''
  return `<g clip-path="url(#dotmatrix-paper)"><g fill="currentColor">${advance}${marks}</g></g>`
}

function dotmatrix(s) {
  const p = phase(s)
  const active = !['done', 'success', 'error'].includes(p)
  // Mechanical carriage: print left to right, return, then pause for the paper feed.
  const headMotion = !active ? '' : p === 'thinking' ? move('0 0;3 0;0 0;0 0', DURATION[p])
    : `<animateTransform attributeName="transform" type="translate" values="0 0;20 0;20 0;0 0;0 0" keyTimes="0;0.65;0.72;0.88;1" dur="${DURATION[p]}s" repeatCount="indefinite"/>`
  const sheet = p === 'error' ? '<path d="M4.5 11.5V1.5h35v10M10 8l6 2 6-2 6 2 6-2"/>'
    : '<path d="M4.5 11.5V1.5h35v10M9 1.5v10m26-10v10"/>'
  const result = p === 'success' ? line('<path d="m18 5.8 3 3 6-6" stroke-width="1.6"/>')
    : p === 'error' ? line('<path d="m19.5 2.8 6 4.7m0-4.7-6 4.7" stroke-width="1.5"/>') : ''
  return svg(45, '<defs><clipPath id="dotmatrix-paper"><rect x="5" y="2" width="34" height="8.5"/></clipPath></defs>' +
    `<g>${p === 'error' ? shake : ''}${line(sheet)}${printerPaper(p)}${result}</g>` +
    line('<path d="M4.5 10.5H2l-1 3v5h43v-5l-1-3h-3.5M1.5 14h42M7 17h5m21 0h5"/>') +
    `<g>${headMotion}<rect x="10" y="10" width="4.5" height="4" rx="0.6" fill="currentColor"/><path d="M12.2 9v2" stroke="currentColor" stroke-width="1.3"/></g>` +
    `<circle cx="40.5" cy="16.5" r="0.75" fill="currentColor" opacity="${p === 'done' ? 0.3 : 1}">${active ? pulse('1;0.35;1', DURATION[p]) : ''}</circle>`)
}

export default {
  key: "dotmatrix",
  title: "Dot Matrix",
  blurb: "The carriage crosses tractor paper as dotted lines feed upward. A completed job prints a check; a failed one jams the sheet.",
  looks: [{
    name: "dotmatrix",
    label: "Dot Matrix",
    note: "a scanning print head and paper that feeds between passes",
    art: dotmatrix,
  }],
}
