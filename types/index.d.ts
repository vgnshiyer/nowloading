// nowloading's state contract: the one value it keeps in $.state, so a hot reload mid-turn keeps the real start time.
export type SavedTurn = { t0: number; working: boolean }

declare module 'claude-code' {
  interface PluginState {
    nowloading: { turn: SavedTurn }
  }
}
