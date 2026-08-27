import { useState, type RefObject } from 'react'
import type { AirState, ObsState, SearchResult } from '@shared/types'

interface Props {
  obs: ObsState
  air: AirState
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
  const { obs, air, query, result, inputRef } = props
  const [focused, setFocused] = useState(false)

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const canAir = connected && Boolean(result?.ok)

  const label = passage
    ? `${passage.reference} · ${passage.version}`
    : air.onAir
      ? 'Pantalla limpia'
      : result && !result.ok
        ? 'Sin coincidencias'
        : 'Buscá una referencia'

  return (
    <main className="mini">
      <div className={focused ? 'field is-focus' : 'field'}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="jn 3 16"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => props.onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.ctrlKey) {
              event.preventDefault()
              props.onSubmit()
            }
          }}
        />
        <span className="ret">Enter</span>
      </div>

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
        </button>
        <button
          className={air.onAir ? 'back is-primary' : 'back'}
          type="button"
          disabled={!air.onAir}
          onClick={props.onBack}
        >
          <span className="lbl">Volver</span>
        </button>
      </div>
    </main>
  )
}
