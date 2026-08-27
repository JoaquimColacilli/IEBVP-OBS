import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type {
  AirState,
  BookInfo,
  ObsState,
  SearchResult,
  Settings,
  VersionInfo
} from '@shared/types'
import { completeBook, lastVerseThatFits, matchingBooks } from '../lib/autocomplete'
import { hourOf } from '../lib/format'
import BookBrowser from './BookBrowser'
import OverlayFrame from './OverlayFrame'

const MAX_LINES = 6
const MAX_SUGGESTIONS = 7
const PREVIEW_MAX = 614
const STAGE_GAP = 12

interface Props {
  settings: Settings
  versions: VersionInfo[]
  books: BookInfo[]
  obs: ObsState
  air: AirState
  query: string
  result: SearchResult | null
  inputRef: RefObject<HTMLInputElement | null>
  canPrev: boolean
  canNext: boolean
  showNav: boolean
  onQuery: (value: string) => void
  onSubmit: () => void
  onVersion: (version: string) => void
  onAir: () => void
  onBack: () => void
  onPrev: () => void
  onNext: () => void
  onClear: () => void
  onSettings: () => void
  onCandidate: (query: string) => void
}

export default function Principal(props: Props): React.JSX.Element {
  const { settings, versions, books, obs, air, query, result, inputRef } = props
  const [focused, setFocused] = useState(false)
  const [lines, setLines] = useState(0)
  const [highlight, setHighlight] = useState(-1)
  const [closedList, setClosedList] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [ignored, setIgnored] = useState<string[]>([])
  const verseRef = useRef<HTMLParagraphElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const captionRef = useRef<HTMLDivElement | null>(null)
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_MAX)
  const typedRef = useRef(query)
  const pushedRef = useRef(query)
  const absorbRef = useRef('')

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const miss = !air.onAir && result && !result.ok ? result : null
  const canAir = connected && Boolean(result?.ok)

  const suggestions = useMemo(
    () => matchingBooks(query, books).slice(0, MAX_SUGGESTIONS),
    [books, query]
  )
  const listOpen = focused && !closedList && suggestions.length > 0

  useEffect(() => {
    if (query !== pushedRef.current) {
      typedRef.current = query
      absorbRef.current = ''
    }
  }, [query])

  useEffect(() => {
    const node = verseRef.current
    if (!node || !passage) return
    const measure = (): void => {
      const height = parseFloat(window.getComputedStyle(node).lineHeight)
      setLines(height > 0 ? Math.round(node.offsetHeight / height) : 0)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [passage])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const measure = (): void => {
      const box = node.getBoundingClientRect()
      const caption = captionRef.current?.offsetHeight ?? 0
      const free = Math.max(0, box.height - caption - (caption ? STAGE_GAP : 0))
      const next = Math.max(0, Math.min(PREVIEW_MAX, box.width, free * (16 / 9)))
      setPreviewWidth((current) => (Math.abs(current - next) < 0.5 ? current : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [])

  const previewStyle = {
    width: `${previewWidth}px`,
    '--preview-scale': `${previewWidth / 1920}`
  } as React.CSSProperties

  const caretToEnd = (text: string): void => {
    queueMicrotask(() => {
      const node = inputRef.current
      if (!node) return
      if (node.value !== text) node.value = text
      node.setSelectionRange(text.length, text.length)
    })
  }

  const push = (text: string): void => {
    typedRef.current = text
    pushedRef.current = text
    props.onQuery(text)
  }

  const change = (value: string): void => {
    const previous = typedRef.current
    const appended = value.length === previous.length + 1 && value.startsWith(previous)
    const inserted = appended ? value[previous.length] : ''

    if (
      appended &&
      inserted &&
      absorbRef.current.toLowerCase().startsWith(inserted.toLowerCase())
    ) {
      absorbRef.current = absorbRef.current.slice(1)
      push(previous)
      caretToEnd(previous)
      return
    }
    if (appended && !absorbRef.current && inserted === ' ' && previous.endsWith(' ')) {
      push(previous)
      caretToEnd(previous)
      return
    }

    absorbRef.current = ''
    setClosedList(false)
    setHighlight(-1)

    if (value.length > previous.length) {
      const completion = completeBook(value, books)
      if (completion) {
        absorbRef.current = completion.slice(value.length)
        const next = `${completion} `
        push(next)
        caretToEnd(next)
        return
      }
    }
    push(value)
    if (value === query) caretToEnd(value)
  }

  const choose = (name: string): void => {
    absorbRef.current = ''
    setClosedList(true)
    setHighlight(-1)
    const next = `${name} `
    push(next)
    caretToEnd(next)
    inputRef.current?.focus()
  }

  const key = passage ? `${passage.version}|${passage.reference}` : ''
  const overflows = Boolean(passage) && lines > MAX_LINES && !ignored.includes(key)
  const cut = overflows && passage ? lastVerseThatFits(passage, lines, MAX_LINES) : null
  const suggestion =
    cut && passage ? `${passage.book} ${passage.chapter}:${passage.from}-${cut}` : null

  const airSub = air.onAir
    ? air.passage
      ? `${air.passage.reference} · ${air.passage.version}`
      : 'Pantalla limpia'
    : !connected
      ? 'Requiere OBS'
      : !result?.ok
        ? miss
          ? 'Sin versículo'
          : 'Buscá un versículo'
        : 'Ctrl + Enter'

  const caption = air.onAir ? (
    <>
      Escena <strong>{settings.sceneName}</strong> activa en OBS.
    </>
  ) : !connected ? (
    <>La escena del versículo se emite solo con OBS conectado.</>
  ) : result?.ok ? (
    <>Así se va a ver en el stream, a escala.</>
  ) : (
    <>
      Escena <strong>{settings.sceneName}</strong> lista. Nada al aire.
    </>
  )

  return (
    <main className="main">
      {!connected && (
        <div className="banner">
          <strong>Sin conexión a OBS.</strong>
          <span>Podés buscar versículos, pero no sacarlos al aire.</span>
          <span className="spacer"></span>
          <button className="btn is-primary" type="button" onClick={props.onSettings}>
            Abrir configuración
          </button>
        </div>
      )}

      <div className="search">
        <div className="search-field">
          <div className={focused ? 'field is-focus' : 'field'}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Buscá una referencia — jn 3 16"
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              onChange={(event) => change(event.target.value)}
              onKeyDown={(event) => {
                if (listOpen) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    event.stopPropagation()
                    const delta = event.key === 'ArrowDown' ? 1 : -1
                    setHighlight((current) => {
                      const next = current + delta
                      if (next < 0) return suggestions.length - 1
                      if (next >= suggestions.length) return 0
                      return next
                    })
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setClosedList(true)
                    return
                  }
                  if (event.key === 'Enter' && highlight >= 0) {
                    event.preventDefault()
                    event.stopPropagation()
                    choose(suggestions[highlight].name)
                    return
                  }
                }
                if (event.key === 'Enter' && !event.ctrlKey) {
                  event.preventDefault()
                  setClosedList(true)
                  props.onSubmit()
                }
              }}
            />
            <span className="ret">Enter</span>
          </div>
          {listOpen && (
            <div className="suggest">
              {suggestions.map((book, index) => (
                <button
                  className={index === highlight ? 'suggest-item is-on' : 'suggest-item'}
                  type="button"
                  key={book.id}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(book.name)}
                >
                  <span>{book.name}</span>
                  <span className="browser-count">{book.verses.length} cap.</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={browsing ? 'ver is-on' : 'ver'}
          type="button"
          title="Ver todos los libros"
          onClick={() => setBrowsing((open) => !open)}
        >
          Libros
        </button>
        <select
          className="ver"
          value={settings.version}
          onChange={(event) => props.onVersion(event.target.value)}
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.id}
            </option>
          ))}
        </select>
      </div>

      <div className="resolved">
        {air.onAir && air.passage ? (
          <>
            <span className="chip">
              {air.passage.reference} · {air.passage.version}
            </span>
            {air.since !== null && (
              <span className="said">Al aire desde las {hourOf(air.since)}.</span>
            )}
          </>
        ) : air.onAir ? (
          <span>Pantalla limpia al aire, sin versículo.</span>
        ) : result?.ok ? (
          <>
            <span className="chip">
              {result.passage.reference} · {result.passage.version}
            </span>
            <span className="said">Listo para emitir.</span>
          </>
        ) : miss ? (
          <span>Sin coincidencias para esa referencia.</span>
        ) : (
          <span>Escribí una referencia y presioná Enter.</span>
        )}
        <span className="spacer"></span>
        {(result || air.onAir) && (
          <button className="link" type="button" onClick={props.onClear}>
            {air.onAir ? 'Limpiar pantalla' : 'Limpiar preview'}
          </button>
        )}
      </div>

      {overflows && (
        <div className="banner">
          <strong>No entra en pantalla.</strong>
          <span>
            El pasaje ocupa {lines} líneas y en el overlay entran {MAX_LINES}: se va a ver cortado.
          </span>
          <span className="spacer"></span>
          {suggestion && (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setIgnored((current) => [...current, key])
                props.onCandidate(suggestion)
              }}
            >
              Emitir {suggestion}
            </button>
          )}
          <button
            className="banner-close"
            type="button"
            title="No avisar de nuevo por este pasaje"
            onClick={() => setIgnored((current) => [...current, key])}
          >
            &#10005;
          </button>
        </div>
      )}

      <div className="stage" ref={stageRef}>
        {browsing && (
          <BookBrowser
            books={books}
            onPick={(text) => props.onCandidate(text)}
            onClose={() => setBrowsing(false)}
          />
        )}
        {miss ? (
          <div className="panel">
            <h2>{miss.title}</h2>
            <p>{miss.detail}</p>
            {miss.candidates.length > 0 && (
              <div className="row">
                {miss.candidates.map((candidate) => (
                  <span
                    className="chip is-quiet"
                    key={candidate.reference}
                    onClick={() => props.onCandidate(candidate.query)}
                  >
                    {candidate.reference}
                  </span>
                ))}
              </div>
            )}
            <div className="fmt">
              Formatos que entiende: jn 3 16 · Juan 3:16-18 · salmo 23 · 1co 13
            </div>
          </div>
        ) : (
          <>
            <div className={air.onAir ? 'preview is-live' : 'preview'} style={previewStyle}>
              <span className={air.onAir ? 'tag is-live' : 'tag'}>
                {air.onAir ? 'Al aire' : passage ? 'Preview' : 'Preview · reposo'}
              </span>
              {props.showNav && (
                <>
                  <button
                    className={air.onAir ? 'nav is-prev is-live' : 'nav is-prev'}
                    type="button"
                    disabled={!props.canPrev}
                    title="Anterior de la cola"
                    onClick={props.onPrev}
                  >
                    &#8249;
                  </button>
                  <button
                    className={air.onAir ? 'nav is-next is-live' : 'nav is-next'}
                    type="button"
                    disabled={!props.canNext}
                    title="Siguiente de la cola"
                    onClick={props.onNext}
                  >
                    &#8250;
                  </button>
                </>
              )}
              <OverlayFrame passage={passage} visible={Boolean(passage)} verseRef={verseRef} />
            </div>
            <div className="caption" ref={captionRef}>
              {caption}
            </div>
          </>
        )}
      </div>

      <div className="actions">
        <button
          className={air.onAir ? 'air is-live' : 'air'}
          type="button"
          disabled={!canAir}
          onClick={props.onAir}
        >
          <span className="lbl">
            {air.onAir && <span className="beacon"></span>}
            Al aire
          </span>
          <span className="sub">{airSub}</span>
        </button>
        <button
          className={air.onAir ? 'back is-primary' : 'back'}
          type="button"
          disabled={!air.onAir}
          onClick={props.onBack}
        >
          <span className="lbl">Volver</span>
          <span className="sub">Esc</span>
        </button>
      </div>

      <div className="hints">
        <span className="hint">
          <span className="kbd">Enter</span> buscar
        </span>
        <span className="hint">
          <span className="kbd">Ctrl</span>
          <span className="kbd">Enter</span> al aire
        </span>
        <span className="hint">
          <span className="kbd">Esc</span> volver
        </span>
      </div>
    </main>
  )
}
