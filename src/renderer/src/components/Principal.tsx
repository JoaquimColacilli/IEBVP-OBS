import { useEffect, useRef, useState, type RefObject } from 'react'
import type {
  AirState,
  BookInfo,
  ObsState,
  SearchResult,
  Settings,
  VersionInfo
} from '@shared/types'
import { completeBook } from '../lib/autocomplete'
import { hourOf } from '../lib/format'
import OverlayFrame from './OverlayFrame'

const MAX_LINES = 6

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
  onSettings: () => void
  onCandidate: (query: string) => void
}

export default function Principal(props: Props): React.JSX.Element {
  const { settings, versions, books, obs, air, query, result, inputRef } = props
  const [focused, setFocused] = useState(false)
  const [lines, setLines] = useState(0)
  const verseRef = useRef<HTMLParagraphElement | null>(null)
  const typedRef = useRef(query)
  const pushedRef = useRef(query)

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const miss = !air.onAir && result && !result.ok ? result : null
  const canAir = connected && Boolean(result?.ok)

  useEffect(() => {
    if (query !== pushedRef.current) typedRef.current = query
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

  const change = (value: string): void => {
    const typing = value.length > typedRef.current.length
    typedRef.current = value
    if (typing) {
      const completion = completeBook(value, books)
      if (completion) {
        pushedRef.current = completion
        props.onQuery(completion)
        queueMicrotask(() => {
          const node = inputRef.current
          if (node && node.value === completion)
            node.setSelectionRange(value.length, completion.length)
        })
        return
      }
    }
    pushedRef.current = value
    props.onQuery(value)
    if (value === query) {
      queueMicrotask(() => {
        const node = inputRef.current
        if (node) node.setSelectionRange(node.value.length, node.value.length)
      })
    }
  }

  const acceptCompletion = (): boolean => {
    const node = inputRef.current
    if (!node) return false
    const { selectionStart, selectionEnd, value } = node
    if (selectionStart === null || selectionEnd === null) return false
    if (selectionStart >= selectionEnd || selectionEnd !== value.length) return false
    node.setSelectionRange(value.length, value.length)
    typedRef.current = value
    return true
  }

  const overflows = Boolean(passage) && lines > MAX_LINES
  const suggestion =
    overflows && passage && passage.to > passage.from
      ? `${passage.book} ${passage.chapter}:${passage.from}-${Math.max(
          passage.from,
          passage.from + Math.floor((passage.to - passage.from + 1) * (MAX_LINES / lines)) - 1
        )}`
      : null

  const airSub = air.onAir
    ? `${air.passage?.reference} · ${air.passage?.version}`
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
        <div className={focused ? 'field is-focus' : 'field'}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Buscá una referencia — jn 3 16"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => change(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.ctrlKey) {
                event.preventDefault()
                acceptCompletion()
                props.onSubmit()
                return
              }
              if (event.key === 'Tab') {
                if (acceptCompletion()) event.preventDefault()
                return
              }
              if (event.key === ' ' || event.key === 'ArrowRight' || event.key === 'End') {
                acceptCompletion()
              }
            }}
          />
          <span className="ret">Enter</span>
        </div>
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
            {air.since !== null && <span>Al aire desde las {hourOf(air.since)}.</span>}
          </>
        ) : result?.ok ? (
          <>
            <span className="chip">
              {result.passage.reference} · {result.passage.version}
            </span>
            <span>Listo para emitir.</span>
          </>
        ) : miss ? (
          <span>Sin coincidencias para esa referencia.</span>
        ) : (
          <span>Escribí una referencia y presioná Enter.</span>
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
            <button className="btn" type="button" onClick={() => props.onCandidate(suggestion)}>
              Emitir {suggestion}
            </button>
          )}
        </div>
      )}

      <div className="stage">
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
            <div className={air.onAir ? 'preview is-live' : 'preview'}>
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
            <div className="caption">{caption}</div>
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
