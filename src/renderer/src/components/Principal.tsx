import { useState, type RefObject } from 'react'
import type { AirState, ObsState, SearchResult, Settings, VersionInfo } from '@shared/types'
import { hourOf } from '../lib/format'
import OverlayFrame from './OverlayFrame'

interface Props {
  settings: Settings
  versions: VersionInfo[]
  obs: ObsState
  air: AirState
  query: string
  result: SearchResult | null
  inputRef: RefObject<HTMLInputElement | null>
  onQuery: (value: string) => void
  onSubmit: () => void
  onVersion: (version: string) => void
  onAir: () => void
  onBack: () => void
  onSettings: () => void
  onCandidate: (query: string) => void
}

export default function Principal(props: Props): React.JSX.Element {
  const { settings, versions, obs, air, query, result, inputRef } = props
  const [focused, setFocused] = useState(false)

  const connected = obs.status === 'conectado'
  const passage = air.onAir ? air.passage : result?.ok ? result.passage : null
  const miss = !air.onAir && result && !result.ok ? result : null
  const canAir = connected && Boolean(result?.ok)

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
              <OverlayFrame passage={passage} visible={Boolean(passage)} />
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
