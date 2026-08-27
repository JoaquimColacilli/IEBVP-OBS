import type { AirState, ObsState, UpdateState } from '@shared/types'
import Brand from './Brand'
import { clock } from '../lib/format'

interface Props {
  obs: ObsState
  air: AirState
  update: UpdateState
  elapsed: number
  showSettings: boolean
  compact?: boolean
  onSettings: () => void
  onInstall: () => void
  onCompact?: () => void
}

export default function Titlebar({
  obs,
  air,
  update,
  elapsed,
  showSettings,
  compact = false,
  onSettings,
  onInstall,
  onCompact
}: Props): React.JSX.Element {
  const connected = obs.status === 'conectado'
  const estado = connected
    ? 'OBS conectado'
    : obs.status === 'conectando'
      ? 'Conectando a OBS'
      : 'OBS desconectado'
  return (
    <header className={compact ? 'titlebar is-compact' : 'titlebar'}>
      <Brand />
      <div className="spacer"></div>
      <span className={connected ? 'status is-ok' : 'status is-off'} title={estado}>
        <span className="dot"></span>
        <span className="lbl">{estado}</span>
      </span>
      {air.onAir && (
        <span className="status is-live" title="Al aire">
          <span className="dot"></span>
          <span className="lbl">Al aire</span>
          <span className="time">{clock(elapsed)}</span>
        </span>
      )}
      {update.status === 'listo' && (
        <button className="tbtn is-update" type="button" onClick={onInstall}>
          Instalar v{update.version}
        </button>
      )}
      {showSettings && !compact && (
        <button className="tbtn" type="button" title="Configuración" onClick={onSettings}>
          <span className="full">Configuración</span>
          <span className="short">Config</span>
        </button>
      )}
      {onCompact && (
        <button
          className="tbtn is-compact"
          type="button"
          title={compact ? 'Volver al tamaño normal' : 'Modo compacto: ventana chica'}
          onClick={onCompact}
        >
          <span className="full">{compact ? 'Ampliar' : 'Compacto'}</span>
          <span className="short">{compact ? 'Ampliar' : 'Mini'}</span>
        </button>
      )}
      <div className="wctl">
        <span title="Minimizar" onClick={() => void window.versiculos.window.minimize()}>
          &#8211;
        </span>
        {!compact && (
          <span title="Maximizar" onClick={() => void window.versiculos.window.maximize()}>
            &#9723;
          </span>
        )}
        <span
          className="is-close"
          title="Cerrar"
          onClick={() => void window.versiculos.window.close()}
        >
          &#10005;
        </span>
      </div>
    </header>
  )
}
