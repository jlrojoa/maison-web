// src/admin/cotizaciones/movil/lineaOps.js
//
// Reglas para armar una línea del cotizador móvil. Son las mismas del editor de escritorio
// (LineaCard): al elegir mueble, medida o tela se trae el precio de lista del catálogo.
import { precioDeLista } from '../useCatalogo'
import { medidasDeTexto } from '../calc'

export const GRADOS_ORDEN = ['AA', 'A', 'B', 'C']

export function telaInicial(cat) {
  const t0 = GRADOS_ORDEN.map(g => cat.telas.find(t => t.grado === g && t.colores.length)).find(Boolean)
  return t0 ? { tela_catalogo: t0.nombre, tela_grado: t0.grado, tela_color: t0.colores[0].nombre } : {}
}

// Elegir mueble: limpia medida y precio; si aún no hay tela, arranca con la de la categoría más alta.
export function alElegirProducto(linea, producto, cat) {
  return {
    ...(linea.tela_catalogo ? {} : telaInicial(cat)),
    producto_id: producto.id, producto_nombre: producto.nombre, configuracion_id: null, configuracion_nombre: '',
    imagen_url: producto.imagen_portada_url || producto.isometrico_url || null, isometrico_url: producto.isometrico_url || null,
    medidas_cm: { ancho: '', fondo: '', alto: '' }, precio_lista: '', precio: '', precio_manual: false,
  }
}

// Precio de lista para una medida + categoría de tela. Si el catálogo no lo tiene se conserva el que hay.
export function conPrecio(det, patch, cfgId, grado) {
  const lista = precioDeLista(det, cfgId, grado)
  patch.precio_lista = lista ?? ''
  if (lista != null) { patch.precio = lista; patch.precio_manual = false }
  return patch
}

export function alElegirMedida(linea, cfg, producto, det) {
  const m = medidasDeTexto(cfg.dimensiones)
  return conPrecio(det, {
    configuracion_id: cfg.id, configuracion_nombre: cfg.nombre,
    isometrico_url: cfg.isometrico_url || producto?.isometrico_url || linea.isometrico_url,
    medidas_cm: m.ancho || m.fondo || m.alto ? m : linea.medidas_cm,
  }, cfg.id, linea.tela_grado)
}

export function alElegirTela(linea, tela, colorNombre, det) {
  const c = tela.colores.find(x => x.nombre === colorNombre) ?? tela.colores[0]
  return conPrecio(det, { tela_catalogo: tela.nombre, tela_grado: tela.grado, tela_color: c?.nombre ?? '' }, linea.configuracion_id, tela.grado)
}

// Una línea está "llena" cuando tiene nombre o precio; las demás no salen en el PDF.
export const lineaLlena = (l) => !!((l.producto_nombre ?? '').trim() || Number(l.precio))
