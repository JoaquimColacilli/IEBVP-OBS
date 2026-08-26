import { BrowserWindow, ipcMain } from 'electron'
import type { AirState, ObsState, OverlayState, Passage, Settings } from '@shared/types'
import { airState, goBack, goLive, onAirState, resetAir } from './air'
import { defaultVersion, hasVersion, listVersions } from './bible/library'
import { search } from './bible/reference'
import { getSettings, setSettings } from './config'
import {
  autoConfigure,
  connectObs,
  disconnectObs,
  listScenes,
  obsState,
  onObsState
} from './obs/service'
import {
  onOverlayState,
  overlayState,
  startOverlayServer,
  type OverlayPaths
} from './overlay/server'

let paths: OverlayPaths | null = null

function broadcast(channel: string, payload: ObsState | AirState | OverlayState): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
}

function activeVersion(): string {
  const id = getSettings().version
  return hasVersion(id) ? id : defaultVersion()
}

export function registerIpc(overlayPaths: OverlayPaths): void {
  paths = overlayPaths

  onObsState((state) => broadcast('obs:state', state))
  onAirState((state) => broadcast('air:state', state))
  onOverlayState((state) => broadcast('overlay:state', state))

  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', async (_event, patch: Partial<Settings>) => {
    const before = getSettings()
    const after = setSettings(patch)
    if (after.overlayPort !== before.overlayPort && paths) {
      await startOverlayServer(paths, after.overlayPort)
    }
    return after
  })

  ipcMain.handle('versions:list', () => listVersions())

  ipcMain.handle('bible:search', (_event, query: string, version?: string) =>
    search(query, version && hasVersion(version) ? version : activeVersion())
  )

  ipcMain.handle('obs:state', () => obsState())
  ipcMain.handle('obs:connect', (_event, patch?: Settings['obs']) => {
    const settings = patch ? setSettings({ obs: patch }) : getSettings()
    return connectObs(settings.obs)
  })
  ipcMain.handle('obs:disconnect', () => disconnectObs())
  ipcMain.handle('obs:scenes', () => listScenes())
  ipcMain.handle('obs:autoconfigure', async () => {
    const settings = getSettings()
    const result = await autoConfigure(settings.sceneName, settings.inputName, overlayState().url)
    return result
  })

  ipcMain.handle('overlay:state', () => overlayState())

  ipcMain.handle('air:state', () => airState())
  ipcMain.handle('air:show', (_event, passage: Passage) => goLive(passage, getSettings()))
  ipcMain.handle('air:back', () => goBack(getSettings()))
  ipcMain.handle('air:reset', () => {
    resetAir()
    return airState()
  })

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  })
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}
