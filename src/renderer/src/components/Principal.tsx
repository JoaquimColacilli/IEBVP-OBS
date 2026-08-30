import { useEffect, useRef, useState, type RefObject } from 'react'
import type {
  AirState,
  BookInfo,
  ObsState,
  SearchResult,
  Settings,
  VersionInfo
} from '@shared/types'
import { lastVerseThatFits } from '../lib/autocomplete'
import { hourOf } from '../lib/format'
import { chapterVerses } from '../lib/passage'
import BookBrowser from './BookBrowser'
import Buscador from './Buscador'
import OverlayFrame from './OverlayFrame'

const MAX_LINES = 6
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
  prevQueue: string | null
  nextQueue: string | null
  prevVerse: string | null
  nextVerse: string | null
  onQuery: (value: string) => void
  onSubmit: () => void
  onVersion: (version: string) => void
  onAir: () => void
  onBack: () => void
  onPrev: () => void
  onNext: () => void
  onPrevVerse: () => void
  onNextVerse: () => void
  onClear: () => void
  onSettings: () => void
  onCandidate: (query: string) => void
}

export default function Principal(props: Props): React.JSX.Element {
  const { settings, versions, books, obs, air, query, result, inputRef } = props
  const [lines, setLines] = useState(0)
  const [browsing, setBrowsing] = useState(false)
  const [ignored, setIgnored] = useState<string[]>([])
  const verseRef = useRef<HTMLParagraphElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const captionRef = useRef<HTMLDivElement | null>(null)
  const stepperRef = useRef<HTMLDivElement | null>(null)
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_MAX)

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const miss = !air.onAir && result && !result.ok ? result : null
  const canAir = connected && Boolean(result?.ok)
  const stepping = !miss && Boolean(passage) && Boolean(props.prevVerse || props.nextVerse)
  const total = passage ? chapterVerses(books, passage) : 0

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
      const stacked = [captionRef.current?.offsetHeight ?? 0, stepperRef.current?.offsetHeight ?? 0]
      const used = stacked.reduce((sum, height) => sum + (height ? height + STAGE_GAP : 0), 0)
      const free = Math.max(0, box.height - used)
      const next = Math.max(0, Math.min(PREVIEW_MAX, box.width, free * (16 / 9)))
      setPreviewWidth((current) => (Math.abs(current - next) < 0.5 ? current : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [stepping])

  const previewStyle = {
    width: `${previewWidth}px`,
    '--preview-scale': `${previewWidth / 1920}`
  } as React.CSSProperties

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
          <span className="said">Podés buscar versículos, pero no sacarlos al aire.</span>
          <span className="spacer"></span>
          <button className="btn is-primary" type="button" onClick={props.onSettings}>
            Abrir configuración
          </button>
        </div>
      )}

      <div className="search">
        <Buscador
          query={query}
          books={books}
          inputRef={inputRef}
          placeholder="Buscá una referencia — jn 3 16"
          onQuery={props.onQuery}
          onSubmit={props.onSubmit}
        />
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
                  <div className="navwrap is-prev">
                    {props.prevQueue && <span className="navtip">{props.prevQueue}</span>}
                    <button
                      className={air.onAir ? 'nav is-live' : 'nav'}
                      type="button"
                      disabled={!props.canPrev}
                      title={
                        props.prevQueue
                          ? `Anterior de la cola: ${props.prevQueue}`
                          : 'Anterior de la cola'
                      }
                      onClick={props.onPrev}
                    >
                      &#8249;
                    </button>
                  </div>
                  <div className="navwrap is-next">
                    {props.nextQueue && <span className="navtip">{props.nextQueue}</span>}
                    <button
                      className={air.onAir ? 'nav is-live' : 'nav'}
                      type="button"
                      disabled={!props.canNext}
                      title={
                        props.nextQueue
                          ? `Siguiente de la cola: ${props.nextQueue}`
                          : 'Siguiente de la cola'
                      }
                      onClick={props.onNext}
                    >
                      &#8250;
                    </button>
                  </div>
                </>
              )}
              <OverlayFrame passage={passage} visible={Boolean(passage)} verseRef={verseRef} />
            </div>
            {stepping && passage && (
              <div className="stepper" ref={stepperRef} style={{ width: `${previewWidth}px` }}>
                <button
                  className="vstep"
                  type="button"
                  disabled={!props.prevVerse}
                  title={
                    props.prevVerse
                      ? `Versículo anterior: ${props.prevVerse} (Alt + ←)`
                      : 'Ya estás en el principio del capítulo'
                  }
                  onClick={props.onPrevVerse}
                >
                  <span className="vstep-ref">{props.prevVerse ?? 'Principio del capítulo'}</span>
                  <span className="vstep-go">&#8249;</span>
                </button>
                <span className="stepper-mid">
                  {passage.book} {passage.chapter} · {total} versículos
                </span>
                <button
                  className="vstep is-next"
                  type="button"
                  disabled={!props.nextVerse}
                  title={
                    props.nextVerse
                      ? `Versículo siguiente: ${props.nextVerse} (Alt + →)`
                      : 'Ya estás en el final del capítulo'
                  }
                  onClick={props.onNextVerse}
                >
                  <span className="vstep-ref">{props.nextVerse ?? 'Final del capítulo'}</span>
                  <span className="vstep-go">&#8250;</span>
                </button>
              </div>
            )}
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
        <span className="hint">
          <span className="kbd">Ctrl</span>
          <span className="kbd">F</span> buscador
        </span>
        <span className="hint">
          <span className="kbd">Alt</span>
          <span className="kbd">&#8592;&#8594;</span> versículo
        </span>
      </div>
    </main>
  )
}
