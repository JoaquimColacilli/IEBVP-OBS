import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AirState,
  ObsSettings,
  ObsState,
  OverlayState,
  Passage,
  SearchResult,
  Settings,
  VersionInfo
} from '@shared/types'
import Configuracion from './components/Configuracion'
import Principal from './components/Principal'
import Sidebar, { type HistoryEntry } from './components/Sidebar'
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

export default function App(): React.JSX.Element | null {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [obs, setObs] = useState<ObsState>(EMPTY_OBS)
  const [air, setAir] = useState<AirState>(EMPTY_AIR)
  const [overlay, setOverlay] = useState<OverlayState>(EMPTY_OVERLAY)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [queue, setQueue] = useState<Passage[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState(-1)
  const [showConfig, setShowConfig] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const api = window.versiculos
    void Promise.all([
      api.settings.get(),
      api.versions.list(),
      api.obs.state(),
      api.air.state(),
      api.overlay.state()
    ]).then(([nextSettings, nextVersions, nextObs, nextAir, nextOverlay]) => {
      setSettings(nextSettings)
      setVersions(nextVersions)
      setObs(nextObs)
      setAir(nextAir)
      setOverlay(nextOverlay)
    })
    const off = [api.onObsState(setObs), api.onAirState(setAir), api.onOverlayState(setOverlay)]
    return () => off.forEach((unsubscribe) => unsubscribe())
  }, [])

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

  const runSearch = useCallback(async (text: string, version: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setResult(null)
      return
    }
    const found = await window.versiculos.bible.search(trimmed, version)
    setResult(found)
    if (found.ok) {
      const passage = found.passage
      setQueue((current) => {
        const index = current.findIndex(
          (item) => item.reference === passage.reference && item.version === passage.version
        )
        if (index >= 0) {
          setSelected(index)
          return current
        }
        setSelected(current.length)
        return [...current, passage]
      })
    }
  }, [])

  const submit = useCallback(() => {
    if (!settings) return
    void runSearch(query, settings.version)
  }, [query, runSearch, settings])

  const pick = useCallback(
    (index: number) => {
      const passage = queue[index]
      if (!passage) return
      setSelected(index)
      setQuery(passage.reference)
      setResult({ ok: true, passage })
    },
    [queue]
  )

  const goLive = useCallback(async () => {
    if (!result?.ok || obs.status !== 'conectado') return
    const passage = result.passage
    const next = await window.versiculos.air.show(passage)
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
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [obs.status, result])

  const goBack = useCallback(async () => {
    const next = await window.versiculos.air.back()
    setElapsed(0)
    setAir(next)
    inputRef.current?.focus()
  }, [])

  const move = useCallback(
    (delta: number) => {
      if (!queue.length) return
      const base = selected < 0 ? (delta > 0 ? -1 : 0) : selected
      const next = Math.min(queue.length - 1, Math.max(0, base + delta))
      pick(next)
    },
    [pick, queue.length, selected]
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
        move(1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        move(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack, goLive, move])

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
          elapsed={elapsed}
          showSettings
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
        elapsed={elapsed}
        showSettings={!showConfig}
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
            obs={obs}
            air={air}
            query={query}
            result={result}
            inputRef={inputRef}
            onQuery={setQuery}
            onSubmit={submit}
            onVersion={(version) => {
              save({ version })
              void runSearch(query, version)
            }}
            onAir={() => void goLive()}
            onBack={() => void goBack()}
            onSettings={() => setShowConfig(true)}
            onCandidate={(text) => {
              setQuery(text)
              void runSearch(text, settings.version)
            }}
          />
          <Sidebar
            queue={queue}
            history={history}
            selected={selected}
            airReference={air.onAir ? (air.passage?.reference ?? null) : null}
            onPick={pick}
          />
        </div>
      )}
    </div>
  )
}
