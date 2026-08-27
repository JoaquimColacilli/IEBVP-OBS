import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AirState,
  BookInfo,
  ObsSettings,
  ObsState,
  OverlayState,
  Passage,
  SearchResult,
  Settings,
  UpdateState,
  VersionInfo
} from '@shared/types'
import Configuracion from './components/Configuracion'
import Principal from './components/Principal'
import Sidebar, { type HistoryEntry, type ImportReport } from './components/Sidebar'
import Titlebar from './components/Titlebar'
import Wizard from './components/Wizard'
import { hourOf } from './lib/format'

const EMPTY_OBS: ObsState = {
  status: 'desconectado',
  error: null,
  obsVersion: null,
  websocketVersion: null,
  currentScene: null,
  scenes: []
}

const EMPTY_AIR: AirState = { onAir: false, since: null, passage: null, previousScene: null }
const EMPTY_OVERLAY: OverlayState = { running: false, port: 0, url: '', clients: 0, error: null }
const EMPTY_UPDATE: UpdateState = {
  status: 'inactivo',
  version: null,
  percent: 0,
  error: null,
  supported: false
}

export default function App(): React.JSX.Element | null {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [books, setBooks] = useState<BookInfo[]>([])
  const [obs, setObs] = useState<ObsState>(EMPTY_OBS)
  const [air, setAir] = useState<AirState>(EMPTY_AIR)
  const [overlay, setOverlay] = useState<OverlayState>(EMPTY_OVERLAY)
  const [update, setUpdate] = useState<UpdateState>(EMPTY_UPDATE)
  const [version, setVersion] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [queue, setQueue] = useState<Passage[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState(-1)
  const [showConfig, setShowConfig] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<Passage[]>([])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    const api = window.versiculos
    void Promise.all([
      api.settings.get(),
      api.versions.list(),
      api.obs.state(),
      api.air.state(),
      api.overlay.state(),
      api.update.state(),
      api.app.info()
    ]).then(([nextSettings, nextVersions, nextObs, nextAir, nextOverlay, nextUpdate, info]) => {
      setSettings(nextSettings)
      setVersions(nextVersions)
      setObs(nextObs)
      setAir(nextAir)
      setOverlay(nextOverlay)
      setUpdate(nextUpdate)
      setVersion(info.version)
    })
    const off = [
      api.onObsState(setObs),
      api.onAirState(setAir),
      api.onOverlayState(setOverlay),
      api.onUpdateState(setUpdate)
    ]
    return () => off.forEach((unsubscribe) => unsubscribe())
  }, [])

  const preview = result?.ok ? result.passage : null

  useEffect(() => {
    if (preview) void window.versiculos.air.preview(preview)
  }, [preview])

  const bibleVersion = settings?.version

  useEffect(() => {
    if (!bibleVersion) return
    void window.versiculos.bible.books(bibleVersion).then(setBooks)
  }, [bibleVersion])

  useEffect(() => {
    const since = air.since
    if (!air.onAir || since === null) return
    const timer = setInterval(() => setElapsed(Date.now() - since), 1000)
    return () => clearInterval(timer)
  }, [air.onAir, air.since])

  useEffect(() => {
    if (settings && !showConfig && settings.wizardDone) inputRef.current?.focus()
  }, [settings, showConfig])

  const save = useCallback((patch: Partial<Settings>) => {
    void window.versiculos.settings.set(patch).then(setSettings)
  }, [])

  const enqueue = useCallback((passage: Passage): number => {
    const current = queueRef.current
    const index = current.findIndex(
      (item) => item.reference === passage.reference && item.version === passage.version
    )
    if (index >= 0) return index
    setQueue([...current, passage])
    return current.length
  }, [])

  const runSearch = useCallback(
    async (text: string, id: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        setResult(null)
        return
      }
      const found = await window.versiculos.bible.search(trimmed, id)
      setResult(found)
      if (found.ok) setSelected(enqueue(found.passage))
    },
    [enqueue]
  )

  const submit = useCallback(() => {
    if (!settings) return
    void runSearch(query, settings.version)
  }, [query, runSearch, settings])

  const pick = useCallback((index: number) => {
    const passage = queueRef.current[index]
    if (!passage) return
    setSelected(index)
    setQuery(passage.reference)
    setResult({ ok: true, passage })
  }, [])

  const emit = useCallback(async (passage: Passage) => {
    const started = performance.now()
    const next = await window.versiculos.air.show(passage)
    if (import.meta.env.DEV) {
      console.log(`[tiempo] click al aire ${(performance.now() - started).toFixed(2)} ms`)
    }
    setElapsed(0)
    setAir(next)
    setHistory((current) => [
      {
        reference: passage.reference,
        version: passage.version,
        time: hourOf(next.since ?? Date.now())
      },
      ...current
    ])
  }, [])

  const goLive = useCallback(async () => {
    if (!result?.ok || obs.status !== 'conectado') return
    await emit(result.passage)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [emit, obs.status, result])

  const goBack = useCallback(async () => {
    const next = await window.versiculos.air.back()
    setElapsed(0)
    setAir(next)
    inputRef.current?.focus()
  }, [])

  const step = useCallback(
    async (delta: number) => {
      const current = queueRef.current
      if (!current.length) return
      const base = selected < 0 ? (delta > 0 ? -1 : 0) : selected
      const next = Math.min(current.length - 1, Math.max(0, base + delta))
      if (next === selected) return
      pick(next)
      if (air.onAir) await emit(current[next])
    },
    [air.onAir, emit, pick, selected]
  )

  const remove = useCallback((index: number) => {
    setQueue(queueRef.current.filter((_, position) => position !== index))
    setSelected((current) => {
      if (current < 0) return current
      if (index < current) return current - 1
      if (index === current) return -1
      return current
    })
  }, [])

  const reorder = useCallback((from: number, to: number) => {
    const current = [...queueRef.current]
    const [moved] = current.splice(from, 1)
    current.splice(to, 0, moved)
    setQueue(current)
    setSelected((position) => {
      if (position < 0) return position
      if (position === from) return to
      if (from < position && to >= position) return position - 1
      if (from > position && to <= position) return position + 1
      return position
    })
  }, [])

  const clear = useCallback(async () => {
    setQuery('')
    setResult(null)
    setSelected(-1)
    if (air.onAir) setAir(await window.versiculos.air.blank())
    inputRef.current?.focus()
  }, [air.onAir])

  const clearQueue = useCallback(() => {
    setQueue([])
    setSelected(-1)
  }, [])

  const importQueue = useCallback(
    async (queries: string[]): Promise<ImportReport> => {
      const results = await window.versiculos.bible.searchMany(queries, bibleVersion)
      const next = [...queueRef.current]
      const failed: string[] = []
      let added = 0
      let repeated = 0
      results.forEach((found, position) => {
        if (!found.ok) {
          failed.push(queries[position])
          return
        }
        const passage = found.passage
        const exists = next.some(
          (item) => item.reference === passage.reference && item.version === passage.version
        )
        if (exists) {
          repeated++
          return
        }
        next.push(passage)
        added++
      })
      setQueue(next)
      return { added, repeated, failed }
    },
    [bibleVersion]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        void goLive()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        void goBack()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        void step(1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        void step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack, goLive, step])

  const test = useCallback(async (next: ObsSettings) => {
    const state = await window.versiculos.obs.connect(next)
    setObs(state)
    setSettings(await window.versiculos.settings.get())
  }, [])

  const autoconfigure = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const done = await window.versiculos.obs.autoconfigure()
      const scene = done.createdScene ? 'escena creada' : 'escena existente'
      const input = done.createdInput ? 'Browser Source creada' : 'Browser Source actualizada'
      return { ok: true, message: `${done.sceneName}: ${scene}, ${input}` }
    } catch (cause) {
      return { ok: false, message: cause instanceof Error ? cause.message : String(cause) }
    }
  }, [])

  if (!settings) return null

  if (!settings.wizardDone && !showConfig) {
    return (
      <div className="app">
        <Titlebar
          obs={obs}
          air={air}
          update={update}
          elapsed={elapsed}
          showSettings
          onInstall={() => void window.versiculos.update.install()}
          onSettings={() => {
            save({ wizardDone: true })
            setShowConfig(true)
          }}
        />
        <Wizard
          settings={settings}
          obs={obs}
          overlay={overlay}
          onSave={save}
          onTest={test}
          onAutoconfigure={autoconfigure}
          onFinish={() => save({ wizardDone: true })}
        />
      </div>
    )
  }

  return (
    <div className="app">
      {air.onAir && <div className="tally"></div>}
      <Titlebar
        obs={obs}
        air={air}
        update={update}
        elapsed={elapsed}
        showSettings={!showConfig}
        onInstall={() => void window.versiculos.update.install()}
        onSettings={() => setShowConfig(true)}
      />
      {showConfig ? (
        <Configuracion
          settings={settings}
          versions={versions}
          obs={obs}
          overlay={overlay}
          onSave={save}
          onTest={test}
          onAutoconfigure={autoconfigure}
          onBack={() => setShowConfig(false)}
        />
      ) : (
        <div className="body">
          <Principal
            settings={settings}
            versions={versions}
            books={books}
            obs={obs}
            air={air}
            query={query}
            result={result}
            inputRef={inputRef}
            canPrev={selected > 0}
            canNext={queue.length > 0 && selected < queue.length - 1}
            showNav={queue.length > 1}
            onQuery={setQuery}
            onSubmit={submit}
            onVersion={(next) => {
              save({ version: next })
              void runSearch(query, next)
            }}
            onAir={() => void goLive()}
            onBack={() => void goBack()}
            onPrev={() => void step(-1)}
            onNext={() => void step(1)}
            onClear={() => void clear()}
            onSettings={() => setShowConfig(true)}
            onCandidate={(text) => {
              setQuery(text)
              void runSearch(text, settings.version)
            }}
          />
          <Sidebar
            version={version}
            update={update}
            queue={queue}
            history={history}
            selected={selected}
            airReference={air.onAir ? (air.passage?.reference ?? null) : null}
            onPick={pick}
            onRemove={remove}
            onClearQueue={clearQueue}
            onClearHistory={() => setHistory([])}
            onReorder={reorder}
            onImport={importQueue}
          />
        </div>
      )}
    </div>
  )
}
