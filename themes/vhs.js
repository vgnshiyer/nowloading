// Be Kind, Rewind: the on-screen display of a late-80s VCR. Approved 2026-10-02.
import { f, svg, id, osdWidth, osd, tape } from './kit.js'

function transport(s) {
  if (s.mode === 'thinking') return '‖ PAUSE'
  if (s.mode === 'tool-use') return '» FF'
  if (s.mode === 'responding') return '▶ PLAY'
  return '■ STOP'
}
const OSD_P = 1.25
const OSD_W = osdWidth('‖ PAUSE') * OSD_P + 2
// The VCR tracking meter: bars that fill while the picture settles
function trackingMeter(x, y, p, fill) {
  let s = ''
  for (let i = 0; i < 6; i++) {
    const values = Array.from({ length: 8 }, (_, k) => (k > i ? 1 : 0.18)).join(';')
    s += `<rect x="${f(x + i * 3 * p)}" y="${f(y + p)}" width="${f(2 * p)}" height="${f(5 * p)}" fill="${fill}" opacity="0.18"><animate attributeName="opacity" values="${values}" dur="1.6s" calcMode="discrete" repeatCount="indefinite"/></rect>`
  }
  return s
}
function osdMotion(s) {
  if (s.mode === 'thinking') return `<animate attributeName="opacity" values="1;0.35" keyTimes="0;0.55" calcMode="discrete" dur="1.1s" repeatCount="indefinite"/>`
  if (s.mode === 'requesting') return `<animateTransform attributeName="transform" type="translate" values="0 0;0.5 0;-0.3 0;0 0;0 0" keyTimes="0;0.1;0.2;0.3;1" dur="1.3s" repeatCount="indefinite"/>`
  return ''
}
function glitch(s) {
  return s.result === 'error' ? `<animateTransform attributeName="transform" type="translate" values="0 0;1 0;-1 0;0.6 0;0 0" dur="0.14s" repeatCount="4"/>` : ''
}
// The little screen's clip and scanline ids, made once: the same state must give the same markup, or the
// desktop treats every redraw as a new picture and restarts its animation
const CRT = id('crt'), SCAN = id('scan')
const counterTail = s => {
  const text = tape(s.elapsed)
  return svg(osdWidth(text) * 1.2 + 1, `<path d="${osd(text, 0.5, 10 - 3.5 * 1.2, 1.2)}" fill="currentColor"/>`)
}

const LOOKS = [
  {
    name: 'rewind', label: 'Quiet', note: 'the OSD word, in your text color',
    art: s => svg(OSD_W, s.mode === 'requesting' ? trackingMeter(1, 10 - 3.5 * OSD_P, OSD_P, 'currentColor')
      : `<g>${glitch(s)}<path d="${osd(transport(s), 1, 10 - 3.5 * OSD_P, OSD_P)}" fill="currentColor">${osdMotion(s)}</path></g>`),
    tail: counterTail,
  },
  {
    name: 'channel3', label: 'Classic', note: 'the OSD on a little screen',
    art: s => {
      const w = OSD_W + 13, clip = CRT, lines = SCAN
      const d = s.mode === 'requesting' ? '' : osd(transport(s), 7, 10 - 3.5 * OSD_P, OSD_P)
      return svg(w,
        `<defs><clipPath id="${clip}"><rect x="0.5" y="1.5" width="${f(w - 1)}" height="17" rx="3"/></clipPath>` +
        `<pattern id="${lines}" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="1" fill="#000" opacity="0.32"/></pattern></defs>` +
        `<g clip-path="url(#${clip})"><rect x="0" y="0" width="${f(w)}" height="20" fill="#141414"/>` +
        (s.mode === 'requesting' ? trackingMeter(7, 10 - 3.5 * OSD_P, OSD_P, '#f3f3f0') :
        `<g>${glitch(s)}${osdMotion(s)}<path d="${d}" transform="translate(-0.6 0)" fill="#ff3b30" opacity="0.55"/><path d="${d}" transform="translate(0.6 0)" fill="#2fd6ff" opacity="0.45"/><path d="${d}" fill="#f3f3f0"/></g>`) +
        `<rect width="${f(w)}" height="20" fill="url(#${lines})"/>` +
        `<rect x="0" y="-4" width="${f(w)}" height="3" fill="#fff" opacity="0.14"><animate attributeName="y" values="-4;-4;22" keyTimes="0;0.8;1" dur="3.6s" repeatCount="indefinite"/></rect></g>`)
    },
    tail: counterTail,
  },
  {
    name: 'cassette', label: 'Tape', note: 'the reels turn with the transport',
    art: s => {
      const speed = { requesting: 3.2, thinking: 0, 'tool-use': 0.38, responding: 1.6, done: 0 }[s.mode]
      const progress = Math.min(1, s.elapsed / 1800)
      const reel = (cx, pack) => {
        const spin = speed ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} 12.2" to="360 ${cx} 12.2" dur="${speed}s" repeatCount="indefinite"/>` : ''
        let teeth = ''
        for (let k = 0; k < 3; k++) teeth += `<rect x="${f(cx - 0.4)}" y="10.5" width="0.8" height="1.1" fill="#1d1d1d" transform="rotate(${k * 120} ${cx} 12.2)"/>`
        return `<circle cx="${cx}" cy="12.2" r="${f(pack)}" fill="#4b3427"/><circle cx="${cx}" cy="12.2" r="2" fill="#ece9e2"/><g>${spin}${teeth}</g>`
      }
      return svg(34,
        `<rect x="0.5" y="1.5" width="33" height="17" rx="2.2" fill="#1c1c1c" stroke="#4d4d4d" stroke-width="0.5"/>` +
        `<rect x="3" y="3.2" width="28" height="3.1" rx="0.7" fill="#ece6d6"/><rect x="3" y="5" width="28" height="0.65" fill="#cf4636"/>` +
        `<rect x="7" y="8.1" width="20" height="8.2" rx="1.6" fill="#0d0d0d" stroke="#575757" stroke-width="0.5"/>` +
        reel(12.4, 3.5 - 1.3 * progress) + reel(21.6, 2.2 + 1.3 * progress))
    },
    tail: counterTail,
  },
]


export default {
  key: 'vhs',
  title: 'Be Kind, Rewind',
  blurb: 'Pause while thinking, fast-forward through tools, play while writing. The tape counter is the real time.',
  looks: LOOKS,
}
