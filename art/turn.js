// The scripted turn the demo and the contact sheets play: plain data, the shape the mod builds from real events.
const SCRIPT = [
  { mode: 'requesting', text: 'Working' },
  { mode: 'thinking', text: 'Thinking' },
  { mode: 'tool-use', text: 'Reading src/refund.ts', running: true },
  { mode: 'tool-use', text: 'Reading src/refund.ts', result: 3, file: 'src/refund.ts' },
  { mode: 'tool-use', text: 'Running npm test', running: true },
  { mode: 'tool-use', text: 'Running npm test', result: 'error' },
  { mode: 'thinking', text: 'Thinking' },
  { mode: 'tool-use', text: 'Editing src/refund.ts', running: true },
  { mode: 'tool-use', text: 'Editing src/refund.ts', result: 1, file: 'src/refund.ts' },
  { mode: 'tool-use', text: 'Running npm test', running: true },
  { mode: 'tool-use', text: 'Running npm test', result: 2 },
  { mode: 'responding', text: 'Writing the answer' },
  { mode: 'done', text: 'Done' },
]
const STEP_MS = 2800

// What every theme draws from: plain data, like the mod's snapshot
function snapshot(step, elapsed) {
  const s = SCRIPT[step]
  const cells = [], files = new Set()
  for (let i = 0; i <= step; i++) {
    const e = SCRIPT[i]
    if (e.result !== undefined) cells.push(e.result === 'error' ? 'mine' : e.result)
    if (e.file && i <= step) files.add(e.file)
  }
  const face = s.mode === 'done' ? 'cool' : s.running ? 'gasp' : s.result === 'error' ? 'dead' : 'smile'
  return { ...s, cells, files: files.size, face, elapsed, step }
}

export { SCRIPT, STEP_MS, snapshot }
