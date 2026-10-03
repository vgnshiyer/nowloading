// Records each theme's turn line, light above dark, for the README.
//   node art/gifs.mjs     -> art/.gifs/<theme>/*.png, then: python3 art/gif.py  -> docs/<theme>.gif
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { open, ROOT } from './cdp.mjs'

const OUT = join(ROOT, 'art', '.gifs')
const FPS = 10

const { evaluate, shot, page, close } = await open('art/row.html')
try {
  const names = await evaluate(`import('../themes/index.js').then(m => m.NAMES)`)
  rmSync(OUT, { recursive: true, force: true })
  for (const name of names) {
    mkdirSync(join(OUT, name), { recursive: true })
    const { width, height, seconds } = await evaluate(`window.load(${JSON.stringify(name)})`)
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false })
    const count = Math.round(seconds * FPS)
    for (let i = 0; i < count; i++) {
      await evaluate(`window.frame(${i / FPS})`)
      writeFileSync(join(OUT, name, `${String(i).padStart(3, '0')}.png`), await shot({ x: 0, y: 0, width, height }))
    }
    console.log(`${name}: ${count} frames, ${width}x${height}`)
  }
} finally {
  close()
}
