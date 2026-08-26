import { useState } from 'react'
import type { Passage } from '@shared/types'
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
  queue: Passage[]
  history: HistoryEntry[]
  selected: number
  airReference: string | null
  onPick: (index: number) => void
  onRemove: (index: number) => void
  onClearQueue: () => void
  onClearHistory: () => void
  onImport: (queries: string[]) => Promise<ImportReport>
}

export default function Sidebar(props: Props): React.JSX.Element {
  const { queue, history, selected, airReference } = props
  const [openHistory, setOpenHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

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
        <span>Cola del culto</span>
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
          return (
            <div className={classes.join(' ')} key={`${passage.version}-${passage.reference}`}>
              <div className="idx">{index + 1}</div>
              <button className="item-main" type="button" onClick={() => props.onPick(index)}>
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
        <span className="kbd">&#8593;&#8595;</span> recorrer la cola{' '}
        <span className="spacer"></span>
      </div>
    </aside>
  )
}
