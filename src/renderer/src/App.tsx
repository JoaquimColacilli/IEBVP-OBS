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
import Compacto from './components/Compacto'
import Configuracion from './components/Configuracion'
import Principal from './components/Principal'
import Sidebar, { type HistoryEntry, type ImportReport } from './components/Sidebar'
import Titlebar from './components/Titlebar'
import Wizard from './components/Wizard'
import { hourOf } from './lib/format'
import { chapterVerses, neighbourVerse } from './lib/passage'

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
  const [compact, setCompact] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<Passage[]>([])
  const booksRef = useRef<BookInfo[]>([])
  const shownRef = useRef<Passage | null>(null)
  const canEmitRef = useRef(false)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    booksRef.current = books
  }, [books])

  useEffect(() => {
    canEmitRef.current = air.onAir && obs.status === 'conectado'
  }, [air.onAir, obs.status])

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
  const shown = air.onAir ? air.passage : preview

  useEffect(() => {
    if (preview) void window.versiculos.air.preview(preview)
  }, [preview])

  useEffect(() => {
    shownRef.current = shown
  }, [shown])

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
  }, [compact, settings, showConfig])

  const toggleCompact = useCallback(() => {
    const next = !compact
    setCompact(next)
    if (next) setShowConfig(false)
    void window.versiculos.window.compact(next)
  }, [compact])

  const save = useCallback((patch: Partial<Settings>) => {
    void window.versiculos.settings.set(patch).then(setSettings)
  }, [])

  const focusSearch = useCallback(() => {
    setShowConfig(false)
    requestAnimationFrame(() => {
      const node = inputRef.current
      if (!node) return
      node.focus()
      node.select()
    })
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

  const emitLive = useCallback(
    async (passage: Passage) => {
      if (!canEmitRef.current) return
      try {
        await emit(passage)
      } catch {
        setAir(await window.versiculos.air.state())
      }
    },
    [emit]
  )

  const runSearch = useCallback(
    async (text: string, id: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        setResult(null)
        return
      }
      const found = await window.versiculos.bible.search(trimmed, id)
      setResult(found)
      if (!found.ok) return
      setSelected(enqueue(found.passage))
      await emitLive(found.passage)
    },
    [emitLive, enqueue]
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

  const pickLive = useCallback(
    async (index: number) => {
      const passage = queueRef.current[index]
      if (!passage) return
      pick(index)
      await emitLive(passage)
    },
    [emitLive, pick]
  )

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
      await emitLive(current[next])
    },
    [emitLive, pick, selected]
  )

  const stepVerse = useCallback(
    (delta: -1 | 1) => {
      const passage = shownRef.current
      if (!passage) return
      const target = neighbourVerse(passage, chapterVerses(booksRef.current, passage), delta)
      if (!target) return
      setQuery(target)
      void runSearch(target, passage.version)
    },
    [runSearch]
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
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault()
        focusSearch()
        return
      }
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT') return
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
      if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault()
        stepVerse(event.key === 'ArrowRight' ? 1 : -1)
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
  }, [focusSearch, goBack, goLive, step, stepVerse])

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

  const canPrev = selected > 0
  const canNext = queue.length > 0 && selected < queue.length - 1
  const prevQueue = canPrev ? (queue[selected - 1]?.reference ?? null) : null
  const nextQueue = canNext ? (queue[selected + 1]?.reference ?? null) : null
  const verses = shown ? chapterVerses(books, shown) : 0
  const prevVerse = shown ? neighbourVerse(shown, verses, -1) : null
  const nextVerse = shown ? neighbourVerse(shown, verses, 1) : null

  return (
    <div className="app">
      {air.onAir && <div className="tally"></div>}
      <Titlebar
        obs={obs}
        air={air}
        update={update}
        elapsed={elapsed}
        showSettings={!showConfig}
        compact={compact}
        onInstall={() => void window.versiculos.update.install()}
        onSettings={() => setShowConfig(true)}
        onCompact={toggleCompact}
      />
      {compact ? (
        <Compacto
          obs={obs}
          air={air}
          books={books}
          query={query}
          result={result}
          inputRef={inputRef}
          canPrev={canPrev}
          canNext={canNext}
          prevQueue={prevQueue}
          nextQueue={nextQueue}
          prevVerse={prevVerse}
          nextVerse={nextVerse}
          onQuery={setQuery}
          onSubmit={submit}
          onAir={() => void goLive()}
          onBack={() => void goBack()}
          onPrev={() => void step(-1)}
          onNext={() => void step(1)}
          onPrevVerse={() => stepVerse(-1)}
          onNextVerse={() => stepVerse(1)}
        />
      ) : showConfig ? (
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
            canPrev={canPrev}
            canNext={canNext}
            showNav={queue.length > 1}
            prevQueue={prevQueue}
            nextQueue={nextQueue}
            prevVerse={prevVerse}
            nextVerse={nextVerse}
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
            onPrevVerse={() => stepVerse(-1)}
            onNextVerse={() => stepVerse(1)}
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
            onAir={air.onAir}
            airReference={air.onAir ? (air.passage?.reference ?? null) : null}
            onPick={pick}
            onPickLive={(index) => void pickLive(index)}
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
