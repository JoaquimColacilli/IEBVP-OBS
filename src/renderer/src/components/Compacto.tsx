import type { RefObject } from 'react'
import type { AirState, BookInfo, ObsState, SearchResult } from '@shared/types'
import Buscador from './Buscador'

interface Props {
  obs: ObsState
  air: AirState
  books: BookInfo[]
  query: string
  result: SearchResult | null
  inputRef: RefObject<HTMLInputElement | null>
  canPrev: boolean
  canNext: boolean
  onQuery: (value: string) => void
  onSubmit: () => void
  onAir: () => void
  onBack: () => void
  onPrev: () => void
  onNext: () => void
}

export default function Compacto(props: Props): React.JSX.Element {
  const { obs, air, books, query, result, inputRef } = props

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const canAir = connected && Boolean(result?.ok)
  const airSub = !connected ? 'Requiere OBS' : !result?.ok ? 'Sin versículo' : 'Ctrl + Enter'

  const label = passage
    ? `${passage.reference} · ${passage.version}`
    : air.onAir
      ? 'Pantalla limpia'
      : result && !result.ok
        ? 'Sin coincidencias'
        : 'Buscá una referencia'

  return (
    <main className="mini">
      <Buscador
        query={query}
        books={books}
        inputRef={inputRef}
        placeholder="jn 3 16"
        onQuery={props.onQuery}
        onSubmit={props.onSubmit}
      />

      <div className="mini-now">
        <button
          className="mini-nav"
          type="button"
          disabled={!props.canPrev}
          title="Anterior de la cola"
          onClick={props.onPrev}
        >
          &#8249;
        </button>
        <span className={air.onAir ? 'mini-ref is-live' : 'mini-ref'}>{label}</span>
        <button
          className="mini-nav"
          type="button"
          disabled={!props.canNext}
          title="Siguiente de la cola"
          onClick={props.onNext}
        >
          &#8250;
        </button>
      </div>

      <div className="mini-actions">
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
    </main>
  )
}
