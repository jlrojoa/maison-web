// src/admin/catalogo/dashboardCalc.js
//
// Cuentas del Dashboard del admin. Todo son funciones puras (reciben las
// cotizaciones ya leídas y la fecha de "hoy"), para poder probarlas sin base de datos.

const DIA = 86400000
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

export const PERIODOS = [
  { key: '30d', label: 'Últimos 30 días' },
  { key: '90d', label: 'Últimos 90 días' },
  { key: 'anio', label: 'Este año' },
  { key: 'todo', label: 'Todo el historial' },
]

// Rango del periodo y el periodo anterior de igual duración (para comparar). "todo" no compara.
export function rangoPeriodo(key, ahora = new Date()) {
  const hasta = ahora
  if (key === 'todo') return { desde: null, hasta, previoDesde: null, previoHasta: null }
  let desde
  if (key === 'anio') desde = new Date(ahora.getFullYear(), 0, 1)
  else desde = new Date(ahora.getTime() - (key === '90d' ? 90 : 30) * DIA)
  const dur = hasta.getTime() - desde.getTime()
  return { desde, hasta, previoDesde: new Date(desde.getTime() - dur), previoHasta: desde }
}

// Una cotización cuenta en la fecha en que se emitió; un borrador, en la que se creó.
export const fechaCot = (c) => new Date(c.emitida_at ?? c.created_at)
export const esBorrador = (c) => c.status === 'borrador'
export const enRango = (c, desde, hasta) => { const f = fechaCot(c); return (!desde || f >= desde) && f <= hasta }

export const ESTADOS = [
  { key: 'borrador', label: 'Borrador', color: '#9CA3AF' },
  { key: 'emitida', label: 'Emitida', color: '#10B981' },
  { key: 'enviada', label: 'Enviada', color: '#3B82F6' },
  { key: 'autorizada', label: 'Aceptada', color: '#8B5CF6' },
  { key: 'orden', label: 'Pedido', color: '#F59E0B' },
  { key: 'rechazada', label: 'Rechazada', color: '#EF4444' },
  { key: 'vencida', label: 'Vencida', color: '#B91C1C' },
]
export const estadoKey = (c, ahora = new Date()) =>
  (c.status === 'emitida' && c.vence_at && new Date(c.vence_at) < ahora) ? 'vencida' : (c.status || 'borrador')
const GANADAS = new Set(['autorizada', 'orden'])

// Cifras de un conjunto de cotizaciones (los borradores no cuentan como cotizado).
export function resumen(cots) {
  const emitidas = cots.filter(c => !esBorrador(c))
  const total = emitidas.reduce((s, c) => s + num(c.total), 0)
  const ganadas = emitidas.filter(c => GANADAS.has(c.status))
  return {
    n: emitidas.length, total,
    ticket: emitidas.length ? total / emitidas.length : 0,
    ganadasN: ganadas.length, ganadasTotal: ganadas.reduce((s, c) => s + num(c.total), 0),
    tasaCierre: emitidas.length ? ganadas.length / emitidas.length : null,
  }
}
// Cambio porcentual contra el periodo anterior; null si no hay con qué comparar.
export const cambioPct = (actual, previo) => (previo > 0 ? ((actual - previo) / previo) * 100 : null)

export function porEstado(cots, ahora = new Date()) {
  const acc = new Map(ESTADOS.map(e => [e.key, { ...e, n: 0, total: 0 }]))
  for (const c of cots) { const e = acc.get(estadoKey(c, ahora)); if (e) { e.n += 1; e.total += num(c.total) } }
  return [...acc.values()]
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// Monto cotizado y número de cotizaciones de los últimos `n` meses (incluye los meses sin movimiento).
export function porMes(cots, n = 12, ahora = new Date()) {
  const meses = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    meses.push({ clave: `${d.getFullYear()}-${d.getMonth()}`, label: MESES[d.getMonth()], anio: d.getFullYear(), n: 0, total: 0 })
  }
  const idx = new Map(meses.map(m => [m.clave, m]))
  for (const c of cots) {
    if (esBorrador(c)) continue
    const f = fechaCot(c); const m = idx.get(`${f.getFullYear()}-${f.getMonth()}`)
    if (m) { m.n += 1; m.total += num(c.total) }
  }
  return meses
}

// Los nombres se capturan a mano ("Cubo", "Cubo ", "CUBO"): se juntan sin distinguir mayúsculas ni espacios.
const clave = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
export function ranking(items, campo, n = 6) {
  const m = new Map()
  for (const it of items) {
    const k = clave(it[campo]); if (!k || it.es_libre) continue
    const e = m.get(k) ?? { nombre: String(it[campo]).trim().replace(/\s+/g, ' '), piezas: 0, cotizaciones: new Set() }
    e.piezas += Math.max(1, num(it.cantidad)); e.cotizaciones.add(it.cotizacion_id); m.set(k, e)
  }
  return [...m.values()].map(e => ({ nombre: e.nombre, piezas: e.piezas, cotizaciones: e.cotizaciones.size }))
    .sort((a, b) => b.piezas - a.piezas || b.cotizaciones - a.cotizaciones).slice(0, n)
}

export const clienteDe = (c) => (c.cliente_datos?.nombre || c.cliente_nombre || '').trim()

// Lo que pide acción hoy.
export function atencion(cots, ahora = new Date()) {
  const t = ahora.getTime()
  const vigentes = cots.filter(c => (c.status === 'emitida' || c.status === 'enviada') && c.vence_at && new Date(c.vence_at) >= ahora)
  const porVencer = vigentes.filter(c => new Date(c.vence_at).getTime() - t <= 7 * DIA)
    .sort((a, b) => new Date(a.vence_at) - new Date(b.vence_at))
  const vencidas = cots.filter(c => c.status === 'emitida' && c.vence_at && new Date(c.vence_at) < ahora && t - new Date(c.vence_at).getTime() <= 30 * DIA)
    .sort((a, b) => new Date(b.vence_at) - new Date(a.vence_at))
  const borradores = cots.filter(c => esBorrador(c) && t - new Date(c.created_at).getTime() > 7 * DIA)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const pendientes = cots.filter(c => c.status === 'emitida' || c.status === 'enviada').filter(c => !c.vence_at || new Date(c.vence_at) >= ahora)
  return {
    porVencer, vencidas, borradores,
    pendientesN: pendientes.length, pendientesTotal: pendientes.reduce((s, c) => s + num(c.total), 0),
  }
}

// Reparto por origen: las del admin y las de cada distribuidor.
export function porOrigen(cots) {
  const m = new Map()
  for (const c of cots) {
    if (esBorrador(c)) continue
    const k = c.origen === 'admin' ? 'Admin (Brendell)' : (c.distribuidor_email || 'Distribuidor')
    const e = m.get(k) ?? { clave: k, admin: c.origen === 'admin', n: 0, total: 0 }
    e.n += 1; e.total += num(c.total); m.set(k, e)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}
