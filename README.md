# nowloading

The line that animates while Claude Code works, redrawn as something from before.

It replaces the three little dots with a VCR's on-screen display, a split-flap departure board or a one-bit hourglass. Each one follows what Claude is actually doing: thinking, running a tool, a tool failing, writing the answer. It works in the desktop app's Code tab and in the terminal, where Ghostty and kitty show it as real pixels.

| Theme | |
| --- | --- |
| `rewind`: the VCR's on-screen word in your text color. Pause while it thinks, fast-forward through tools, play while it writes. On the desktop, the tape counter is the time. | ![rewind](docs/rewind.gif) |
| `channel3`: the same display on a tiny screen, with scanlines and a slow tracking roll. | ![channel3](docs/channel3.gif) |
| `cassette`: a tape whose reels turn at the speed of the transport. | ![cassette](docs/cassette.gif) |
| `platform`: a turn is a flight. CHECK IN, BOARDING, EN ROUTE, LANDING, and DELAYED when a tool fails. The board riffles only when its word changes. | ![platform](docs/platform.gif) |
| `arrivals`: the same board at night. On the desktop, both boards keep time on a flap clock. | ![arrivals](docs/arrivals.gif) |
| `sandglass`: the wait cursor of an older desktop. The sand runs while it works, the glass turns over when a tool succeeds and tips over when one fails. | ![sandglass](docs/sandglass.gif) |

## Install

In Claude Code:

```
/plugin marketplace add vgnshiyer/nowloading
/plugin install nowloading@vgnshiyer
```

Requires a Claude Code version with mods (function hooks). The `vgnshiyer` marketplace also lists [tps-report](https://github.com/vgnshiyer/tps-report).

## Use

- `/nowloading`: shows the current theme and lists the others.
- `/nowloading arrivals`: switches now, mid-turn included, and every session after uses it.
- `/nowloading random`: a different theme every turn.

The `theme` setting in `/config` picks one too. Whichever you set last wins.

## What it touches

Nothing but the drawing. Every hook passes straight through, so Claude's prompts, context and tool calls are untouched, and nothing waits on the animation. The step text stays, including a message another mod set, and so does the real elapsed time. If a theme ever fails to draw, Claude Code draws its own line instead.

- **Desktop:** the art is an SVG where the dots were, then the step text, then the time. `rewind`, `channel3`, `cassette`, `platform` and `arrivals` draw their own time: the tape counter or the flap clock.
- **Terminal:** in Ghostty and kitty, the art is a picture at the start of Claude Code's own line, which keeps its verb, time and tokens. Other terminals, and tmux, show the theme's word in its place.

## Add a theme

A theme is one look in a family file.

1. Write `themes/<family>.js`. Export `{ key, title, blurb, looks }`, where each look is `{ name, label, note, art(s) }` and optionally `tail(s)`.
   - `art(s)` returns an SVG string 20px tall and the same width in every state, animated with SMIL. Draw in `currentColor` so it follows light and dark.
   - `s` is `{ mode, result, running, elapsed }`. `mode` is `requesting`, `thinking`, `tool-use` or `responding`. `result` is a number after a tool succeeds and `'error'` after it fails.
   - `tail(s)` is optional and replaces the time on the desktop. It must show the real elapsed time.
   - `themes/vhs.js` is a complete example.
2. Add one import and one entry in `themes/index.js`, a fallback word in `hooks/state.ts`, and the theme's name to `userConfig.theme.options` in `.claude-plugin/plugin.json`.
3. Build the terminal frames: `node art/frames.mjs && python3 art/pack.py`.
4. Look at it: serve the repo (`python3 -m http.server`) and open `art/variations.html`. To see every state, light and dark, at 3x and real size, run `python3 art/render.py <family> /tmp/sheet`.
5. Record its GIF with `node art/gifs.mjs && python3 art/gif.py`, which writes `docs/<theme>.gif`, and add a row to the table above.
6. Run `claude plugin test .`, then open a pull request.

`art/` needs Node 22+, Python with Pillow, and Google Chrome. The scripts look for Chrome where macOS installs it; set `CHROME` to its path anywhere else.

## License

MIT. All art is original. The themes evoke generic old machines, not any product or brand.
