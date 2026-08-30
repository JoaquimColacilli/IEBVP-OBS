import { useState } from 'react'
import type { Passage, UpdateState } from '@shared/types'
import { splitLines } from '../lib/autocomplete'

export interface HistoryEntry {
  reference: string
  version: string
  time: string
}

export interface ImportReport {
  added: number
  repeated: number
  failed: string[]
}

interface Props {
  version: string
  update: UpdateState
  queue: Passage[]
  history: HistoryEntry[]
  selected: number
  onAir: boolean
  airReference: string | null
  onPick: (index: number) => void
  onRemove: (index: number) => void
  onClearQueue: () => void
  onClearHistory: () => void
  onReorder: (from: number, to: number) => void
  onImport: (queries: string[]) => Promise<ImportReport>
}

export default function Sidebar(props: Props): React.JSX.Element {
  const { version, update, queue, history, selected, onAir, airReference } = props
  const [openHistory, setOpenHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [dragging, setDragging] = useState(-1)
  const [over, setOver] = useState(-1)

  const lines = splitLines(raw)

  const runImport = async (): Promise<void> => {
    if (!lines.length) return
    setBusy(true)
    const done = await props.onImport(lines)
    setBusy(false)
    setReport(done)
    if (!done.failed.length) {
      setRaw('')
      setImporting(false)
    }
  }

  return (
    <aside className="side">
      <div className="side-h">
        <span className="full">Cola del culto</span>
        <span className="short">Cola</span>
        <span className="spacer"></span>
        <button
          className="side-act"
          type="button"
          onClick={() => {
            setImporting((open) => !open)
            setReport(null)
          }}
        >
          {importing ? 'cerrar' : 'importar'}
        </button>
        {queue.length > 0 &&
          (confirmClear ? (
            <button
              className="side-act is-danger"
              type="button"
              onBlur={() => setConfirmClear(false)}
              onClick={() => {
                props.onClearQueue()
                setConfirmClear(false)
              }}
            >
              ¿vaciar?
            </button>
          ) : (
            <button className="side-act" type="button" onClick={() => setConfirmClear(true)}>
              vaciar
            </button>
          ))}
        <span className="n">{queue.length}</span>
      </div>

      {importing && (
        <div className="importer">
          <p className="importer-help">
            Pegá la lista del pastor, una referencia por línea. Se aceptan viñetas y numeración.
          </p>
          <textarea
            value={raw}
            autoFocus
            spellCheck={false}
            placeholder={'Salmos 23:1\nJuan 3:16-18\n1co 13'}
            onChange={(event) => setRaw(event.target.value)}
          />
          <div className="importer-row">
            <button
              className="btn is-clay"
              type="button"
              disabled={!lines.length || busy}
              onClick={() => void runImport()}
            >
              {busy ? 'Buscando…' : `Agregar ${lines.length || ''}`.trim()}
            </button>
            <button className="link" type="button" onClick={() => setRaw('')}>
              Limpiar
            </button>
          </div>
          {report && (
            <div className="importer-report">
              <div>
                {report.added} agregadas
                {report.repeated > 0 && ` · ${report.repeated} ya estaban`}
                {report.failed.length > 0 && ` · ${report.failed.length} sin encontrar`}
              </div>
              {report.failed.length > 0 && (
                <div className="importer-bad">{report.failed.join(' · ')}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="list">
        {queue.length === 0 && (
          <div className="side-empty">Todavía no buscaste ninguna referencia.</div>
        )}
        {queue.map((passage, index) => {
          const live = airReference === passage.reference
          const classes = ['item']
          if (live) classes.push('is-live')
          else if (index === selected) classes.push('is-sel')
          if (index === dragging) classes.push('is-dragging')
          if (dragging >= 0 && index === over && index !== dragging) {
            classes.push(index > dragging ? 'is-under' : 'is-over')
          }
          return (
            <div
              className={classes.join(' ')}
              key={`${passage.version}-${passage.reference}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(index))
                setDragging(index)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOver(index)
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragging >= 0 && dragging !== index) props.onReorder(dragging, index)
                setDragging(-1)
                setOver(-1)
              }}
              onDragEnd={() => {
                setDragging(-1)
                setOver(-1)
              }}
            >
              <div className="idx">{index + 1}</div>
              <button
                className="item-main"
                type="button"
                title={
                  onAir
                    ? `Mandar ${passage.reference} al aire`
                    : `Ver ${passage.reference} en el preview`
                }
                onClick={() => props.onPick(index)}
              >
                <div className="r">
                  <span>{passage.reference}</span>
                  {live && <span className="t">al aire</span>}
                </div>
                <div className="x">{passage.text}</div>
              </button>
              <button
                className="item-del"
                type="button"
                title={`Quitar ${passage.reference}`}
                onClick={() => props.onRemove(index)}
              >
                &#10005;
              </button>
            </div>
          )
        })}
      </div>

      <div className="side-h">
        <button
          className="side-toggle"
          type="button"
          onClick={() => setOpenHistory((open) => !open)}
        >
          <span className={openHistory ? 'caret is-open' : 'caret'}>&#9656;</span>
          Historial
        </button>
        <span className="spacer"></span>
        {openHistory && history.length > 0 && (
          <button className="side-act" type="button" onClick={props.onClearHistory}>
            limpiar
          </button>
        )}
        <span className="n">{history.length}</span>
      </div>
      {openHistory && (
        <div className="list">
          {history.length === 0 && <div className="side-empty">Nada emitido todavía.</div>}
          {history.map((entry, index) => (
            <div className="item is-past" key={`${entry.time}-${entry.reference}-${index}`}>
              <div className="idx">&#183;</div>
              <div>
                <div className="r">
                  <span>{entry.reference}</span>
                  <span className="t">{entry.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="side-foot">
        <span className="side-tip">
          <span className="kbd">&#8593;&#8595;</span>
          {onAir ? ' recorrer · un clic al aire' : ' recorrer la cola'}
        </span>
        <span className="spacer"></span>
        <div className="credit">
          <a
            className="by"
            href="https://github.com/JoaquimColacilli"
            target="_blank"
            rel="noreferrer"
            title="github.com/JoaquimColacilli"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
            JoaquimColacilli
          </a>
          <span className="version">
            {update.status === 'descargando'
              ? `bajando v${update.version} · ${update.percent}%`
              : update.status === 'listo'
                ? `v${update.version} lista`
                : `v${version}`}
          </span>
        </div>
      </div>
    </aside>
  )
}
