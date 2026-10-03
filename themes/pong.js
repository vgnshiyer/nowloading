// One More Rally: a miniature table-tennis court. Approved from the browser proposals.
// Geometry is shared by every state; SMIL owns time so redraws never restart a rally.
import { svg } from './kit.js'

const state = s => s.mode === 'tool-use'
  ? s.result === 'error' ? 'error' : typeof s.result === 'number' ? 'success' : 'running'
  : s.mode
const animate = (attribute, values, duration, once = false, extra = '') =>
  `<animate attributeName="${attribute}" values="${values}" dur="${duration}s" ${once ? 'fill="freeze"' : 'repeatCount="indefinite"'} ${extra}/>`
const court = '<path d="M1 2h34M1 18h34" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.4"/>' +
  '<path d="M18 3v2m0 2v2m0 2v2m0 2v2" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"/>'
const paddle = (x, y, motion = '') => `<rect x="${x}" y="${y}" width="2" height="5" rx="0.35" fill="currentColor">${motion}</rect>`
const ball = (x, y, motion = '') => `<rect x="${x}" y="${y}" width="2" height="2" fill="currentColor">${motion}</rect>`
const tick = '<path d="M15 10l2 2 4-5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'

function pong(s) {
  const phase = state(s)
  let action
  if (phase === 'done') {
    action = paddle(3, 7.5) + paddle(31, 7.5) + ball(17, 9)
  } else if (phase === 'requesting') {
    // The ball waits for a serve while both paddles stay still.
    action = paddle(3, 7.5) + paddle(31, 7.5) + ball(17, 9, animate('opacity', '1;0.2;1', 1.6))
  } else if (phase === 'error') {
    // A real miss: the right paddle stays low as the ball passes above it and exits.
    // The resting markup is the final frame, including an invisible departed ball.
    const travel = animate('x', '5;34;35', 0.7, true, 'keyTimes="0;0.88;1"') +
      animate('y', '12;4;4', 0.7, true, 'keyTimes="0;0.88;1"')
    action = paddle(3, 11) + paddle(31, 11) +
      `<g opacity="0">${animate('opacity', '1;1;0', 0.7, true, 'keyTimes="0;0.9;1"')}${ball(35, 4, travel)}</g>` +
      `<g opacity="1">${animate('opacity', '0;0;1', 0.8, true, 'keyTimes="0;0.875;1"')}<path d="M15 7l6 6m0-6l-6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></g>`
  } else if (phase === 'success') {
    // A clean return contacts the right paddle at 0.3s, then becomes a check.
    action = paddle(3, 7.5) + paddle(31, 7.5) +
      `<g opacity="0">${animate('opacity', '1;1;0', 0.6, true, 'keyTimes="0;0.833333;1"')}${ball(17, 9, animate('x', '17;29;17', 0.6, true))}</g>` +
      `<g opacity="1">${animate('opacity', '0;0;1', 0.7, true, 'keyTimes="0;0.857143;1"')}${tick}</g>`
  } else {
    // Full periods fit the 10fps terminal frame grid and stay below its 3.2s cap.
    const period = { thinking: 2.8, running: 1.4, responding: 2.1 }[phase] ?? 2.8
    // At t=0 and t=period the ball touches the left paddle at its centre;
    // at t=period/2 it touches the right. The lower bounce stays inside the rail.
    action = paddle(3, 3, animate('y', '3;11;3', period)) +
      paddle(31, 11, animate('y', '11;3;11', period)) +
      ball(5, 4.5, animate('x', '5;29;5', period) + animate('y', '4.5;15.5;4.5;15.5;4.5', period))
  }
  return svg(36, court + action)
}

export default {
  key: 'pong',
  title: 'One More Rally',
  blurb: 'Two paddles trade a ball while it works. A successful tool makes its return; a failed one misses the paddle and leaves the court.',
  looks: [
    { name: 'pong', label: 'Rally', note: 'a miniature court; clean return on success, a missed shot on failure', art: pong },
  ],
}
