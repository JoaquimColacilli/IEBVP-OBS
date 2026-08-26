import type { Passage } from '@shared/types'

export interface HistoryEntry {
  reference: string
  version: string
  time: string
}

interface Props {
  queue: Passage[]
  history: HistoryEntry[]
  selected: number
  airReference: string | null
  onPick: (index: number) => void
}

export default function Sidebar({
  queue,
  history,
  selected,
  airReference,
  onPick
}: Props): React.JSX.Element {
  return (
    <aside className="side">
      <div className="side-h">
        <span>Cola del culto</span>
        <span className="n">{queue.length}</span>
      </div>
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
            <button
              key={`${passage.version}-${passage.reference}`}
              type="button"
              className={classes.join(' ')}
              onClick={() => onPick(index)}
            >
              <div className="idx">{index + 1}</div>
              <div>
                <div className="r">
                  <span>{passage.reference}</span>
                  {live && <span className="t">al aire</span>}
                </div>
                <div className="x">{passage.text}</div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="side-h">
        <span>Historial</span>
        <span className="n">{history.length}</span>
      </div>
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
      <div className="side-foot">
        <span className="kbd">&#8593;&#8595;</span> recorrer la cola{' '}
        <span className="spacer"></span>
      </div>
    </aside>
  )
}
