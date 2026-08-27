Arregla el freezazo de OBS al apretar **AL AIRE**. Es una actualización recomendada para todas las máquinas que ya tengan la 1.0.0 instalada.

### Descarga

Bajá **`versiculos-iebvp-1.1.0-setup.exe`** y ejecutalo. Se instala para el usuario actual, sin permisos de administrador. Como el instalador no está firmado, Windows SmartScreen va a avisar la primera vez: _Más información → Ejecutar de todas formas_. Las apps que ya tienen la 1.0.0 la levantan solas: la descargan en segundo plano y ofrecen el botón **Instalar** en la barra de título.

### Qué se arregló

**La Browser Source queda siempre viva.** Si la fuente del overlay tenía tildado _Apagar la fuente cuando no esté visible_ o _Refrescar el navegador cuando la escena se active_, OBS levantaba el navegador embebido recién al cambiar de escena: cargaba la página, abría el websocket y bajaba las fuentes justo durante la transición, y eso era el freezazo. La app ahora apaga esos dos tildes cada vez que se conecta a OBS, sin tocar el resto de la configuración de la fuente.

**El versículo se manda en el preview, no en el click.** El overlay recibe el pasaje apenas aparece en el preview y lo pinta oculto, así que el texto, el salto de línea y las fuentes ya están resueltos antes de emitir. Apretar AL AIRE ahora es solo _mostrar_ + cambio de escena: pasó de ~123 ms a ~1 ms del lado de la app.

**Menos trabajo en el camino del click.** La escena a la que vuelve VOLVER sale de un cache que alimentan los eventos de OBS en lugar de un pedido en el momento, los ajustes se leen de memoria en vez del disco, y ni AL AIRE ni VOLVER esperan más a un temporizador para contestar.

**Overlay más liviano.** Anima solo `opacity` y `transform`, precarga las fuentes al abrir la página y no mide ni fuerza layout en el momento de aparecer. La animación es la misma de siempre.

### Sin cambios

Búsqueda, cola, historial, navegador de libros, versiones y el diseño del overlay quedan igual que en la 1.0.0.
