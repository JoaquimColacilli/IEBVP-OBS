import { useState } from 'react'
import type { ObsSettings, ObsState, OverlayState, Settings, VersionInfo } from '@shared/types'

interface Props {
  settings: Settings
  versions: VersionInfo[]
  obs: ObsState
  overlay: OverlayState
  onSave: (patch: Partial<Settings>) => void
  onTest: (obs: ObsSettings) => Promise<void>
  onAutoconfigure: () => Promise<{ ok: boolean; message: string }>
  onBack: () => void
}

export default function Configuracion(props: Props): React.JSX.Element {
  const { settings, versions, obs, overlay } = props
  const [form, setForm] = useState(settings.obs)
  const [port, setPort] = useState(String(settings.overlayPort))
  const [tested, setTested] = useState(false)
  const [auto, setAuto] = useState<{ ok: boolean; message: string } | null>(null)

  const connected = obs.status === 'conectado'
  const scenes = obs.scenes.includes(settings.sceneName)
    ? obs.scenes
    : [settings.sceneName, ...obs.scenes]
  const returnScenes = obs.scenes.length
    ? obs.scenes
    : settings.returnScene
      ? [settings.returnScene]
      : []

  const savePort = (): void => {
    const parsed = Number(port)
    if (Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535)
      props.onSave({ overlayPort: parsed })
    else setPort(String(settings.overlayPort))
  }

  return (
    <div className="doc">
      <div className="doc-h">
        <button className="btn" type="button" onClick={props.onBack}>
          &#8592; Principal
        </button>
        <h1>Configuración</h1>
      </div>

      <section className="card">
        <h2>Conexión a OBS</h2>
        <p className="desc">
          obs-websocket 5.x. La contraseña está en OBS, en Herramientas → Configuración de
          WebSocket.
        </p>
        <div className="grid g3">
          <label className="f">
            Host
            <input
              type="text"
              value={form.host}
              onChange={(event) => setForm({ ...form, host: event.target.value })}
              onBlur={() => props.onSave({ obs: form })}
            />
          </label>
          <label className="f">
            Puerto
            <input
              type="text"
              value={String(form.port)}
              onChange={(event) => setForm({ ...form, port: Number(event.target.value) || 0 })}
              onBlur={() => props.onSave({ obs: form })}
            />
          </label>
          <label className="f">
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              onBlur={() => props.onSave({ obs: form })}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setTested(true)
              void props.onTest(form)
            }}
          >
            Probar conexión
          </button>
          {tested && connected && (
            <span className="pill">
              <span className="dot"></span>Conectado · OBS {obs.obsVersion} · obs-websocket{' '}
              {obs.websocketVersion}
            </span>
          )}
          {tested && !connected && (
            <span className={obs.status === 'conectando' ? 'pill is-wait' : 'pill is-off'}>
              <span className="dot"></span>
              {obs.status === 'conectando' ? 'Conectando…' : (obs.error ?? 'Sin conexión')}
            </span>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Escena del versículo</h2>
        <p className="desc">
          La escena que la app activa al emitir. Contiene la Browser Source del overlay.
        </p>
        <div className="grid g3">
          <label className="f">
            Escena
            <select
              value={settings.sceneName}
              onChange={(event) => props.onSave({ sceneName: event.target.value })}
            >
              {scenes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            Puerto del overlay
            <input
              type="text"
              value={port}
              onChange={(event) => setPort(event.target.value)}
              onBlur={savePort}
            />
          </label>
          <label className="f">
            Browser Source
            <input
              type="text"
              value={settings.inputName}
              onChange={(event) => props.onSave({ inputName: event.target.value })}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
          <span className="mono">
            {overlay.url || 'El server del overlay no está escuchando'} · 1920×1080
          </span>
        </div>
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            className="link"
            type="button"
            disabled={!connected}
            onClick={() => {
              void props.onAutoconfigure().then(setAuto)
            }}
          >
            Volver a crear la escena automáticamente
          </button>
          {auto && (
            <span className={auto.ok ? 'pill' : 'pill is-off'}>
              <span className="dot"></span>
              {auto.message}
            </span>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Comportamiento de VOLVER</h2>
        <p className="desc">Qué hace OBS cuando el operador presiona VOLVER o Esc.</p>
        <div className="grid">
          <div
            className={settings.returnMode === 'anterior' ? 'opt is-on' : 'opt'}
            onClick={() => props.onSave({ returnMode: 'anterior' })}
          >
            <span className="radio"></span>
            <div>
              <div className="tt">Volver a la escena anterior</div>
              <div className="dd">Restaura la escena que estaba activa antes de emitir.</div>
            </div>
          </div>
          <div
            className={settings.returnMode === 'fija' ? 'opt is-on' : 'opt'}
            onClick={() => props.onSave({ returnMode: 'fija' })}
          >
            <span className="radio"></span>
            <div>
              <div className="tt">Ir siempre a una escena fija</div>
              <div className="dd">Útil si el culto siempre vuelve a la misma cámara.</div>
              <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                <select
                  value={settings.returnScene}
                  onChange={(event) => props.onSave({ returnScene: event.target.value })}
                  style={{
                    height: '34px',
                    padding: '0 var(--sp-4)',
                    border: '1px solid var(--c-line-strong)',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--c-surface)',
                    fontSize: 'var(--fs-2)'
                  }}
                >
                  <option value="">Elegí una escena</option>
                  {returnScenes.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Versiones de la Biblia instaladas</h2>
        <p className="desc">Incluidas en la app. No requieren internet.</p>
        {versions.map((version) => (
          <div className="trow" key={version.id}>
            <div style={{ flex: 1 }}>
              <div className="nm">{version.id}</div>
              <div className="ds">
                {version.name} · {version.books} libros · {version.publisher}
              </div>
            </div>
            {settings.version === version.id ? (
              <span className="badge">Predeterminada</span>
            ) : (
              <button
                className="link"
                type="button"
                onClick={() => props.onSave({ version: version.id })}
              >
                Usar por defecto
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
