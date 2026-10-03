// Headless Chrome over the DevTools protocol, and a static server for the repo, for the art scripts.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript' }
export function serve() {
  const server = createServer((req, res) => {
    const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (!path.startsWith(ROOT) || !existsSync(path)) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(readFileSync(path))
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function browser() {
  const profile = mkdtempSync(join(tmpdir(), 'nl-frames-'))
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    'about:blank'], { stdio: 'ignore', detached: true })
  const portFile = join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 300 && !existsSync(portFile); i++) await new Promise(r => setTimeout(r, 100))
  const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n')
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let seq = 0
  const waiting = new Map()
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id)
      waiting.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq
    waiting.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }))
  })
  const close = () => { ws.close(); try { process.kill(-proc.pid, 'SIGKILL') } catch {} rmSync(profile, { recursive: true, force: true }) }
  return { send, close }
}


// Opens `path` (under the repo) in a transparent page and resolves helpers to drive it
export async function open(path) {
  const server = await serve()
  const { send, close } = await browser()
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => send(method, params, sessionId)
  await page('Page.enable')
  await page('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await page('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${path}` })
  const evaluate = async expression => (await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value
  for (let i = 0; i < 100 && !(await evaluate('window.ready === true')); i++) await new Promise(r => setTimeout(r, 100))
  const shot = async clip => Buffer.from((await page('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })).data, 'base64')
  return { evaluate, shot, page, close: () => { close(); server.close() } }
}
