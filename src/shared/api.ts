import type {
  AirState,
  BookInfo,
  AutoConfigureResult,
  ObsSettings,
  ObsState,
  OverlayState,
  Passage,
  SearchResult,
  Settings,
  VersionInfo
} from './types'

export type Unsubscribe = () => void

export interface VersiculosApi {
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
  }
  versions: {
    list(): Promise<VersionInfo[]>
  }
  bible: {
    search(query: string, version?: string): Promise<SearchResult>
    searchMany(queries: string[], version?: string): Promise<SearchResult[]>
    books(version?: string): Promise<BookInfo[]>
  }
  obs: {
    state(): Promise<ObsState>
    connect(obs?: ObsSettings): Promise<ObsState>
    disconnect(): Promise<ObsState>
    scenes(): Promise<string[]>
    autoconfigure(): Promise<AutoConfigureResult>
  }
  overlay: {
    state(): Promise<OverlayState>
  }
  air: {
    state(): Promise<AirState>
    show(passage: Passage): Promise<AirState>
    back(): Promise<AirState>
    blank(): Promise<AirState>
    reset(): Promise<AirState>
  }
  window: {
    minimize(): Promise<void>
    maximize(): Promise<void>
    close(): Promise<void>
  }
  onObsState(listener: (state: ObsState) => void): Unsubscribe
  onAirState(listener: (state: AirState) => void): Unsubscribe
  onOverlayState(listener: (state: OverlayState) => void): Unsubscribe
}
