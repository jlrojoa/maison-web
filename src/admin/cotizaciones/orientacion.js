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
