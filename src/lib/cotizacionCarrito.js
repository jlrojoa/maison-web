// src/lib/cotizacionCarrito.js
//
// "Cotización en curso" del distribuidor: varios muebles (cada uno con su
// medida, tela, color y cantidad) que se guardan juntos como UNA cotización.
// Vive en localStorage por distribuidor, así sobrevive a recargas y a navegar
// entre configurador y la pantalla de la cotización. Al guardar/emitir se
// vacía. `edicion` indica si viene de una cotización ya guardada
// ({ id, modo: 'editar'|'duplicar', status, folio }).
import { useSyncExternalStore } from 'react'

const VACIO = Object.freeze({ lineas: [], edicion: null, form: null })
const clave = (email) => `brendell_cotizacion_v1:${email}`
const cache = new Map() // email -> { raw, valor }
const oyentes = new Set()

function leer(email) {
  if (!email) return VACIO
  let raw = null
  try { raw = localStorage.getItem(clave(email)) } catch { /* sin storage */ }
  const hit = cache.get(email)
  if (hit && hit.raw === raw) return hit.valor
  let valor = VACIO
  if (raw) { try { valor = { ...VACIO, ...JSON.parse(raw) } } catch { valor = VACIO } }
  cache.set(email, { raw, valor })
  return valor
}

function escribir(email, valor) {
  try { localStorage.setItem(clave(email), JSON.stringify(valor)) } catch { /* sin storage */ }
  cache.delete(email)
  oyentes.forEach(fn => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => { cache.clear(); oyentes.forEach(fn => fn()) })
}

const suscribir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn) }

export function useCarrito(email) {
  return useSyncExternalStore(suscribir, () => leer(email), () => VACIO)
}

export const getCarrito = leer

const nuevoId = () => `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function agregarLinea(email, linea) {
  const c = leer(email)
  // misma configuración exacta -> suma cantidad en vez de duplicar la línea
  const igual = linea.tipo === 'modular' ? null : c.lineas.find(l =>
    l.tipo !== 'modular' && l.productoId === linea.productoId && l.medidaNombre === linea.medidaNombre &&
    l.telaNombre === linea.telaNombre && l.colorNombre === linea.colorNombre)
  if (igual) {
    escribir(email, { ...c, lineas: c.lineas.map(l => (l.key === igual.key ? { ...l, cantidad: Math.min(99, l.cantidad + (linea.cantidad ?? 1)) } : l)) })
    return igual.key
  }
  const key = nuevoId()
  escribir(email, { ...c, lineas: [...c.lineas, { cantidad: 1, ...linea, key }] })
  return key
}

export function actualizarLinea(email, key, cambios) {
  const c = leer(email)
  escribir(email, { ...c, lineas: c.lineas.map(l => (l.key === key ? { ...l, ...cambios } : l)) })
}

// Aplica precios vigentes sobre la versión ACTUAL de cada línea (no sobre una
// copia vieja): `nuevos` = { [key]: { precio?, piezas?: { [nombre]: precio } } }.
export function aplicarPrecios(email, nuevos) {
  const c = leer(email)
  escribir(email, {
    ...c,
    lineas: c.lineas.map(l => {
      const n = nuevos[l.key]
      if (!n) return l
      if (l.tipo === 'modular') {
        const piezas = l.piezas.map(p => (n.piezas?.[p.nombre] != null ? { ...p, precioUnitario: n.piezas[p.nombre] } : p))
        return { ...l, piezas, precioUnitario: piezas.reduce((s, p) => s + (p.precioUnitario ?? 0) * p.cantidad, 0) }
      }
      return n.precio != null ? { ...l, precioUnitario: n.precio } : l
    }),
  })
}

export function quitarLinea(email, key) {
  const c = leer(email)
  escribir(email, { ...c, lineas: c.lineas.filter(l => l.key !== key) })
}

export function setEdicion(email, edicion) {
  escribir(email, { ...leer(email), edicion })
}

export function setForm(email, form) {
  escribir(email, { ...leer(email), form })
}

// Reemplaza toda la cotización en curso (p. ej. al cargar una guardada).
export function cargarCarrito(email, { lineas, edicion, form }) {
  escribir(email, { lineas: lineas.map(l => ({ cantidad: 1, ...l, key: l.key ?? nuevoId() })), edicion: edicion ?? null, form: form ?? null })
}

export function vaciarCarrito(email) {
  escribir(email, VACIO)
}
