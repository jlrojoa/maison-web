// src/admin/cotizaciones/orientacion.js
//
// Chaise y escuadras llevan orientación (izquierda o derecha): sin ella no se sabe cómo fabricarlos.
// Si el producto tiene orientaciones capturadas en el catálogo se usan esas; si no, Izquierda y Derecha.
export const ORIENTACIONES_BASE = ['Izquierda', 'Derecha']

export const categoriaRequiere = (nombreCategoria) => /chaise|escuadra/i.test(nombreCategoria ?? '')
export const opcionesOrientacion = (det) => (det?.orientaciones?.length ? det.orientaciones : ORIENTACIONES_BASE)
export const requiereOrientacion = (producto, det) => categoriaRequiere(producto?.categoria?.nombre) || (det?.orientaciones?.length ?? 0) > 0

// Muebles de la cotización que piden orientación y no la tienen (para avisar antes de emitir o enviar).
export function sinOrientacion(lineas, productos) {
  return lineas.map((l, i) => ({ l, i })).filter(({ l }) => {
    if (l.es_libre || !l.producto_id || l.orientacion) return false
    return categoriaRequiere(productos.find(p => p.id === l.producto_id)?.categoria?.nombre)
  }).map(({ l, i }) => ({ posicion: i + 1, nombre: l.producto_nombre }))
}

// Orientación que muestra la FOTO del catálogo, vista de frente (como la ve quien mira la imagen):
// los chaise traen el chaise a la derecha y las escuadras traen el ala a la izquierda.
// Si la orientación elegida es la contraria, la imagen se voltea sola (espejo) en pantalla y en el PDF.
// Para un producto cuya foto sea distinta, se agrega su nombre aquí (en mayúsculas).
const BASE_POR_PRODUCTO = {}
export function orientacionDeLaFoto(nombreProducto, nombreCategoria) {
  const p = BASE_POR_PRODUCTO[String(nombreProducto ?? '').trim().toUpperCase()]
  if (p) return p
  if (/chaise/i.test(nombreCategoria ?? '')) return 'Derecha'
  if (/escuadra/i.test(nombreCategoria ?? '')) return 'Izquierda'
  return null
}
const norm = (t) => String(t ?? '').trim().toLowerCase()
// ¿Hay que voltear la imagen de esta línea? Solo con orientación Izquierda/Derecha y distinta a la de la foto.
export function debeEspejar(linea, productos) {
  if (linea.es_libre || !linea.producto_id) return false
  const o = norm(linea.orientacion)
  if (o !== 'izquierda' && o !== 'derecha') return false
  const prod = productos.find(p => p.id === linea.producto_id)
  const base = orientacionDeLaFoto(prod?.nombre ?? linea.producto_nombre, prod?.categoria?.nombre)
  return !!base && norm(base) !== o
}
