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

`npm run build` corre el typecheck y compila los tres procesos. El empaquetado (installer)
todavía no está configurado: es fase 2.

En el primer arranque la app abre el **wizard de primer uso**. Si OBS no está corriendo, el
botón _Configuración_ de la barra de título sale del wizard y deja la app en la pantalla
principal, en estado desconectado: buscar versículos funciona sin OBS, solo emitir requiere
conexión.

### Atajos

| Tecla          | Acción                                                           |
| -------------- | ---------------------------------------------------------------- |
| `Enter`        | buscar la referencia escrita                                     |
| `Ctrl + Enter` | sacar al aire                                                    |
| `Esc`          | volver a la escena anterior                                      |
| `↑` `↓`        | recorrer la cola del culto (si hay algo al aire, cambia en vivo) |
| `Tab`          | aceptar el nombre del libro que la app completó sola             |

## Durante el culto

**Buscar.** El campo entiende abreviaturas (`jn 3 16`), referencias completas
(`Juan 3:16-18`), rangos y capítulos enteros (`salmo 23`, `1co 13`). Mientras se escribe el
nombre de un libro, en cuanto lo tipeado deja una sola opción posible la app completa el resto
resaltado: `salm` se convierte en `Salmos` y basta seguir escribiendo el capítulo. `Tab`,
`espacio` o `→` aceptan la sugerencia; `Backspace` la descarta.

**Cola del culto.** Cada referencia que se resuelve entra en la cola. La `×` de cada fila la
quita, _vaciar_ borra la cola entera (pide confirmación) e _importar_ abre un cuadro donde
pegar la lista que pasa el pastor: una referencia por línea, admite viñetas (`-`, `•`) y
numeración (`1.`, `2)`). Al confirmar informa cuántas entraron, cuántas ya estaban y cuáles no
pudo resolver.

**Cambiar de versículo.** Las flechas `‹` `›` sobre el preview recorren la cola. Si hay algo al
aire, la flecha cambia el versículo **en vivo**: sale el actual y entra el siguiente, sin tocar
la escena de OBS. Las mismas flechas del teclado (`↑` `↓`) hacen lo mismo.

**Historial.** Arranca colapsado para no comerse la columna; se abre desde su encabezado y
tiene un _limpiar_.

**Pasajes largos.** Si el texto no entra en las seis líneas del overlay, aparece un aviso ámbar
con cuántas líneas ocupa y un botón que recorta la cita a lo que sí entra. Es un aviso, no un
bloqueo: partir la cita sigue siendo decisión del operador.

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
     `http://localhost:4780/overlay.html?live=1`.

   Si la escena ya existe a mano, se puede elegir de la lista en lugar de crearla.

4. Elegir qué hace **VOLVER**: restaurar la escena que estaba activa antes de emitir (default)
   o ir siempre a una escena fija. La escena de retorno se captura en el momento de emitir, así
   que conviene sacar el versículo al aire desde la escena del culto y no desde la del versículo.

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
    │   └── overlay/server.ts  express + websocket
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

Secuencia de emisión: la app pushea el versículo al overlay todavía oculto, guarda la escena
que estaba activa, cambia la escena en OBS y recién 120 ms después dispara la entrada. VOLVER
hace la salida (280 ms) y después restaura la escena. Cambiar de versículo estando al aire
hace salida completa y después entrada, nunca reemplazo en caliente.

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
  cortas). El texto agregado va seleccionado, así que seguir escribiendo lo reemplaza.
- **Controles agregados a la cola** (`×` por fila, _vaciar_, _importar_) y **flechas sobre el
  preview**: no están en el bundle de diseño, pero usan sus componentes y tokens. Las flechas
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

## Fuera de alcance por ahora

Empaquetado e installer con electron-builder, auto-update y tests automatizados: fase 2,
después de validar el MVP a mano contra OBS.
