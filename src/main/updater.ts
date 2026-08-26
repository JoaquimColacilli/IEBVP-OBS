import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'

const INTERVAL = 30 * 60 * 1000

let state: UpdateState = {
  status: 'inactivo',
  version: null,
  percent: 0,
  error: null,
  supported: app.isPackaged
}

const listeners = new Set<(next: UpdateState) => void>()

export function updateState(): UpdateState {
  return state
}

export function onUpdateState(listener: (next: UpdateState) => void): void {
  listeners.add(listener)
}

function update(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

export function startUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => update({ status: 'buscando', error: null }))
  autoUpdater.on('update-not-available', () => update({ status: 'inactivo', version: null }))
  autoUpdater.on('update-available', (info) =>
    update({ status: 'descargando', version: info.version, percent: 0 })
  )
  autoUpdater.on('download-progress', (progress) =>
    update({ status: 'descargando', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    update({ status: 'listo', version: info.version, percent: 100 })
  )
  autoUpdater.on('error', (cause) =>
    update({ status: 'error', error: cause instanceof Error ? cause.message : String(cause) })
  )

  void autoUpdater.checkForUpdates()
  setInterval(() => {
    if (state.status === 'descargando' || state.status === 'listo') return
    void autoUpdater.checkForUpdates()
  }, INTERVAL)
}

export function checkForUpdates(): UpdateState {
  if (app.isPackaged) void autoUpdater.checkForUpdates()
  return state
}

export function installUpdate(): void {
  if (state.status === 'listo') autoUpdater.quitAndInstall(false, true)
}
