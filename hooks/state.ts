// The plain data every theme draws from. Pure functions, no engine access: register.ts owns `$`.

export type Mode = 'requesting' | 'thinking' | 'tool-use' | 'responding' | 'done'
/** A finished tool call: a number when it succeeded, 'error' when it failed or was denied */
export type Result = number | 'error'

/** What the hooks have seen of the current turn */
export type Turn = {
  t0: number // when the turn started, ms since the epoch
  working: boolean
  running: number // main-loop tool calls in flight
  result: { value: Result; at: number } | null // the last finished call, and when
}

/** What a theme's art(s) reads */
export type Snapshot = { mode: Mode; result?: Result; running: boolean; elapsed: number }

/** The states a terminal theme has frames for */
export type FrameState = 'requesting' | 'thinking' | 'tool' | 'ok' | 'error' | 'responding'

/**
 * The turn as a theme sees it at `now`. A finished call keeps showing for `holdMs` (in the drawing only,
 * nothing waits), so a quick tool still turns the hourglass over or flips the board to DELAYED.
 */
export function snapshot(propsMode: string, turn: Turn, now: number, holdMs: number): Snapshot {
  const held = turn.result !== null && turn.running === 0 && now - turn.result.at < holdMs
  let mode: Mode = propsMode === 'tool-input' || propsMode === 'tool-use' ? 'tool-use'
    : propsMode === 'thinking' || propsMode === 'responding' || propsMode === 'requesting' ? propsMode : 'requesting'
  if (turn.running > 0 || held) mode = 'tool-use'
  return {
    mode,
    result: held ? turn.result!.value : undefined,
    running: turn.running > 0,
    elapsed: Math.max(0, (now - turn.t0) / 1000),
  }
}

/** The step text exactly as the engine would show it: the message when another mod set one, else the word */
export function words(props: { word: string; message: string | null; suffix?: string }): string {
  const text = props.message ?? props.word
  const suffix = props.suffix ?? '…'
  return suffix === '…' && /(…|\.\.\.)$/.test(text) ? text : text + suffix
}

export function frameState(s: Snapshot): FrameState {
  if (s.mode === 'tool-use') return s.result === 'error' ? 'error' : s.result !== undefined ? 'ok' : 'tool'
  if (s.mode === 'done') return 'responding'
  return s.mode
}

/** What a terminal that shows no pictures draws instead: the theme's own words, short enough for its box */
export function fallback(name: string, s: Snapshot): string {
  const state = frameState(s)
  if (name === 'rewind' || name === 'channel3' || name === 'cassette') {
    const vcr = { requesting: 'TRACK', thinking: 'PAUSE', tool: '» FF', ok: '» FF', error: '» FF', responding: '▶ PLAY' }
    return name === 'cassette' ? (state === 'thinking' ? '‖' : '▶') : vcr[state]
  }
  if (name === 'platform' || name === 'arrivals') {
    return { requesting: 'CHECK IN', thinking: 'BOARDING', tool: 'EN ROUTE', ok: 'EN ROUTE', error: 'DELAYED', responding: 'LANDING' }[state]
  }
  if (name === 'floppy') {
    return { requesting: 'LOAD', thinking: 'SEEK', tool: 'READ', ok: 'SAVED', error: 'ERROR', responding: 'WRITE' }[state]
  }
  if (name === 'dotmatrix') {
    return { requesting: 'FEED', thinking: 'WAIT', tool: 'PRINT', ok: 'OK', error: 'JAM', responding: 'WRITE' }[state]
  }
  if (name === 'pong') {
    return { requesting: 'SERVE', thinking: 'WAIT', tool: 'RALLY', ok: 'HIT', error: 'MISS', responding: 'PLAY' }[state]
  }
  if (name === 'filmstrip') {
    return { requesting: 'THREAD', thinking: 'HOLD', tool: 'ROLL', ok: 'CUT', error: 'JAM', responding: 'PLAY' }[state]
  }
  return '⧗'
}
