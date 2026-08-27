import Store from 'electron-store'
import type { Settings } from '@shared/types'

export const DEFAULT_SETTINGS: Settings = {
  obs: { host: 'localhost', port: 4455, password: '' },
  sceneName: 'Versículo',
  inputName: 'Overlay versículo',
  returnMode: 'anterior',
  returnScene: '',
  version: 'RVR1960',
  overlayPort: 4780,
  wizardDone: false
}

const store = new Store<Settings>({ name: 'ajustes', defaults: DEFAULT_SETTINGS })

let cache: Settings | null = null

function read(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...store.store,
    obs: { ...DEFAULT_SETTINGS.obs, ...store.store.obs }
  }
}

export function getSettings(): Settings {
  if (!cache) cache = read()
  return cache
}

export function setSettings(patch: Partial<Settings>): Settings {
  const current = getSettings()
  const next: Settings = { ...current, ...patch, obs: { ...current.obs, ...patch.obs } }
  store.set(next)
  cache = next
  return next
}
