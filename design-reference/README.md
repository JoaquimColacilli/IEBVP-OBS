# Versículos — referencia de diseño

Bundle estático de diseño para la app del operador y el overlay del stream. No hay build step: se abre cualquier `.html` en un navegador. Los datos están hardcodeados; no hay lógica real (ni OBS, ni parser, ni server).

```
design-reference/
├── README.md
├── tokens.css                          variables: color, tipografía, espaciado, radios, sombras, timings
├── app/
│   ├── 01-principal-desconectado.html  sin conexión a OBS + CTA
│   ├── 02-principal-conectado.html     conectado, sin búsqueda
│   ├── 03-principal-preview.html       preview listo para emitir
│   ├── 04-principal-al-aire.html       AL AIRE activo (tally)
│   ├── 05-principal-sin-resultados.html búsqueda sin coincidencias
│   ├── 06-configuracion.html
│   └── 07-wizard.html                  primer uso, 3 pasos apilados
└── overlay/
    └── overlay.html                    canvas 1920×1080 + estados + animación
```

Cada pantalla de `app/` es autocontenida: importa `../tokens.css` y lleva el CSS de componentes en su `<style>`. Al implementar la app real, ese CSS se unifica en una hoja compartida; `tokens.css` pasa tal cual.

## Principios

1. **El estado al aire nunca se deduce.** Cuando algo está emitiendo, cuatro señales redundantes lo dicen a la vez: marco rojo (tally) en toda la ventana, badge rojo en la barra de título con cronómetro, botón principal en rojo, y la fila de la cola marcada. El rojo aparece solo en ese estado.
2. **Un solo camino.** Buscar → revisar preview → emitir → volver. Nada compite con esa columna.
3. **Teclado primero.** Los tres atajos están impresos en la UI, siempre en el mismo lugar (pie del área principal).
4. **Preview fiel.** El preview es el overlay real a escala 0.32 con el mismo CSS y la misma tipografía, no una aproximación.
5. **Todo offline.** Ninguna pantalla depende de red para funcionar (ver *Tipografía* para el caso de las fuentes).

## Paleta

Base clara y cálida. Un solo acento (clay) para foco, selección y acciones de configuración. Semánticos: sage = correcto, amber = atención, rojo = al aire.

| Token | Hex | Uso |
| --- | --- | --- |
| `--c-desk` | `#EAE2D4` | fondo detrás de la ventana (solo en esta referencia) |
| `--c-paper` | `#F6F2E9` | fondo de la ventana |
| `--c-surface` | `#FFFDF9` | barra de título, panel lateral, tarjetas, campos |
| `--c-surface-sunk` | `#F0EADD` | controles deshabilitados, bloques mono |
| `--c-ink` | `#241F19` | texto principal, botón primario |
| `--c-ink-2` | `#564C40` | texto secundario |
| `--c-ink-3` | `#8A7E6D` | texto terciario, placeholders, iconografía |
| `--c-line` | `#E4DBCB` | separadores internos |
| `--c-line-strong` | `#CFC4AF` | borde de campos y botones |
| `--c-clay` / `-deep` / `-soft` / `-line` | `#A9714F` `#8B5A3C` `#F5E8DD` `#E3CDB9` | acento: foco, chip de referencia resuelta, fila seleccionada, paso activo del wizard, enlaces |
| `--c-sage` / `-soft` / `-line` | `#5F7A5C` `#E7EEE3` `#CBD9C4` | conexión OK, versión predeterminada, paso completado |
| `--c-amber` / `-soft` / `-line` | `#9A6B21` `#F7ECD8` `#E6D2AE` | desconectado, advertencias |
| `--c-live` / `-deep` / `-soft` / `-line` | `#C33A2E` `#9E2A20` `#FBE7E3` `#EFC4BD` | **exclusivo del estado al aire** |
| `--c-ov-bg` | `#F7F3EA` | fondo del overlay (opaco, no transparente) |
| `--c-ov-ink` | `#211D17` | texto del versículo |
| `--c-ov-ref` | `#8A7B66` | versión y numeración de versículos |
| `--c-ov-muted` | `#A2957F` | línea de copyright |
| `--c-ov-line` | `#DED3BF` | rombo separador |

Regla: ningún componente usa `--c-live*` fuera del estado al aire. El estado desconectado usa amber justamente para no confundirse con tally.

## Tipografía

- UI: **IBM Plex Sans** (`--font-sans`), fallback `Segoe UI` en Windows.
- Versículo: **Spectral** (`--font-serif`), fallback `Georgia`.
- Datos técnicos, horas, atajos, URLs: **IBM Plex Mono** (`--font-mono`), fallback `Consolas`.

Las pantallas cargan las fuentes desde Google Fonts solo para revisar el diseño. **En la app real hay que empaquetar los `.woff2` y declararlos con `@font-face` local**, porque el overlay corre sin internet dentro de OBS y el fallback a Georgia cambia el ritmo del texto. Pesos necesarios: Plex Sans 400/500/600, Plex Mono 400/500, Spectral 400.

Escala UI (px, tokens `--fs-0` … `--fs-7`): 11, 12, 13, 14, 16, 18, 22, 28.
`--fs-0` se usa solo en mayúsculas con tracking (`--tr-caps` .18em) o en mono. Cuerpo de UI: 13. Campo de búsqueda: 22. Título de sección: 28 en serif.

Escala del overlay (1920×1080): versículo 88 / 72 / 52 / 42, referencia 28, copyright 20. Line-height 1.32 en los dos tamaños grandes y 1.42 en los dos chicos.

### Auto-ajuste tipográfico del overlay

Un atributo `data-fit` en el contenedor elige el escalón según el largo del texto renderizado. Los umbrales están calibrados para que nunca haya más de 6 líneas ni menos de 2 palabras huérfanas, con medida fija de 1500 px:

| `data-fit` | Tamaño | Se usa cuando |
| --- | --- | --- |
| `s` | 88 px | hasta 90 caracteres |
| `m` | 72 px | 91 – 260 caracteres |
| `l` | 52 px | 261 – 620 caracteres |
| `xl` | 42 px | más de 620 caracteres |

La app calcula el escalón por largo de string antes de emitir (no hay medición en el DOM del overlay). Si un pasaje supera las 6 líneas en `xl`, se corta la emisión en dos citas: es decisión editorial del operador, no del overlay.

## Espaciado, radios, sombras

Espaciado: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48 (`--sp-1` … `--sp-10`). Padding del área principal y del panel lateral: 20 / 16. Separación entre bloques de la columna principal: 16.

Radios: 4 (chips mono, badges), 6 (botones y campos de formulario), 10 (campos grandes, tarjetas, preview, botones de acción), 14 (ventana), pill (estados y chips).

Sombras: `--sh-sm` en campos, `--sh-md` en preview y barra de revisión, `--sh-window` en la ventana (solo en esta referencia). Foco: `--ring-focus` (3 px clay soft) sobre borde clay. Al aire: `--ring-live` (4 px live soft).

## Layout de la app

Ventana 1100×720, redimensionable. Barra de título propia de 44 px (Electron con frame oculto): wordmark tipográfico placeholder, estados a la derecha, acceso a Configuración y controles de ventana.

Cuerpo en dos columnas: principal fluida + panel lateral fijo de 320 px. Al redimensionar, el panel lateral mantiene 320 px y la columna principal absorbe la diferencia; el preview se mantiene centrado con escala fija 0.32 hasta 1100 px de ancho y escala proporcionalmente por encima. Mínimo recomendado de ventana: 980×640 (por debajo, el panel lateral se colapsa a un botón de la barra de título; no está diseñado acá porque no se pidió).

Orden vertical de la columna principal, siempre el mismo: banner de sistema (solo si aplica) → búsqueda → referencia resuelta → preview → acciones → atajos.

## Componentes y estados

**Campo de búsqueda** — 52 px de alto, texto 22 px. Placeholder con ejemplo real (`jn 3 16`). Indicador `Enter` en mono a la derecha. Foco: borde clay + ring. Recibe el foco al abrir la app y después de cada emisión. Nunca se deshabilita, tampoco sin OBS: buscar es local.

**Selector de versión** — pegado a la derecha del campo, mismo alto. Cambiar la versión re-renderiza el preview sin perder la referencia.

**Referencia resuelta** — fila de 24 px bajo la búsqueda. Chip clay con `Libro Capítulo:Versículo · VERSIÓN` cuando hay match; texto terciario con la instrucción o el error cuando no.

**Preview** — 614×345 (1920×1080 × 0.32), borde `--c-line-strong`, etiqueta `PREVIEW` arriba a la izquierda. Al aire: borde y etiqueta rojos + ring. Estado reposo: el fondo del overlay vacío, sin texto.

**AL AIRE** — 76 px de alto, ocupa el ancho restante. Tres estados: deshabilitado (sin OBS o sin versículo, con la razón en la línea inferior), listo (ink sólido, atajo `Ctrl + Enter` abajo), al aire (rojo, punto pulsante 1.4 s, referencia emitida en la línea inferior). Nunca se convierte en "quitar del aire": eso es VOLVER.

**VOLVER** — 208 px, mismo alto. Secundario mientras no hay nada al aire; se vuelve primario (ink sólido) cuando algo está emitiendo. Atajo `Esc`.

**Estado de conexión** — pill siempre visible en la barra de título: sage conectado, amber desconectado. Al aire se le suma un segundo pill rojo con cronómetro en mono; el pill de conexión no desaparece.

**Banner de sistema** — solo en desconectado: amber, una línea, con la consecuencia explícita ("podés buscar, no podés emitir") y CTA a Configuración.

**Cola del culto** — lista numerada, precargada antes del culto. Fila seleccionada: fondo clay soft + barra clay de 3 px a la izquierda. Fila al aire: fondo live soft + barra roja + marca `al aire`. Navegación con flechas, `Enter` la manda al preview.

**Historial** — misma lista visual, sin numeración, con hora de emisión en mono a la derecha. Orden: lo último emitido arriba.

**Atajos** — `Enter` buscar, `Ctrl + Enter` al aire, `Esc` volver. Impresos al pie del área principal en todas las pantallas principales.

**Configuración** — documento de una columna dentro de la misma ventana, tarjetas por tema, vuelta a la principal con el botón de la esquina. El botón *Probar conexión* deja el resultado a su derecha como pill (versión de OBS y de obs-websocket cuando es exitoso).

**Wizard de primer uso** — los tres pasos apilados en una página, con los tres estados visibles a la vez: completado (número → check, marco normal, sage), activo (círculo clay, marco clay + ring), pendiente (opacidad 0.72, acción deshabilitada). No hay navegación entre pasos: se avanza resolviendo el paso activo.

## Overlay

Canvas 1920×1080 con fondo opaco `--c-ov-bg` (el fondo claro es parte del overlay; la Browser Source no usa transparencia). Composición centrada, medida de texto 1500 px: versículo en serif → separación de 60 px → línea de referencia en sans mayúscula con tracking .18em (`REFERENCIA ◆ VERSIÓN`) → copyright anclado a 64 px del borde inferior.

`overlay.html` incluye una barra de revisión con los cuatro estados y la animación (teclas `1`–`4`, `Espacio`). **Con `?live=1` la barra desaparece**: esa es la URL que va en la Browser Source de OBS.

### Contrato para la implementación

El overlay no tiene lógica propia. La app cambia el contenido y agrega o quita clases:

- Contenido: `#verse` (innerHTML, permite `<span class="ov-num">` para números de versículo en pasajes), `#ref`, `#ver`, `#credit` (textContent).
- Escalón tipográfico: `data-fit="s|m|l|xl"` en `.ov`.
- Entrada: setear contenido y luego agregar `.is-visible`.
- Salida: quitar `.is-visible` y agregar `.is-leaving` durante la transición; quitarla al terminar.
- Reposo: sin `.is-visible`. Queda el fondo claro solo, listo para la siguiente cita sin flash.

El cambio de un versículo a otro estando al aire hace salida completa y después entrada, nunca reemplazo en caliente: el corte de texto a mitad de fade se lee como error.

### Timings

| Token | Valor | Qué hace |
| --- | --- | --- |
| `--ov-in-dur` | 420 ms | fade + subida de 14 px del bloque de texto, `--ease-out` (`cubic-bezier(.22,.61,.36,1)`) |
| `--ov-stagger` | 80 ms | retardo de la línea de referencia y del copyright respecto del versículo |
| `--ov-out-dur` | 280 ms | salida, `--ease-in` (`cubic-bezier(.4,0,.7,.2)`); sin retardos y sin desplazamiento |
| `--ov-rise` | 14 px | desplazamiento inicial del bloque de texto |

Secuencia de emisión completa: la app cambia la escena en OBS y recién ahí dispara la entrada, con 120 ms de margen para que la transición de OBS ya esté en curso. Total percibido hasta texto legible: ~600 ms. La salida (280 ms) termina antes de que OBS vuelva a la escena anterior.

## Decisiones tomadas

- **El botón AL AIRE no es rojo hasta estar al aire.** El rojo es información de estado, no decoración de un botón; si el botón fuera rojo siempre, el tally perdería significado. Antes de emitir es ink sólido, el elemento de más contraste de la pantalla.
- **Cola e historial en la misma columna, apilados, sin tabs.** Durante el vivo el operador no debería tener que elegir una pestaña para ver lo que necesita. La cola es corta por naturaleza (5–8 citas por culto).
- **Sin resultados no vacía el preview.** El panel de error ocupa el lugar del preview y ofrece candidatos clicables; el último versículo emitido sigue disponible en el historial.
- **Buscar funciona sin OBS.** El operador puede preparar la cola antes de abrir OBS. Solo la emisión requiere conexión.
- **El wizard no navega.** Tres pasos a la vista, uno activo: el operador ve de entrada todo lo que la app va a hacer en su OBS antes de autorizarla.
- **Un solo acento cálido (clay).** Con sage, amber y rojo semánticos ya hay cuatro colores en pantalla; agregar un segundo acento decorativo volvería ruidosa una UI que se mira de reojo.
- **El preview es el overlay real a escala**, no una maqueta: cualquier cambio de tipografía en el overlay se ve en la app sin trabajo extra.
- **Cronómetro de aire en mono.** Números que cambian en fuente proporcional bailan; en mono el badge no se mueve.
- **Puerto del overlay `7411` en los ejemplos.** Placeholder; la app real debería tomar el primer puerto libre y mostrarlo en Configuración.

## Fuera de alcance de este bundle

No hay modo oscuro, versión mobile, ni pantallas más allá de las siete listadas. No hay parser de referencias, conexión a OBS, base de datos ni server local: los estados están hardcodeados con datos reales de ejemplo (RVR1960) para que se puedan comparar lado a lado.
