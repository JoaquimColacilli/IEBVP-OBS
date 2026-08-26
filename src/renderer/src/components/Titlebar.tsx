import type { AirState, ObsState } from '@shared/types'
import { clock } from '../lib/format'

interface Props {
  obs: ObsState
  air: AirState
  elapsed: number
  showSettings: boolean
  onSettings: () => void
}

export default function Titlebar({
  obs,
  air,
  elapsed,
  showSettings,
  onSettings
}: Props): React.JSX.Element {
  const connected = obs.status === 'conectado'
  return (
    <header className="titlebar">
      <div className="wordmark">Versículos</div>
      <div className="spacer"></div>
      <span className={connected ? 'status is-ok' : 'status is-off'}>
        <span className="dot"></span>
        {connected
          ? 'OBS conectado'
          : obs.status === 'conectando'
            ? 'Conectando a OBS'
            : 'OBS desconectado'}
      </span>
      {air.onAir && (
        <span className="status is-live">
          <span className="dot"></span>Al aire<span className="time">{clock(elapsed)}</span>
        </span>
      )}
      {showSettings && (
        <button className="tbtn" type="button" onClick={onSettings}>
          Configuración
        </button>
      )}
      <div className="wctl">
        <span onClick={() => void window.versiculos.window.minimize()}>&#8211;</span>
        <span onClick={() => void window.versiculos.window.maximize()}>&#9723;</span>
        <span className="is-close" onClick={() => void window.versiculos.window.close()}>
          &#10005;
        </span>
      </div>
    </header>
  )
}
