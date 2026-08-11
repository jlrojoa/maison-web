# Configurador v2 — layout sticky + pasos colapsables (Camas / Sofás e Individuales / Escuadras / Chaise Lounge)

## Objetivo

Rediseñar el configurador para las 4 categorías con modelos reales (Camas, Sofás e Individuales, Escuadras, Chaise Lounge) según `maison-configurador-v2.html`: imagen sticky que nunca sale del viewport en desktop, pasos numerados en tarjetas colapsables (clic en el header colapsa/expande), y para Camas específicamente un flujo de selección en dos niveles — Familia (7 tarjetas con foto real) → Cabecera/Pata como chips que se desactivan (no desaparecen) según exista o no esa combinación.

Modulares, Mesas y Butacas (0 productos cargados hoy, sin fecha para tener) **no se tocan** — siguen con el layout actual.

## Alcance y decisiones ya tomadas

- **Categorías que reciben el layout nuevo**: Camas (flujo completo con Familia/Cabecera/Pata), Sofás e Individuales / Escuadras / Chaise Lounge (mismo layout sticky+colapsable, sin el paso de Familia/Cabecera/Pata — solo Modelo/Tamaño/Tela). Modulares/Mesas/Butacas quedan con el código y layout viejos, sin ningún cambio.
- **Sin candados en las 4 categorías**: todos los pasos (Familia/Cabecera/Pata/Tamaño/Tela en Camas; Modelo/Tamaño/Tela en las otras 3) arrancan con un valor por defecto ya elegido — imagen y precio (si hay sesión de distribuidor y precio cargado) visibles desde que entras. Cada tarjeta se colapsa/expande solo manualmente, al hacer clic en su header. No hay `disabled` progresivo como en el configurador actual.
- **Sin barra de pestañas de categoría**: se sigue entrando por Colecciones o por el Paso 0 actual (elegir categoría) dentro del propio Configurador. No se agrega la segunda barra sticky del mockup.
- **Precios**: hoy `producto_precios` está vacío para las 24 camas y también para los productos de Sofás/Escuadras/Chaise Lounge que probé — la barra de precio va a mostrar "Precio no disponible" en la mayoría de combinaciones hasta que se carguen precios reales desde el admin. Esto es esperado, no es un bug del configurador.

## Verificado en la base antes de diseñar esto

- Camas tiene 24 productos, y cada uno es una fila distinta de `productos` con columnas `familia`/`cabecera`/`pata` ya pobladas. Por familia, el cruce cabecera×pata es siempre completo (producto cartesiano), nunca parcial — ej. Alejandra: 4 cabeceras × 2 patas = 8 productos; Pont/Odisey: 1 cabecera × 1 pata = 1 producto. Esto significa que la disponibilidad de chips se calcula sacando los valores distintos de cabecera/pata entre los productos de la familia — no hace falta una matriz manual como en el mockup de demo.
- Ningún producto (de ninguna categoría) tiene filas en `producto_precios` todavía.
- `productos.isometrico_url` es `null` en las 24 camas — las fotos reales viven en `producto_imagenes` (importadas de Shopify, patrón fijo de 3 ángulos × 4 tamaños por producto en las familias con fotografía real; algunas familias solo tienen 1 foto genérica).
- Sofás e Individuales tiene 4 productos, Escuadras 6, Chaise Lounge 8.

### Fotos de las 7 familias: no coinciden en tela/color (verificado bajando y mirando las 7)

Bajé la imagen `es_principal` de los 7 productos "Liso + Estándar" (uno por familia) y las comparé una por una. **No hay ninguna tela/color en común**:

| Familia | Tela/color real de la foto |
|---|---|
| Alejandra | Gris grafito oscuro |
| Cuadro 10 | Gris claro |
| Home | Azul marino |
| Make | Verde salvia / gris texturizado |
| Odisey | Beige/crema — además es un render de IA distinto (ángulo 3/4, fondo de estudio blanco) en vez de foto de catálogo frontal con fondo transparente como las otras 6 |
| Polo | Gris grafito oscuro (similar a Alejandra, posible misma tela física) |
| Pont | Gris claro (similar a Cuadro 10, posible misma tela física) |

A lo mucho hay 2 pares que podrían coincidir (Alejandra/Polo en gris oscuro, Cuadro 10/Pont en gris claro), pero Home, Make y Odisey son claramente distintos entre sí y de esos pares. Y esto no es un problema que el código pueda resolver solo: el modelo de fotografía actual (heredado de la importación de Shopify) no tiene ninguna foto por combinación de tela/color — cada producto fue fotografiado una sola vez, con una sola tela física, sin importar qué tela elija el usuario en el selector (esto ya está documentado como limitación conocida en un comentario del propio `Configurador.jsx`: las fotos solo cambian por tamaño, nunca por tela). No existe, en los datos de hoy, una foto de "Home" o "Make" en gris grafito para poder igualarlas a Alejandra.

**Decisión para el spec**: ya que no se puede lograr coincidencia de tela real con las fotos que hay (haría falta una sesión de fotografía nueva — tarea de contenido, no de código), las 7 tarjetas de Familia aplican un tratamiento visual uniforme — **escala de grises** (`filter: grayscale(1)` sobre la imagen, únicamente en las tarjetas de Familia) — para que ninguna tela llame más la atención que otra y la comparación quede genuinamente en la silueta/diseño de cada cabecera, que es el punto no negociable. El resto del configurador (visor grande, galería) sigue mostrando las fotos a color real, sin este filtro — el escala de grises es solo para el picker de 7 tarjetas.

## Arquitectura

`Configurador.jsx` sigue siendo el punto de entrada: mantiene el Paso 0 (elegir categoría) y la carga de `productos` por categoría, sin cambios en esa parte. El JSX y estado del flujo actual (Modelo→Medida→Tela→Resumen, con sus modales) **se dejan intactos dentro del mismo archivo**, solo que ahora se renderiza condicionalmente:

```
tipoSel === null            → Paso 0 (sin cambios)
tipoSel.slug === 'camas'                              → <CamasConfigurador />
tipoSel.slug en ['sofas','escuadras-l','chaise-lounge'] → <GenericStickyConfigurador />
cualquier otra categoría (o ninguna de las anteriores)  → JSX legado actual, sin tocar
```

Se elige duplicar en vez de refactorizar el flujo legado hacia los hooks nuevos — así Modulares/Mesas/Butacas (y cualquier categoría futura sin familia/cabecera/pata) quedan con cero riesgo de romperse por este cambio.

### Archivos nuevos

```
src/pages/configurador/
  useProductoConfig.js       hook: tamaños, telas, galería, precio de UN producto
  useCotizacion.js           hook: modal Crear cotización / Guardar borrador
  StepCard.jsx               tarjeta numerada colapsable
  StickyViewer.jsx           columna de imagen sticky + tira de miniaturas
  CotizacionModal.jsx        el modal (extraído tal cual del legado)
  CamasConfigurador.jsx      Familia → Cabecera → Pata → Tamaño → Tela
  GenericStickyConfigurador.jsx   Modelo → Tamaño → Tela
  ConfiguradorSticky.css     estilos del layout nuevo (prefijo cfg2-)
```

`Configurador.css` (legado) no se toca; los componentes nuevos importan `ConfiguradorSticky.css` en su lugar.

### `useProductoConfig(producto)`

Dado un producto (con `id` e `isometrico_url`), reemplaza el bloque de efectos que hoy vive inline en `Configurador.jsx` (líneas ~88–134), con la diferencia de que **todo arranca con un default** en vez de `null`:

- Carga `producto_configuraciones` (tamaños), `telas`+`tela_colores`, `producto_imagenes` al cambiar `producto.id`.
- `medidaSel`: default = primer tamaño (por `orden`).
- `gradoSel`: default `'AA'` si existe tela de ese grado para el producto, si no el primer grado con tela disponible.
- `telaSel`: default = primera tela del grado elegido.
- `colorSel`: default = primer color de esa tela (**cambio respecto al legado**, que hoy arranca en `null` — acá hace falta un color por defecto para que precio/CTA estén listos sin que el usuario toque nada).
- `activeImgUrl`: default = `producto.isometrico_url` si existe, si no la primera imagen de la galería.
- Efecto aparte: cuando hay `distribuidor` + `producto` + `medidaSel`, carga `producto_precios` y calcula `precioLookup` (por `telaSel.grado`), igual que hoy.
- Expone setters (`setMedidaSel`, `setGradoSel`, `setTelaSel`, `setColorSel`, `setActiveImgUrl`) que reencadenan los defaults dependientes (cambiar grado recalcula tela+color default; cambiar tela recalcula color default) — mismo comportamiento que ya existe hoy para grado/tela.

### `useCotizacion(distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup)`

Extracción 1:1 de la lógica de `cotizModo`/`cotizForm`/`cotizSaving`/`cotizResultado`/`puedeGuardar`/`abrirCotizModal`/`confirmarCotizacion` que ya existe en `Configurador.jsx` (líneas ~140–200), parametrizada. Mismas tablas (`cotizaciones`, `cotizacion_items`), misma RPC `emitir_cotizacion`. Sin cambios de comportamiento, solo de ubicación.

### `StepCard`

```
<StepCard number={1} title="Familia" value={familiaSel} defaultOpen>
  {/* contenido del paso */}
</StepCard>
```

Estado local de colapsado/expandido (`useState(!defaultOpen)`), todas las tarjetas arrancan expandidas (`defaultOpen` por defecto `true`) — igual que el mockup, donde el usuario colapsa manualmente lo que ya terminó de ajustar. El header muestra número, título, valor actual (texto) e ícono de editar; clic en cualquier parte del header alterna colapsado.

### `StickyViewer`

Columna sticky (`position: sticky; top: <altura del Nav>`) con la imagen grande + la tira de miniaturas debajo, reutilizando el mecanismo que ya existe hoy (`activeImgUrl` + clic en miniatura la cambia) — no se inventa un selector de ángulos con parsing de nombre de archivo; es la misma tira de thumbnails de siempre, solo reposicionada y con estilo nuevo.

**Comportamiento mobile (breakpoint 1080px, igual que el mockup):** por debajo de `1080px` de ancho, `StickyViewer` deja de ser sticky — `position: relative` normal, en flujo, arriba de los pasos. La imagen se sigue viendo completa (no se oculta ni se recorta), pero ya no se queda fija ocupando la pantalla mientras el usuario hace scroll por los pasos: sube junto con el resto de la página, como una foto normal al principio del artículo. Esto es intencional pensando en que los distribuidores cotizan bastante desde el celular en campo — una imagen fija tapando la mitad de la pantalla en un teléfono sería peor que no tener sticky. La barra de precio, en cambio, sí se mantiene fija en mobile: pasa de "sticky al fondo de la columna derecha" a `position: fixed` a todo lo ancho de la pantalla, abajo del todo, sin el margen lateral que tiene en desktop (igual que la regla `@media(max-width:1080px)` del mockup).

### `CamasConfigurador`

Props: `productos` (ya filtrados a categoría Camas por `Configurador.jsx`), `distribuidor`, `initialProducto` (opcional, resuelto desde `?modelo=` en la URL).

- `familias` = valores distintos de `producto.familia`, en el orden en que llegan de la query `productos` por categoría (no hace falta un `ORDER BY` especial). 7 tarjetas, cada una con foto real: se busca, por familia, el producto con `cabecera === 'Liso' && pata === 'Estándar'` (existe en las 7 familias verificado en la base; si alguna familia futura no lo tuviera, cae al primer producto de esa familia) y se le pide a `producto_imagenes` su imagen `es_principal` (una sola consulta por lote para las 7 al cargar `productos`, no una por tarjeta). Como esas 7 fotos no comparten tela/color (ver hallazgo arriba), la tarjeta de Familia le aplica `filter: grayscale(1)` a la imagen — así las 7 se comparan por diseño de cabecera, no por color, sin depender de fotografía nueva. Debajo del grid de 7 tarjetas va un texto pequeño: **"Vista de diseño — colores disponibles al seleccionar"**, para que no parezca que esas camas solo existen en gris (el color real se elige después, en el paso de Tela).
- `familiaSel`: default = `initialProducto?.familia` si vino por URL, si no la primera familia.
- `cabecerasDisponibles`/`patasDisponibles`: valores distintos de `cabecera`/`pata` entre los productos de `familiaSel` (se recalculan cada vez que cambia `familiaSel`). Los chips que no están en ese conjunto se muestran con estilo "off" (atenuados, tachados, no clicables) — nunca desaparecen.
- `cabeceraSel`/`pataSel`: default = los del `initialProducto` si vino por URL y siguen siendo válidos para la familia, si no el primer valor disponible. Si al cambiar de familia el valor actual deja de estar disponible, se corrige automáticamente al primero disponible (mismo comportamiento que la demo del mockup).
- `productoActivo` = `productos.find(p => p.familia===familiaSel && p.cabecera===cabeceraSel && p.pata===pataSel)` (por el cruce completo verificado en la base, siempre debería encontrar uno; si por algún dato futuro no lo encuentra, cae al primer producto de la familia).
- `useProductoConfig(productoActivo)` para Tamaño/Tela/galería/precio.
- Pasos: 1) Familia (grid de 7 tarjetas) 2) Cabecera (chips) 3) Pata (chips) 4) Tamaño (chips) 5) Tela (tabs de grado + swatches de color, igual que hoy pero dentro de una `StepCard`).
- `StickyViewer` a la izquierda, barra de precio fija abajo a la derecha, `CotizacionModal`.

### `GenericStickyConfigurador`

Props: `productos` (filtrados a la categoría), `distribuidor`, `initialProducto`.

- `modeloSel`: default = `initialProducto` si vino por URL, si no el primer producto de la lista.
- `useProductoConfig(modeloSel)` para Tamaño/Tela/galería/precio.
- Pasos: 1) Modelo (grid de tarjetas, igual que el Paso 1 actual pero sin `disabled`) 2) Tamaño (chips) 3) Tela (tabs de grado + swatches).
- Mismo `StickyViewer` + barra de precio + `CotizacionModal`.
- Si la categoría no tiene productos activos, se muestra el mismo mensaje que hoy ("Aún no hay modelos cargados...").

### Barra de precio fija

Reemplaza el Paso 4 "Resumen" actual. Cada `StepCard` colapsada ya muestra su valor elegido en el header, así que no hace falta un resumen aparte. La barra (sticky al fondo de la columna derecha en desktop; `position: fixed` a todo el ancho de la pantalla en mobile, ver comportamiento mobile arriba) muestra:

- Sin sesión de distribuidor: mensaje "Inicia sesión para ver precios" (mismo texto que hoy).
- Con sesión y `precioLookup`: precio + botones "Crear cotización" / "Guardar en mi espacio" (`useCotizacion`), habilitados solo cuando hay medida+tela+color+precio (mismo `puedeGuardar` de hoy).
- Con sesión y sin precio cargado para esa combinación: "Precio no disponible", botones deshabilitados.

## Manejo de errores / casos límite

- Combinación familia+cabecera+pata sin producto real → cae al primer producto válido de la familia (no debería ocurrir dado el cruce completo verificado, pero es la misma red de seguridad que trae el mockup).
- Producto sin imágenes → el visor grande queda en el mismo estado vacío que ya maneja el código legado (`cfg-carousel` sin `cfg-has-img`).
- Categoría de las 4 sin productos activos → mensaje existente de "aún no hay modelos", sin renderizar pasos.
- Precio no cargado → texto "no disponible", CTAs deshabilitados (nunca se rompe, nunca se manda a cotizar sin precio real).

## Testing / verificación manual (antes de mergear)

1. `/configurador?tipo=camas`: 7 tarjetas de Familia con foto real (misma tela en las 7). Cambiar de familia recalcula chips de Cabecera/Pata — probar Alejandra (4×2, todo disponible) vs Pont/Odisey (1×1, casi todo "off"). Confirmar que los chips "off" no son clicables y no desaparecen. Confirmar que la imagen sticky no se mueve al hacer scroll de los pasos. Confirmar que colapsar/expandir cada paso funciona.
2. `/configurador?tipo=sofas`, `?tipo=escuadras-l`, `?tipo=chaise-lounge`: mismo layout, sin paso de Familia, Modelo/Tamaño/Tela con default ya elegido al entrar.
3. `/configurador?tipo=modulares` y `?tipo=mesas`: confirmar que el layout viejo sigue exactamente igual (regresión).
4. Con sesión de distribuidor real: confirmar que el precio (o "no disponible") se ve correctamente y que Crear cotización / Guardar en mi espacio siguen funcionando igual que hoy.
5. Sin sesión: confirmar que sigue oculto el precio con el mismo mensaje de hoy.
6. Probar `?tipo=camas&modelo=<slug>` y el equivalente para las otras 3 categorías, confirmando que precargan la familia/cabecera/pata o el modelo correcto.
7. Achicar la ventana por debajo de 1080px (o probar en un celular real): confirmar que la imagen deja de quedarse fija al hacer scroll (se ve, pero se desplaza con la página) y que la barra de precio sí se mantiene fija abajo, a todo el ancho. Confirmar también que las 7 tarjetas de Familia se ven en escala de grises (no a color) en cualquier tamaño de pantalla.

## Fuera de alcance (explícitamente, para no dar sorpresas)

- No se agrega la barra de pestañas de categoría del mockup.
- No se toca Modulares, Mesas, Butacas, ni el código legado que las sirve.
- No se cargan precios nuevos en `producto_precios` — eso es tarea de datos, no de este cambio.
- No se reescribe el selector de ángulos (FRENTE/45°/90°) como concepto nuevo — se reutiliza la tira de miniaturas ya existente.
