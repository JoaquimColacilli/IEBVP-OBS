import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { VersiculosApi, Unsubscribe } from '@shared/api'
import type { AirState, ObsState, OverlayState } from '@shared/types'

function subscribe<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: VersiculosApi = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch)
  },
  versions: {
    list: () => ipcRenderer.invoke('versions:list')
  },
  bible: {
    search: (query, version) => ipcRenderer.invoke('bible:search', query, version),
    searchMany: (queries, version) => ipcRenderer.invoke('bible:searchMany', queries, version),
    books: (version) => ipcRenderer.invoke('bible:books', version)
  },
  obs: {
    state: () => ipcRenderer.invoke('obs:state'),
    connect: (obs) => ipcRenderer.invoke('obs:connect', obs),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    scenes: () => ipcRenderer.invoke('obs:scenes'),
    autoconfigure: () => ipcRenderer.invoke('obs:autoconfigure')
  },
  overlay: {
    state: () => ipcRenderer.invoke('overlay:state')
  },
  air: {
    state: () => ipcRenderer.invoke('air:state'),
    show: (passage) => ipcRenderer.invoke('air:show', passage),
    back: () => ipcRenderer.invoke('air:back'),
    blank: () => ipcRenderer.invoke('air:blank'),
    reset: () => ipcRenderer.invoke('air:reset')
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  onObsState: (listener) => subscribe<ObsState>('obs:state', listener),
  onAirState: (listener) => subscribe<AirState>('air:state', listener),
  onOverlayState: (listener) => subscribe<OverlayState>('overlay:state', listener)
}

contextBridge.exposeInMainWorld('versiculos', api)
