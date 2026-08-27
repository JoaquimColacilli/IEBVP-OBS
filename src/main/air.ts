import type { AirState, Passage, Settings } from '@shared/types'
import { hideOverlay, setOverlayContent, showOverlay } from './overlay/server'
import { obsState, setScene } from './obs/service'

const OUT_MS = 300

let state: AirState = { onAir: false, since: null, passage: null, previousScene: null }
let backTimer: NodeJS.Timeout | null = null

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

function cancelBack(): void {
  if (backTimer) clearTimeout(backTimer)
  backTimer = null
}

export function previewAir(passage: Passage | null): void {
  if (!passage) return
  setOverlayContent(passage)
}

export async function goLive(passage: Passage, settings: Settings): Promise<AirState> {
  if (obsState().status !== 'conectado') throw new Error('OBS no está conectado')
  cancelBack()

  setOverlayContent(passage)
  showOverlay()

  if (state.onAir) {
    update({ passage, since: Date.now() })
    return state
  }

  const previousScene = obsState().currentScene
  await setScene(settings.sceneName)
  update({ onAir: true, since: Date.now(), passage, previousScene })
  return state
}

export async function goBack(settings: Settings): Promise<AirState> {
  if (!state.onAir) return state

  hideOverlay()

  const target = settings.returnMode === 'fija' ? settings.returnScene : state.previousScene
  update({ onAir: false, since: null, previousScene: null })

  cancelBack()
  if (target && obsState().status === 'conectado') {
    backTimer = setTimeout(() => {
      backTimer = null
      void setScene(target)
    }, OUT_MS)
  }
  return state
}

export function blankAir(): AirState {
  if (!state.onAir) return state
  hideOverlay()
  update({ passage: null })
  return state
}

export function resetAir(): void {
  cancelBack()
  hideOverlay()
  update({ onAir: false, since: null, previousScene: null })
}
