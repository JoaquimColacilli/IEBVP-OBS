import { useState } from 'react'
import type { ObsSettings, ObsState, OverlayState, Settings } from '@shared/types'

interface Props {
  settings: Settings
  obs: ObsState
  overlay: OverlayState
  onSave: (patch: Partial<Settings>) => void
  onTest: (obs: ObsSettings) => Promise<void>
  onAutoconfigure: () => Promise<{ ok: boolean; message: string }>
  onFinish: () => void
}

export default function Wizard(props: Props): React.JSX.Element {
  const { settings, obs, overlay } = props
  const [form, setForm] = useState(settings.obs)
  const [sceneReady, setSceneReady] = useState(false)
  const [manual, setManual] = useState(false)
  const [pick, setPick] = useState('')
  const [auto, setAuto] = useState<{ ok: boolean; message: string } | null>(null)

  const connected = obs.status === 'conectado'
  const step = !connected ? 1 : !sceneReady ? 2 : 3

  const stepClass = (index: number): string => {
    if (index < step) return 'step is-done'
    if (index === step) return 'step is-active'
    return 'step is-todo'
  }

  return (
    <div className="doc">
      <div className="doc-h">
        <h1>Primer uso</h1>
        <span className="chip">Paso {step} de 3</span>
      </div>

      <section className={stepClass(1)}>
        <span className="num">{step > 1 ? '✓' : '1'}</span>
        <div>
          <h2>Conectar con OBS</h2>
          <p className="desc">
            {connected
              ? 'Conexión establecida con obs-websocket.'
              : 'En OBS, menú Herramientas → Configuración del servidor WebSocket. No está en Ajustes.'}
          </p>
          {!connected && (
            <ul className="checks">
              <li>
                <span className="mk">1</span>
                <span>
                  Tildá <strong>Habilitar servidor WebSocket</strong>.
                </span>
              </li>
              <li>
                <span className="mk">2</span>
                <span>
                  Dejá el puerto en <strong>4455</strong>.
                </span>
              </li>
              <li>
                <span className="mk">3</span>
                <span>
                  La contraseña la genera OBS solo: tocá{' '}
                  <strong>Mostrar información de conexión</strong> y copiala. Si preferís, borrala y
                  escribí una propia.
                </span>
              </li>
              <li>
                <span className="mk">4</span>
                <span>
                  <strong>Aplicar</strong> y <strong>Aceptar</strong>. Después pegá los datos acá
                  abajo.
                </span>
              </li>
            </ul>
          )}
          <div className="grid g3">
            <label className="f">
              Host
              <input
                type="text"
                value={form.host}
                onChange={(event) => setForm({ ...form, host: event.target.value })}
              />
            </label>
            <label className="f">
              Puerto
              <input
                type="text"
                value={String(form.port)}
                onChange={(event) => setForm({ ...form, port: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="f">
              Contraseña
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
          </div>
          <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
            {connected ? (
              <span className="pill">
                <span className="dot"></span>Conectado · OBS {obs.obsVersion}
              </span>
            ) : (
              <button className="btn is-clay" type="button" onClick={() => void props.onTest(form)}>
                Conectar
              </button>
            )}
            {!connected && obs.error && (
              <span className="pill is-off">
                <span className="dot"></span>
                {obs.error}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={stepClass(2)}>
        <span className="num">{step > 2 ? '✓' : '2'}</span>
        <div>
          <h2>Autoconfigurar la escena</h2>
          <p className="desc">La app crea todo en OBS. No hace falta tocar nada a mano.</p>
          <ul className="checks">
            <li>
              <span className="mk">&#43;</span>
              <span>
                Escena <strong>{settings.sceneName}</strong>, al final de la lista de escenas.
              </span>
            </li>
            <li>
              <span className="mk">&#43;</span>
              <span>
                Browser Source <strong>{settings.inputName}</strong> de 1920×1080, apuntando al
                overlay local.
              </span>
            </li>
            <li>
              <span className="mk">&#43;</span>
              <span>
                Nada más. La escena a la que VOLVER regresa se guarda sola en el momento de emitir:
                sacá el versículo al aire desde la escena del culto, no desde la del versículo.
              </span>
            </li>
          </ul>
          {manual ? (
            <div className="row wrap">
              <select
                className="ver"
                style={{ height: '38px', minWidth: '200px', fontSize: 'var(--fs-3)' }}
                value={pick}
                onChange={(event) => setPick(event.target.value)}
              >
                <option value="">Elegí la escena</option>
                {obs.scenes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                className="btn is-clay"
                type="button"
                disabled={!pick}
                onClick={() => {
                  props.onSave({ sceneName: pick })
                  setSceneReady(true)
                }}
              >
                Usar esta escena
              </button>
            </div>
          ) : (
            <div className="row wrap">
              <button
                className="btn is-clay"
                type="button"
                disabled={step !== 2}
                onClick={() => {
                  void props.onAutoconfigure().then((done) => {
                    setAuto(done)
                    if (done.ok) setSceneReady(true)
                  })
                }}
              >
                Crear escena automáticamente
              </button>
              <button
                className="link"
                type="button"
                disabled={step !== 2}
                onClick={() => setManual(true)}
              >
                Ya la creé a mano, elegirla de una lista
              </button>
            </div>
          )}
          <div className="row" style={{ marginTop: 'var(--sp-5)' }}>
            <span className="mono">
              {overlay.url || 'El server del overlay no está escuchando'}
            </span>
          </div>
          {auto && (
            <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
              <span className={auto.ok ? 'pill' : 'pill is-off'}>
                <span className="dot"></span>
                {auto.message}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className={stepClass(3)}>
        <span className="num">3</span>
        <div>
          <h2>Listo para usar</h2>
          <p className="desc">
            Buscá una referencia, revisá el preview y sacala al aire con Ctrl + Enter. Esc vuelve a
            la escena anterior.
          </p>
          <div className="row">
            <button
              className="btn is-primary"
              type="button"
              disabled={step !== 3}
              onClick={props.onFinish}
            >
              Empezar
            </button>
          </div>
        </div>
      </section>

      <div className="wiz-foot">Todo esto se puede cambiar después en Configuración.</div>
    </div>
  )
}
