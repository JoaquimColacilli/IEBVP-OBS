import type { AirState, Passage, Settings } from '@shared/types'
import { hideOverlay, setOverlayContent, showOverlay } from './overlay/server'
import { currentScene, obsState, setScene } from './obs/service'

const SCENE_MARGIN = 120
const OUT_MS = 300

let state: AirState = { onAir: false, since: null, passage: null, previousScene: null }

const listeners = new Set<(next: AirState) => void>()

export function airState(): AirState {
  return state
}

export function onAirState(listener: (next: AirState) => void): void {
  listeners.add(listener)
}

function update(patch: Partial<AirState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function goLive(passage: Passage, settings: Settings): Promise<AirState> {
  if (obsState().status !== 'conectado') throw new Error('OBS no está conectado')

  if (state.onAir) {
    hideOverlay()
    await wait(OUT_MS)
    setOverlayContent(passage)
    showOverlay()
    update({ passage, since: Date.now() })
    return state
  }

  setOverlayContent(passage)
  const previousScene = (await currentScene()) ?? null
  await setScene(settings.sceneName)
  update({ onAir: true, since: Date.now(), passage, previousScene })
  await wait(SCENE_MARGIN)
  showOverlay()
  return state
}

export async function goBack(settings: Settings): Promise<AirState> {
  if (!state.onAir) return state
  hideOverlay()
  await wait(OUT_MS)
  const target = settings.returnMode === 'fija' ? settings.returnScene : state.previousScene
  if (target && obsState().status === 'conectado') await setScene(target)
  update({ onAir: false, since: null, previousScene: null })
  return state
}

export function blankAir(): AirState {
  if (!state.onAir) return state
  hideOverlay()
  update({ passage: null })
  return state
}

export function resetAir(): void {
  hideOverlay()
  update({ onAir: false, since: null, previousScene: null })
}
