// Frame by Frame: original monochrome art, approved 2026-10-02.
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
const shake = `<animateTransform attributeName="transform" type="translate" values="0 0;0.7 0;-0.7 0;0.7 0;0 0" dur="0.4s" fill="freeze"/>`

function filmCells(p) {
  let cells = ''
  // A complete identical cell repeats every 14px, including its sprocket holes.
  // Spare cells on both sides cover the gate for the full 0 -> -14px advance.
  for (let i = -1; i < 5; i++) {
    const x = i * 14 + 2
    const terminalCenter = i === 1 && ['success', 'error', 'done'].includes(p)
    cells += `<g transform="translate(${x} 0)"><g fill="currentColor">` +
      '<rect x="0" y="2" width="3" height="2" rx="0.3"/><rect x="6" y="2" width="3" height="2" rx="0.3"/>' +
      '<rect x="0" y="16" width="3" height="2" rx="0.3"/><rect x="6" y="16" width="3" height="2" rx="0.3"/></g>' +
      line('<rect x="-0.3" y="5.5" width="11" height="9" rx="0.5" opacity="0.6"/>' +
        (terminalCenter ? p === 'error' ? '<path d="m2 8 6 4m0-4-6 4" stroke-width="1.5"/>'
          : p === 'success' ? '<path d="m1.5 10 2.6 2.4 4.4-4.9" stroke-width="1.5"/>'
            : '<path d="M3 8.2h4v3.6H3z" fill="currentColor"/>'
          : '<path d="m1 12 3-3 2 2 2-2 2 3" opacity="0.65"/><circle cx="7.8" cy="7.8" r="0.65" fill="currentColor" stroke="none"/>')) + '</g>'
  }
  return cells
}

function filmstrip(s) {
  const p = phase(s)
  const duration = { requesting: 2.4, thinking: 3.2, running: 1.1, responding: 1.8 }[p]
  // Advance the actual image cells and sprocket holes together by one frame pitch.
  const transport = !duration ? '' : p === 'thinking'
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;-14 0;-14 0" keyTimes="0;0.66;0.8;1" dur="${duration}s" repeatCount="indefinite"/>`
    : move('0 0;-14 0', duration)
  return svg(46, '<defs><clipPath id="filmstrip-gate"><rect x="0.5" y="1.5" width="45" height="17" rx="1"/></clipPath></defs>' +
    line('<rect x="0.5" y="1" width="45" height="18" rx="1" opacity="0.55"/>') +
    `<g clip-path="url(#filmstrip-gate)"><g>${p === 'error' ? shake : transport}${filmCells(p)}</g></g>`)
}

export default {
  key: "filmstrip",
  title: "Frame by Frame",
  blurb: "Tiny film frames and sprocket holes travel through a projector gate. The film holds a frame while thinking and stops on each result.",
  looks: [{
    name: "filmstrip",
    label: "Frame by Frame",
    note: "film frames and sprocket holes advance together through the gate",
    art: filmstrip,
  }],
}
