import { OBSWebSocket } from 'obs-websocket-js'
import type { AutoConfigureResult, ObsSettings, ObsState } from '@shared/types'

const BACKOFF = [1000, 2000, 4000, 8000, 15000]

const obs = new OBSWebSocket()

let state: ObsState = {
  status: 'desconectado',
  error: null,
  obsVersion: null,
  websocketVersion: null,
  currentScene: null,
  scenes: []
}

let settings: ObsSettings | null = null
let wanted = false
let attempt = 0
let timer: NodeJS.Timeout | null = null

const listeners = new Set<(next: ObsState) => void>()

export function obsState(): ObsState {
  return state
}

export function onObsState(listener: (next: ObsState) => void): void {
  listeners.add(listener)
}

function update(patch: Partial<ObsState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

function describe(cause: unknown): string {
  if (cause instanceof Error) return cause.message
  return String(cause)
}

async function refresh(): Promise<void> {
  const [scenes, program] = await Promise.all([
    obs.call('GetSceneList'),
    obs.call('GetCurrentProgramScene')
  ])
  update({
    scenes: scenes.scenes.map((scene) => String(scene.sceneName)).reverse(),
    currentScene: program.currentProgramSceneName
  })
}

function cancelRetry(): void {
  if (timer) clearTimeout(timer)
  timer = null
}

function scheduleRetry(): void {
  if (!wanted || timer) return
  const delay = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]
  attempt++
  timer = setTimeout(() => {
    timer = null
    void attemptConnect()
  }, delay)
}

async function attemptConnect(): Promise<ObsState> {
  if (!settings) return state
  update({ status: 'conectando', error: null })
  const address = `ws://${settings.host}:${settings.port}`
  try {
    const identified = await obs.connect(address, settings.password || undefined)
    const version = await obs.call('GetVersion')
    attempt = 0
    update({
      status: 'conectado',
      error: null,
      obsVersion: version.obsVersion,
      websocketVersion: identified.obsWebSocketVersion
    })
    await refresh()
  } catch (cause) {
    update({ status: 'desconectado', error: describe(cause), obsVersion: null, websocketVersion: null })
    scheduleRetry()
  }
  return state
}

obs.on('ConnectionClosed', () => {
  if (state.status === 'desconectado') return
  update({ status: 'desconectado', obsVersion: null, websocketVersion: null, scenes: [], currentScene: null })
  scheduleRetry()
})

obs.on('CurrentProgramSceneChanged', (event) => {
  update({ currentScene: event.sceneName })
})

obs.on('SceneListChanged', (event) => {
  update({ scenes: event.scenes.map((scene) => String(scene.sceneName)).reverse() })
})

export async function connectObs(next: ObsSettings): Promise<ObsState> {
  settings = next
  wanted = true
  attempt = 0
  cancelRetry()
  await disconnectQuietly()
  return attemptConnect()
}

async function disconnectQuietly(): Promise<void> {
  try {
    await obs.disconnect()
  } catch {
    // ya estaba cerrado
  }
}

export async function disconnectObs(): Promise<ObsState> {
  wanted = false
  cancelRetry()
  await disconnectQuietly()
  update({ status: 'desconectado', error: null, obsVersion: null, websocketVersion: null, scenes: [], currentScene: null })
  return state
}

export async function listScenes(): Promise<string[]> {
  if (state.status !== 'conectado') return state.scenes
  await refresh()
  return state.scenes
}

export async function currentScene(): Promise<string | null> {
  if (state.status !== 'conectado') return null
  const program = await obs.call('GetCurrentProgramScene')
  update({ currentScene: program.currentProgramSceneName })
  return program.currentProgramSceneName
}

export async function setScene(sceneName: string): Promise<void> {
  await obs.call('SetCurrentProgramScene', { sceneName })
  update({ currentScene: sceneName })
}

export async function autoConfigure(
  sceneName: string,
  inputName: string,
  url: string
): Promise<AutoConfigureResult> {
  const scenes = await listScenes()
  let createdScene = false
  if (!scenes.includes(sceneName)) {
    await obs.call('CreateScene', { sceneName })
    createdScene = true
  }
  const inputSettings = {
    url,
    width: 1920,
    height: 1080,
    reroute_audio: false,
    restart_when_active: false,
    shutdown: false
  }
  let createdInput = false
  const inputs = await obs.call('GetInputList', {})
  const exists = inputs.inputs.some((input) => String(input.inputName) === inputName)
  if (exists) {
    await obs.call('SetInputSettings', { inputName, inputSettings, overlay: true })
  } else {
    await obs.call('CreateInput', {
      sceneName,
      inputName,
      inputKind: 'browser_source',
      inputSettings,
      sceneItemEnabled: true
    })
    createdInput = true
  }
  await refresh()
  return { sceneName, inputName, url, createdScene, createdInput }
}
