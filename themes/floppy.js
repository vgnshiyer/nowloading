// Floppy Drive: original monochrome art, approved 2026-10-02.
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

function floppy(s) {
  const p = phase(s), idle = p === 'done' || p === 'success' || p === 'error'
  const shutter = p === 'thinking' ? move('0 0;1.5 0;0 0;0 0', 2.8)
    : idle ? '' : move('0 0;1.5 0;1.5 0;0 0;0 0', p === 'running' ? 1.2 : 2.4)
  const label = p === 'success' ? '<path d="M5.8 13.5l2.7 2.6 4.5-5"/>'
    : p === 'error' ? '<path d="m6.3 11.5 6 5m0-5-6 5"/>'
      : '<path d="M5.8 12.5h7.2m-7.2 2.6h4.8" opacity="0.6"/>'
  const disk = line('<path d="M1.5 1.5H14l3.5 3.5v13.5h-16z"/>' +
    `<g>${shutter}<path d="M4 1.5V7h8V1.5M9.5 3v2.5"/></g>` +
    '<path d="M4 18.5v-9h11v9" opacity="0.65"/>' + label)
  const lamp = p === 'error' ? line('<path d="m46.5 12.5 4 4m0-4-4 4"/>')
    : `<circle cx="48.5" cy="14.5" r="1.25" fill="currentColor" opacity="${p === 'done' ? 0.22 : 1}">${idle ? '' : pulse('1;0.2;1', p === 'thinking' ? 2.8 : 1.2)}</circle>`
  const bits = idle ? '' : [0, 1, 2].map(i => {
    const order = p === 'responding' ? 2 - i : i
    const values = [0.14, 0.14, 0.14, 0.14]
    values[order] = 1
    values[3] = values[0]
    return `<circle cx="${20.5 + i * 2.6}" cy="9.5" r="0.8" fill="currentColor" opacity="0.14">${pulse(values.join(';'), p === 'thinking' ? 2.8 : 1.2)}</circle>`
  }).join('')
  return svg(54, `<g>${p === 'error' ? shake : ''}${disk}</g>` + bits +
    line('<rect x="28.5" y="5.5" width="24" height="12.5" rx="1.4"/><path d="M31.5 9h18m-18 2h18" opacity="0.7"/><path d="M32 14.5h6" opacity="0.45"/>') + lamp)
}

export default {
  key: "floppy",
  title: "Floppy Drive",
  blurb: "A floppy shutter seeks while data hops across to the drive. Completed jobs mark the disk with a check; failures leave an X.",
  looks: [{
    name: "floppy",
    label: "Floppy Drive",
    note: "a seeking shutter, directional data dots, and a drive activity light",
    art: floppy,
  }],
}
