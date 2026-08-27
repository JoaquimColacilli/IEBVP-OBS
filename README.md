# Versículos IEBVP

App de escritorio para el operador de transmisión de la iglesia. Durante el vivo, cuando el
pastor menciona un versículo, el operador lo busca por referencia y lo saca al aire con un
botón: la app manda el texto a un overlay local y cambia la escena de OBS a la escena del
versículo. Con **VOLVER** se restaura la escena anterior.

Todo corre local y sin internet: las biblias están embebidas en la app, las fuentes están
empaquetadas y el overlay es una página servida por `localhost` que OBS muestra como
Browser Source.

## Stack

- **Electron** scaffoldeado con [electron-vite](https://electron-vite.org) (main / preload / renderer con HMR).
- **React + TypeScript** en el renderer, sobre las variables de `design-reference/tokens.css`. Sin Tailwind ni UI kits.
- **obs-websocket-js** en el main para hablar con OBS (protocolo v5, puerto 4455).
- **express + ws** en el main para servir el overlay y pushearle el versículo en tiempo real.
- **bible-passage-reference-parser** (build `es`) para parsear referencias.
- **electron-store** para persistir la configuración.
- Biblias en JSON embebido con carga lazy. Sin módulos nativos, así que no hay rebuilds de Electron.

Seguridad estándar de Electron: `contextIsolation` prendido, `nodeIntegration` apagado y todo
el tráfico renderer ↔ main pasa por el preload con `contextBridge`.

## Cómo correrla

```bash
npm install
npm run dev
```

`npm run build` corre el typecheck y compila los tres procesos; `npm run build:win` arma el
instalador (ver _Versiones y actualizaciones_).

En el primer arranque la app abre el **wizard de primer uso**. Si OBS no está corriendo, el
botón _Configuración_ de la barra de título sale del wizard y deja la app en la pantalla
principal, en estado desconectado: buscar versículos funciona sin OBS, solo emitir requiere
conexión.

### Atajos

| Tecla          | Acción                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Enter`        | buscar la referencia escrita                                                                                     |
| `Ctrl + Enter` | sacar al aire                                                                                                    |
| `Esc`          | volver a la escena anterior                                                                                      |
| `↑` `↓`        | recorrer la cola del culto (si hay algo al aire, cambia en vivo); dentro de la lista de libros, moverse por ella |

## Durante el culto

**Buscar.** El campo entiende abreviaturas (`jn 3 16`), referencias completas
(`Juan 3:16-18`), rangos y capítulos enteros (`salmo 23`, `1co 13`). Mientras se escribe el
nombre de un libro pasan dos cosas: si lo tipeado deja **una sola** opción posible, la app
escribe el nombre entero en el campo (`salm` pasa a ser `Salmos `, listo para tipear el
capítulo) y si el operador sigue escribiendo el nombre de memoria esas letras se absorben en
vez de duplicarse; si quedan **varias** opciones, se despliega la lista de libros que empiezan
así (`j` muestra Josué, Jueces, Job, Jeremías, Joel, Jonás y Juan) y se elige con `↑` `↓` +
`Enter` o con el mouse.

**Navegador de libros.** El botón _Libros_ abre un panel sobre el costado izquierdo del preview
con los 66 libros (con filtro), sus capítulos y sus versículos, para llegar a una cita sin
escribir nada. También hay un atajo a _capítulo completo_.

**Cola del culto.** Cada referencia que se resuelve entra en la cola. Las filas se reordenan
arrastrándolas, la `×` de cada fila la quita, _vaciar_ borra la cola entera (pide confirmación)
e _importar_ abre un cuadro donde pegar la lista que pasa el pastor: una referencia por línea,
admite viñetas (`-`, `•`) y numeración (`1.`, `2)`). Al confirmar informa cuántas entraron,
cuántas ya estaban y cuáles no pudo resolver.

**Cambiar de versículo.** Las flechas `‹` `›` sobre el preview recorren la cola. Si hay algo al
aire, la flecha cambia el versículo **en vivo**: sale el actual y entra el siguiente, sin tocar
la escena de OBS. Las mismas flechas del teclado (`↑` `↓`) hacen lo mismo.

**Historial.** Arranca colapsado para no comerse la columna; se abre desde su encabezado y
tiene un _limpiar_.

**Limpiar la pantalla.** El enlace _Limpiar_ de la fila de la referencia vacía el preview. Si
hay algo al aire, además saca el texto del overlay y deja la pantalla en el fondo claro sin
volver a la cámara: la escena del versículo sigue activa y VOLVER sigue disponible.

**Pasajes largos.** Si el texto no entra en las seis líneas del overlay, aparece un aviso ámbar
con cuántas líneas ocupa y un botón que recorta la cita a lo que sí entra —el recorte tiene en
cuenta que al achicar el pasaje el overlay agranda la tipografía, así que la cita sugerida
entra de verdad. Es un aviso, no un bloqueo: partir la cita sigue siendo decisión del operador.
Una vez que se aplica el recorte o se cierra el aviso con la `×`, ese pasaje no vuelve a avisar
en toda la sesión.

## Configurar OBS

1. En OBS: menú **Herramientas → Configuración del servidor WebSocket** (no está en _Ajustes_).
   Tildar **Habilitar servidor WebSocket**, dejar el puerto en `4455` y copiar la contraseña
   con **Mostrar información de conexión**: la genera OBS solo, no hay que inventarla. Se puede
   reemplazar por una propia o desactivar la autenticación y dejar el campo vacío en la app.
2. En la app: cargar host, puerto y contraseña, y presionar _Conectar_ (o _Probar conexión_
   desde Configuración).
3. Presionar **Crear escena automáticamente**. La app crea en OBS:
   - una escena llamada `Versículo`;
   - una Browser Source llamada `Overlay versículo` de 1920×1080 apuntando a
     `http://localhost:4780/overlay.html?live=1`, con **Apagar la fuente cuando no esté
     visible** y **Refrescar el navegador cuando la escena se active** desactivados
     (`shutdown` y `restart_when_active` en `false`).

   Si la escena ya existe a mano, se puede elegir de la lista en lugar de crearla.

4. Elegir qué hace **VOLVER**: restaurar la escena que estaba activa antes de emitir (default)
   o ir siempre a una escena fija. La escena de retorno se captura en el momento de emitir, así
   que conviene sacar el versículo al aire desde la escena del culto y no desde la del versículo.

Esos dos tildes son la diferencia entre una transición fluida y un freezazo: con cualquiera de
los dos activado, OBS levanta el Chromium embebido recién al cambiar a la escena y paga la
carga de la página, la conexión al websocket y las fuentes justo durante la transición. Por eso
la app no confía en cómo quedó configurada la fuente: **cada vez que se conecta a OBS lee los
settings de esa Browser Source y, si alguno de los dos está activado, los apaga**. Solo toca
esas dos claves; el resto de la configuración (URL, tamaño, CSS propio, audio) queda como
estaba, y si ya estaban bien no escribe nada.

El server del overlay escucha en `127.0.0.1` en el puerto **4780**, configurable en
Configuración. Si el puerto está ocupado, la app prueba los diez siguientes y muestra el que
quedó activo. Rutas útiles: `/overlay.html?live=1` (la que va en OBS), `/overlay` (la misma
página) y `/ws` (el websocket por donde viaja el versículo).

## Estructura

```
├── design-reference/          bundle de diseño: fuente de verdad visual, no se modifica
├── resources/
│   ├── bibles/                RVR1960.json, NVI.json, RVR1909.json + index.json
│   ├── fonts/                 woff2 locales + fonts.css
│   ├── overlay/               la página que sirve express y muestra OBS
│   └── tokens.css             copia literal de design-reference/tokens.css
├── scripts/
│   ├── books.mjs              tabla canónica de los 66 libros en español
│   ├── build-bibles.mjs       baja y normaliza las biblias
│   ├── build-fonts.mjs        baja los woff2 de Google Fonts
│   └── sync-design.mjs        copia los tokens del bundle de diseño
└── src/
    ├── main/
    │   ├── air.ts             flujo AL AIRE / VOLVER
    │   ├── bible/             carga lazy de versiones + parser y búsqueda
    │   ├── config.ts          electron-store
    │   ├── ipc.ts             canales expuestos al renderer
    │   ├── obs/service.ts     conexión, escenas y autoconfiguración
    │   ├── overlay/server.ts  express + websocket
    │   └── timing.ts          medición de los pasos del vivo, solo sin empaquetar
    ├── preload/               contextBridge → window.versiculos
    ├── renderer/              React: principal, configuración y wizard
    └── shared/                tipos compartidos entre los tres procesos
```

## Datos de las biblias

`node scripts/build-bibles.mjs` baja las versiones originales (las cachea en
`scripts/.cache/`, ignorada por git) y las normaliza a un esquema propio.

**Fuentes.** RVR1960 y NVI salen de [mrk214/bible-data-es-spa](https://github.com/mrk214/bible-data-es-spa).
Ese repo no publica RVR1909, así que esa versión sale de la API pública de
[getbible v2](https://api.getbible.net/v2/valera.json) (`valera`, Reina-Valera 1909).

**`resources/bibles/index.json`** lista las versiones instaladas:

```json
{
  "schema": 1,
  "versions": [
    {
      "id": "RVR1960",
      "name": "Reina-Valera 1960",
      "publisher": "Sociedades Bíblicas Unidas",
      "credit": "RVR1960 © Sociedades Bíblicas Unidas",
      "source": "https://github.com/mrk214/bible-data-es-spa",
      "file": "RVR1960.json",
      "books": 66,
      "verses": 31104
    }
  ]
}
```

`credit` es el string que el overlay imprime al pie. `index.json` se lee al arrancar; cada
`<ID>.json` se lee recién cuando esa versión se usa por primera vez y queda en memoria.

**`resources/bibles/<ID>.json`** repite esa metadata y agrega los libros:

```json
{
  "schema": 1,
  "id": "RVR1960",
  "name": "Reina-Valera 1960",
  "publisher": "Sociedades Bíblicas Unidas",
  "credit": "RVR1960 © Sociedades Bíblicas Unidas",
  "source": "https://github.com/mrk214/bible-data-es-spa",
  "books": [
    {
      "id": "JHN",
      "osis": "John",
      "name": "Juan",
      "abbrevs": ["jn", "jua", "juan", "sjuan", "sanjuan"],
      "chapters": [["En el principio era el Verbo…", "…"], ["…"]]
    }
  ]
}
```

- `id` es el código USFM del libro y `osis` el que devuelve el parser de referencias.
- `name` y `abbrevs` son los de `scripts/books.mjs`, iguales en las tres versiones, para que
  una misma referencia se escriba y se lea igual sin importar la versión activa.
- `chapters[c-1][v-1]` es el texto del versículo `c:v`. Los versículos que una versión no
  trae (la NVI omite dieciséis) quedan como string vacío y la búsqueda los saltea.

## Búsqueda de referencias

El parser es `bible-passage-reference-parser` con el build de español, que entiende tanto
`jn 3 16` como `Juan 3:16`, `juan 3:16-18`, `salmo 23` o `1co 13`. Sobre eso hay una capa
propia (`src/main/bible/reference.ts`) que valida el rango contra la versión activa, arma el
HTML del pasaje (`<span class="ov-num">` para la numeración de los rangos), elige el escalón
tipográfico del overlay según el largo del texto y, cuando no hay match, genera el diagnóstico
de la pantalla _sin resultados_: `jn 3 116` responde «Juan tiene 36 versículos en el capítulo 3»
y ofrece _Juan 3:16_, _Juan 3:11_ y _Juan 11:6_.

## Overlay

`resources/overlay/` es la adaptación de `design-reference/overlay/overlay.html`: mismo CSS,
mismos estados y mismos timings, sin la barra de revisión. La app no manipula el DOM del
overlay: le manda mensajes por websocket (`contenido`, `mostrar`, `ocultar`, y `estado` al
conectarse) y la página aplica las clases `is-visible` / `is-leaving`.

**Secuencia de emisión.** El versículo viaja al overlay apenas aparece en el preview, no al
apretar AL AIRE: la página lo pinta con el overlay todavía oculto, así que el HTML, el salto de
línea y las fuentes ya están resueltos antes del click. Apretar AL AIRE manda `mostrar` y
`SetCurrentProgramScene`, nada más — la escena que estaba activa sale del cache que alimentan
los eventos de obs-websocket, no de un pedido en el momento. Del lado de la app el click son
**~1 ms** contra los ~123 ms de la 1.0.0, y lo único que queda en el camino es el round trip del
cambio de escena.

Si el versículo cambia estando al aire, la página hace la salida (280 ms), recién ahí pinta el
nuevo y hace la entrada: nunca reemplazo en caliente. Esa espera vive en el overlay, no en el
handler del click. VOLVER manda `ocultar` y restaura la escena 300 ms después, cuando terminó
la salida.

El overlay solo anima `opacity` y `transform`, con `will-change` en los tres elementos que se
mueven, y precarga las fuentes al abrir la página (`<link rel="preload">` más `document.fonts.load`)
para no pedir nada por red en el momento de mostrar. Abriendo la URL con `&debug=1` la página
loguea por consola cuánto tardó cada render y cada entrada, que en OBS se ve con el _Inspect_
de la Browser Source.

Corriendo `npm run dev` la app loguea los tiempos de cada paso:

```
[tiempo] al aire · contenido ya listo 0.00 ms · mostrar 0.16 ms · escena 0.53 ms · total 0.78 ms
[tiempo] volver · ocultar 0.19 ms · total 0.23 ms
```

## Decisiones tomadas

Las que la tarea dejó abiertas o que el bundle de diseño no cubría:

- **Nombre visible**: «Versículos IEBVP». El wordmark de la barra de título sigue siendo
  «Versículos», como en el diseño.
- **Puerto del overlay**: 4780 por defecto (4455 es de OBS), configurable en Configuración.
  Se agregó ese campo, que el diseño no tenía, porque la app lo necesita configurable.
- **Ubicación de los datos**: `resources/bibles/`, con carga lazy por versión.
- **La cola del culto** se llena con las referencias que el operador va resolviendo en la
  sesión y con el importador masivo: el diseño la muestra «precargada» pero no define cómo se
  carga. Cola e historial no se persisten entre sesiones.
- **El historial arranca colapsado.** El diseño decidió «cola e historial apilados, sin tabs»,
  pero con veinte emisiones se comía la columna. Quedó como acordeón en la misma columna: se
  respeta el apilado y se recupera el espacio, sin introducir pestañas.
- **Autocompletado de libros por prefijo único.** Solo se dispara cuando lo tipeado deja un
  único libro posible y solo sobre el nombre completo, nunca sobre abreviaturas (que ya son
  cortas). El nombre se escribe entero en el campo; las letras que el operador siga tipeando de
  memoria se absorben en lugar de duplicarse, así que escribir `salmos` completo también
  funciona.
- **El navegador de libros flota sobre el preview** en lugar de empujarlo: el diseño fija el
  preview en 614 px y a 1100 px de ancho no queda lugar para una columna al costado.
- **Controles agregados a la cola** (`×` por fila, arrastrar para reordenar, _vaciar_,
  _importar_) y **flechas sobre el preview**: no están en el bundle de diseño, pero usan sus componentes y tokens. Las flechas
  van encima del preview, dentro del margen que el overlay deja a los costados del texto, para
  no cambiar el ancho de la columna.
- **El aviso de pasaje largo se mide, no se estima**: el preview es el overlay real a escala, así
  que la app lee la altura y el `line-height` que ese mismo CSS produce y los compara con las
  seis líneas que fija el diseño.
- **Rangos entre capítulos** (`jn 3:16-4:2`) no están soportados: la app pide elegir un rango
  dentro de un mismo capítulo. Los cuatro formatos que el diseño imprime en pantalla sí lo están.
- **La ventana es frameless** y la app ocupa todo el alto: el marco, el radio y la sombra que
  el bundle usaba para dibujar la ventana sobre un escritorio no aplican acá. El resto del CSS
  pasó tal cual desde `design-reference`.
- **Las fuentes están empaquetadas** como `.woff2` locales con `@font-face`, como pide el
  README del diseño: el overlay corre sin internet dentro de OBS.
- `electron-store` queda en la 8.x, que es CommonJS y entra en el bundle CJS del main.

## Marca e iconos

El icono es una **Biblia abierta sobre su tapa**: dos páginas en `--c-paper` separadas por el
hueco del lomo, apoyadas sobre una banda en `--c-clay` que hace de tapa, todo dentro de un
cuadrado de esquinas redondeadas en `--c-ink`. Tres masas grandes y tres colores, todos de
`tokens.css`: la silueta se sostiene a 16 px, que es el tamaño que importa en la barra de
tareas, y el fondo oscuro evita que el icono se pierda contra una barra clara.

El master vive en **`resources/icon.svg`** (sin fuentes, sin `<text>`, sin variables CSS: colores
literales, para que el rasterizador no dependa de nada). De ahí salen todos los tamaños:

```bash
npm run icons
```

que regenera `resources/icon.png` (1024), `resources/icons/icon-{16..1024}.png` y
`resources/icon.ico` con los siete tamaños que usa Windows. Es reproducible: se puede correr
las veces que haga falta y siempre parte del SVG.

Dentro de la app el icono **no se importa como PNG**: `src/renderer/src/components/Brand.tsx`
lo redibuja en SVG inline con `currentColor`, así hereda el color del texto y respeta los
tokens en cualquier fondo.

Para comparar conceptos hay un `icon-preview.html` en la raíz (ignorado por git): se abre en
cualquier navegador y muestra los tres bocetos a 16, 32, 48, 128 y 256 px sobre fondo claro y
oscuro. Los dos descartados siguen ahí por si conviene cambiar de rumbo.

## Versiones y actualizaciones

La app se distribuye como instalador de Windows (NSIS, por usuario, sin permisos de
administrador):

```bash
npm run build:win   # arma dist/versiculos-iebvp-<version>-setup.exe
npm run release     # lo mismo y además publica la release en GitHub
```

`npm run release` necesita un `GH_TOKEN` con permiso de escritura sobre este repositorio y sube
solo el instalador, su `.blockmap` y `latest.yml`, con el texto de `build/release-notes.md` como
descripción de la release.

Ojo con la diferencia entre **tag** y **release**: el tag es un puntero a un commit y GitHub le
cuelga siempre un «Source code (zip)» automático; la release es lo que lleva el `.exe`. Se puede
publicar una release sobre un tag que ya existe, sin cambiar de versión. `latest.yml` tiene que
estar sí o sí entre los assets: es el archivo que consulta el actualizador.

Dentro de la app, `electron-updater` revisa si hay versión nueva al arrancar y cada 30 minutos.
La descarga arranca sola en segundo plano; el pie del panel lateral muestra el progreso y,
cuando termina, aparece un botón **Instalar vX.Y.Z** en la barra de título que reinicia la app
sobre la versión nueva. Si el operador no lo toca, la actualización se aplica sola la próxima
vez que cierre la app. En desarrollo el actualizador queda inactivo: solo corre empaquetado.

El número de versión sale de `package.json` y se muestra al pie del panel lateral, debajo del
crédito. Para publicar una versión nueva: subir `version` en `package.json`, `npm run release`
y listo — las apps instaladas la levantan solas.

> El repositorio es privado. Mientras lo sea, la release solo la puede bajar quien tenga acceso
> y el actualizador automático no va a poder consultar GitHub desde las máquinas de los
> usuarios: para que funcione de verdad hay que pasarlo a público.

## Fuera de alcance por ahora

Tests automatizados, instaladores de macOS y Linux, y firma de código: el instalador de Windows
sale sin firmar, así que SmartScreen va a avisar la primera vez.
