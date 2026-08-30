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
| `Enter`        | buscar la referencia escrita (si hay algo al aire, además la saca al aire)                                       |
| `Ctrl + Enter` | sacar al aire                                                                                                    |
| `Ctrl + F`     | ir al buscador desde donde sea: cierra Configuración, enfoca el campo y selecciona lo que había                  |
| `Esc`          | volver a la escena anterior                                                                                      |
| `↑` `↓`        | recorrer la cola del culto (si hay algo al aire, cambia en vivo); dentro de la lista de libros, moverse por ella |
| `Alt + ←` `→`  | recorrer los versículos del capítulo (si hay algo al aire, cambia en vivo)                                       |

Los atajos de navegación (`Esc`, `↑` `↓`, `Alt + ←` `→`) se desactivan mientras se escribe en el
cuadro de importar o en un desplegable, así que pegar una lista o elegir versión con el teclado
ya no dispara nada al aire. `Ctrl + F` sigue funcionando siempre: es justamente la salida.

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

Un **clic** en una fila la trae al preview y, si ya hay algo al aire, la manda al aire en el
acto. Es el camino corto cuando el pastor saltea el orden de la lista: antes había que traerla
al preview y recién ahí apretar AL AIRE. Con nada al aire el clic solo llena el preview, para
que no se arranque una emisión sin querer. Clickear la fila que ya está al aire no hace nada:
no re-emite ni reinicia el reloj de emisión.

**Buscar estando al aire.** Si hay algo al aire, resolver una referencia la manda al aire en el
mismo gesto: `Enter` en el buscador, elegir del navegador de libros o aceptar el recorte del
aviso de pasaje largo emiten directo, además de dejar la referencia en la cola. Con nada al aire
el comportamiento es el de siempre: cae en el preview y espera el AL AIRE.

**Cambiar de versículo.** Hay dos ejes, y cada flecha dice a dónde lleva antes de tocarla.

- Las flechas `‹` `›` **sobre el preview** recorren la cola, con la referencia de la fila
  vecina arriba de cada una. Las mismas flechas del teclado (`↑` `↓`) hacen lo mismo.
- La barra **debajo del preview** recorre los versículos del capítulo que está en pantalla:
  a la izquierda el anterior, a la derecha el siguiente, con la referencia exacta arriba de
  cada flecha y en el medio el capítulo y cuántos versículos tiene. `Alt + ←` y `Alt + →` son
  el atajo. Cuando se llega al principio o al final del capítulo la flecha se apaga y avisa
  _Principio del capítulo_ / _Final del capítulo_: la barra no salta de capítulo.

En los dos casos, si hay algo al aire la flecha cambia el versículo **en vivo**: sale el actual
y entra el siguiente, sin tocar la escena de OBS. El paso respeta el largo de la cita: desde
`Juan 3:16` el siguiente es `Juan 3:17`, y desde `Juan 3:16-18` es `Juan 3:19-21`. Los
versículos que se van recorriendo entran en la cola como cualquier otra referencia, así que
después se puede volver a ellos con `↑` `↓`.

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

## Tamaño de ventana y modo compacto

La ventana arranca en 1100 × 720 y se puede achicar hasta **360 × 240**. La interfaz se adapta
sola: el preview deja de ser una caja fija de 614 px y escala con el espacio que queda —se mide
el hueco real y se usa el menor entre el ancho y el alto disponibles, así que nunca se corta—,
los atajos del pie se ocultan cuando no hay alto, y los textos de la barra de título se acortan
antes de que algo se desborde.

**La cola queda a la derecha hasta bien abajo.** La PC de la iglesia tiene que mostrar OBS,
YouTube y esta app en la misma pantalla, así que la ventana termina en unos 750 px de ancho y
ahí la cola del culto sigue siendo lo más útil que hay al costado. La columna se angosta en dos
pasos (232 px y después 204 px, sin el número de orden y con el encabezado abreviado a _COLA_)
y recién desaparece abajo de 560 px, donde ya no entra nada al lado del preview.

Para el vivo hay además un **modo compacto**, el botón _Compacto_ de la barra de título. La
ventana pasa a 420 × 244 pegada a donde estaba su borde derecho y deja solo lo que se usa con el
culto en marcha:

- el campo de búsqueda, que es el mismo de la pantalla grande: completa el nombre del libro
  cuando queda uno solo posible, despliega la lista cuando quedan varios y resuelve con `Enter`;
- las flechas `‹` `›` para recorrer la cola, con la referencia actual en el medio y la de la
  fila vecina en el globo de cada flecha;
- los dos botones de versículo del capítulo (`‹ Juan 3:15` / `Juan 3:17 ›`), que aparecen solo
  cuando hay un capítulo por recorrer y se ocultan solos abajo de 236 px de alto, donde el
  espacio ya es para AL AIRE;
- **AL AIRE** y **VOLVER**, que crecen si se agranda la ventana.

Debajo de AL AIRE queda la misma línea de estado que en la pantalla grande, así que si el botón
está gris se ve por qué: _Requiere OBS_ cuando no hay conexión, _Sin versículo_ cuando todavía no
se resolvió ninguna referencia.

Los atajos siguen funcionando igual (`Ctrl + Enter`, `Esc`, `↑` `↓`), el borde rojo de _al aire_
sigue estando y el reloj de emisión queda en la barra de título. _Ampliar_ vuelve al tamaño y a
la posición que la ventana tenía antes. En compacto la ventana se puede achicar hasta 320 × 190.

El modo no se guarda entre sesiones: la app siempre abre en tamaño normal.

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
    │   ├── timing.ts          medición de los pasos del vivo, solo sin empaquetar
    │   └── window.ts          tamaños de la ventana y modo compacto
    ├── preload/               contextBridge → window.versiculos
    ├── renderer/              React: principal, compacto, configuración y wizard
    │                          (el buscador con autocompletado es un componente compartido)
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
  Se agregó ese campo, que el diseño no tenía, porque la app lo necesita configurable. Si el
  puerto está ocupado la app prueba los diez siguientes y se queda con el primero libre, así
  que abrir la app dos veces —o tener otra cosa en el 4780— no la rompe.
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
- **Las flechas dicen a dónde llevan.** Tanto las de la cola como las del capítulo muestran la
  referencia destino en vez de un `‹` pelado: en vivo el operador necesita saber qué va a entrar
  **antes** de tocar, no después. Es la misma información que ya estaba en el `title`, subida a
  la pantalla.
- **La barra de versículos no salta de capítulo.** Al llegar al final la flecha se apaga en vez
  de seguir en el capítulo siguiente: el corte de capítulo casi siempre es un corte de lectura,
  y cruzarlo sin querer en vivo es peor que tener que escribir la referencia nueva.
- **El paso conserva el largo de la cita.** Desde `Juan 3:16-18` el siguiente es `Juan 3:19-21`,
  no `Juan 3:19`: si el operador eligió mostrar tres versículos por pantalla, seguir leyendo es
  seguir de a tres. En el borde del capítulo el rango se recorta a lo que queda.
- **Los versículos recorridos entran en la cola.** Es la misma regla que rige para todo lo que
  se resuelve, y mantiene coherente la posición de `↑` `↓`. Una lectura larga deja varias filas,
  que se sacan con `vaciar` o con la `×` de cada una.
- **`Alt + ←` `→` y no `←` `→` a secas.** Las flechas peladas mueven el cursor dentro del campo
  de búsqueda, que está enfocado casi todo el tiempo; tomarlas rompería escribir una referencia.
  `↑` `↓` ya estaban tomadas por la cola.
- **Buscar y clickear la cola emiten, pero solo si ya hay algo al aire.** Con la escena del
  versículo activa, lo que el operador resuelve o elige es lo que quiere mostrar, así que elegir
  y emitir son un gesto: un clic en la fila, sin doble clic ni pasar por el preview. Pero
  **arrancar** una emisión sigue siendo un acto explícito (AL AIRE o `Ctrl + Enter`): con nada
  al aire, el clic en la cola no prende la escena.
- **Nada se re-emite solo.** Si lo que se elige ya es lo que está al aire, la app no manda nada:
  evita el parpadeo de salida y entrada del overlay y no reinicia el reloj de emisión. AL AIRE
  apretado a mano sí re-emite siempre, que para eso es explícito.
- **Rangos entre capítulos** (`jn 3:16-4:2`) no están soportados: la app pide elegir un rango
  dentro de un mismo capítulo. Los cuatro formatos que el diseño imprime en pantalla sí lo están.
- **La interfaz es responsive y el bundle de diseño no lo es**: define una sola medida, la de
  1100 px. Los saltos son propios y salen de la pantalla real de la iglesia: 1080 y 900 px
  angostan la cola, 760 px achica los controles del buscador y saca el «capítulo · N versículos»
  del medio de la barra de versículos, 720 px saca los atajos y acorta las etiquetas de la barra
  de título, 700 px deja la cola en su ancho mínimo, 560 px la esconde, por alto 620 y 520 px
  comprimen las filas, y 236 px de alto —solo alcanzable en compacto— esconde los botones de
  versículo para no comerle lugar a AL AIRE. Ninguno inventa componentes: reusan los
  mismos tokens y clases, y a 1100 px la pantalla queda exactamente como el diseño. El **modo compacto** sí es una pantalla nueva, y usa los mismos
  botones AL AIRE y VOLVER del diseño en versión chica.
- **El modo compacto no se persiste.** Guardarlo obligaría a abrir la app en 420 px cuando el
  operador ya no se acuerda de haberlo dejado prendido; se prefiere que cada sesión arranque en
  tamaño normal y que el compacto sea una decisión del momento.
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
