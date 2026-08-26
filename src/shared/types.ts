export type ObsStatus = 'desconectado' | 'conectando' | 'conectado'

export type ReturnMode = 'anterior' | 'fija'

export type Fit = 's' | 'm' | 'l' | 'xl'

export interface VersionInfo {
  id: string
  name: string
  publisher: string
  credit: string
  books: number
  verses: number
}

export interface BookInfo {
  id: string
  name: string
  abbrevs: string[]
  verses: number[]
}

export interface Passage {
  bookId: string
  book: string
  chapter: number
  from: number
  to: number
  reference: string
  version: string
  credit: string
  text: string
  html: string
  fit: Fit
  verseLengths: number[]
}

export interface Candidate {
  reference: string
  query: string
}

export interface SearchHit {
  ok: true
  passage: Passage
}

export interface SearchMiss {
  ok: false
  query: string
  title: string
  detail: string
  candidates: Candidate[]
}

export type SearchResult = SearchHit | SearchMiss

export interface ObsSettings {
  host: string
  port: number
  password: string
}

export interface Settings {
  obs: ObsSettings
  sceneName: string
  inputName: string
  returnMode: ReturnMode
  returnScene: string
  version: string
  overlayPort: number
  wizardDone: boolean
}

export interface ObsState {
  status: ObsStatus
  error: string | null
  obsVersion: string | null
  websocketVersion: string | null
  currentScene: string | null
  scenes: string[]
}

export interface OverlayState {
  running: boolean
  port: number
  url: string
  clients: number
  error: string | null
}

export interface AirState {
  onAir: boolean
  since: number | null
  passage: Passage | null
  previousScene: string | null
}

export interface AutoConfigureResult {
  sceneName: string
  inputName: string
  url: string
  createdScene: boolean
  createdInput: boolean
}

export interface OverlayMessage {
  type: 'estado' | 'contenido' | 'mostrar' | 'ocultar'
  passage?: Passage | null
  visible?: boolean
}
