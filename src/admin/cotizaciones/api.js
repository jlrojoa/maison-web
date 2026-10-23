// src/admin/cotizaciones/api.js
//
// Lectura y escritura de cotizaciones del admin. Usa las mismas tablas que las
// cotizaciones de los distribuidores (cotizaciones + cotizacion_items); las del
// admin llevan origen = 'admin'. Las políticas RLS ya dejan al admin
// (es_admin()) leer y escribir todo.
import { supabase } from '../../lib/supabase'
import { parseTextil } from '../../pages/configurador/modularesNombre'
import { AJUSTES_VACIOS, num, totales, precioNeto, textoMedidas } from './calc'

export const ESTADOS = [
  { key: 'borrador', label: 'Borrador', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'emitida', label: 'Emitida', color: '#047857', bg: '#ECFDF5' },
  { key: 'enviada', label: 'Enviada', color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'autorizada', label: 'Aceptada', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'orden', label: 'Pedido', color: '#B45309', bg: '#FFFBEB' },
  { key: 'rechazada', label: 'Rechazada', color: '#B91C1C', bg: '#FEF2F2' },
]
export const estadoDe = (cot) => {
  if (cot.status === 'emitida' && cot.vence_at && new Date(cot.vence_at) < new Date()) return { key: 'vencida', label: 'Vencida', color: '#B91C1C', bg: '#FEF2F2' }
  return ESTADOS.find(e => e.key === cot.status) ?? ESTADOS[0]
}
export const folioDe = (cot) => (cot.folio ? `BR-${cot.folio}` : 'BORRADOR')

/* ─── Ajustes fijos (una sola captura) ─────────────────────────────── */

export async function leerAjustes() {
  const { data } = await supabase.from('cotizacion_ajustes').select('*').eq('id', 1).maybeSingle()
  return data ?? { id: 1, terminos: [] }
}
export async function guardarAjustes(valores) {
  const { id, updated_at, ...campos } = valores // eslint-disable-line no-unused-vars
  const { error } = await supabase.from('cotizacion_ajustes').upsert({ id: 1, ...campos, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Ajustes de una cotización NUEVA: salen de los ajustes fijos y se guardan en
// ella (así cambiar los fijos después no altera cotizaciones ya hechas).
export function ajustesIniciales(fijos) {
  return {
    ...AJUSTES_VACIOS,
    iva_modo: fijos.iva_modo ?? 'ninguno', iva_pct: fijos.iva_pct ?? 16,
    anticipo_pct: fijos.anticipo_pct ?? '', vigencia_dias: fijos.vigencia_dias ?? 15,
    tiempo_entrega: fijos.tiempo_entrega ?? '', condiciones_pago: fijos.condiciones_pago ?? '',
    datos_bancarios: fijos.datos_bancarios ?? '',
    terminos: (fijos.terminos ?? []).map(t => ({ ...t })),
  }
}

/* ─── Clientes ─────────────────────────────────────────────────────── */

export const CLIENTE_VACIO = { nombre: '', empresa: '', rfc: '', email: '', telefono: '', direccion: '', notas: '' }
export async function listarClientes() {
  const { data } = await supabase.from('cotizacion_clientes').select('*').eq('activo', true).order('nombre')
  return data ?? []
}
export async function guardarCliente(c) {
  const { id, created_at, updated_at, activo, ...campos } = c // eslint-disable-line no-unused-vars
  const limpio = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || null) : v]))
  if (!limpio.nombre) throw new Error('El nombre del cliente es obligatorio.')
  const q = id
    ? supabase.from('cotizacion_clientes').update({ ...limpio, updated_at: new Date().toISOString() }).eq('id', id)
    : supabase.from('cotizacion_clientes').insert(limpio)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}
export async function borrarCliente(id) {
  // Las cotizaciones guardan su propia copia de los datos, así que borrar al cliente no las afecta.
  const { error } = await supabase.from('cotizacion_clientes').delete().eq('id', id)
  if (error) throw error
}

/* ─── Cotizaciones ─────────────────────────────────────────────────── */

export async function listarCotizaciones() {
  const { data, error } = await supabase.from('cotizaciones')
    .select('id, folio, origen, nombre_proyecto, status, total, created_at, emitida_at, vence_at, distribuidor_email, cliente_nombre, cliente_datos, items:cotizacion_items(id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function leerCotizacion(id) {
  const { data, error } = await supabase.from('cotizaciones')
    .select('*, items:cotizacion_items(*)').eq('id', id).single()
  if (error) throw error
  data.items = [...(data.items ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || new Date(a.created_at) - new Date(b.created_at))
  return data
}

let seq = 0
export const nuevaClave = () => `l${Date.now().toString(36)}${seq++}`

export const LINEA_VACIA = () => ({
  key: nuevaClave(), es_libre: false, producto_id: null, producto_nombre: '', configuracion_id: null, configuracion_nombre: '',
  medidas_cm: { ancho: '', fondo: '', alto: '' }, imagen_url: null, isometrico_url: null,
  tela_catalogo: '', tela_grado: '', tela_color: '', precio_lista: '', precio: '', precio_manual: false,
  cantidad: 1, descuento_pct: '', requisito_especial: '', notas: null,
})

// Fila de cotizacion_items -> línea del editor.
export function lineaDeItem(it) {
  const t = parseTextil(it.textil_nombre)
  const mc = it.medidas_cm ?? {}
  return {
    key: nuevaClave(), es_libre: !!it.es_libre, producto_id: it.producto_id, producto_nombre: it.producto_nombre ?? '',
    configuracion_id: null, configuracion_nombre: it.configuracion_nombre ?? '',
    medidas_cm: { ancho: mc.ancho ?? '', fondo: mc.fondo ?? '', alto: mc.alto ?? '' },
    imagen_url: it.imagen_url, isometrico_url: it.isometrico_url,
    tela_catalogo: t.catalogo && t.grado ? t.catalogo : '', tela_grado: t.grado, tela_color: t.color,
    precio_lista: it.precio_unitario ?? '', precio: it.precio_cliente ?? it.precio_unitario ?? '', precio_manual: true,
    cantidad: it.cantidad ?? 1, descuento_pct: it.descuento_pct || '', requisito_especial: it.requisito_especial ?? '', notas: it.notas ?? null,
  }
}

export const textilDe = (l) => (l.tela_catalogo && l.tela_color ? `${l.tela_catalogo} (${l.tela_grado}) · ${l.tela_color}` : (l.tela_catalogo || null))

export function itemDeLinea(l, i, cotizacionId) {
  return {
    cotizacion_id: cotizacionId, producto_id: l.es_libre ? null : (l.producto_id ?? null),
    producto_nombre: (l.producto_nombre || 'Concepto').trim(), configuracion_nombre: l.configuracion_nombre?.trim() || null,
    medidas: textoMedidas(l.medidas_cm) || null, medidas_cm: l.medidas_cm ?? null,
    imagen_url: l.imagen_url ?? null, isometrico_url: l.isometrico_url ?? null,
    textil_nombre: textilDe(l), precio_unitario: num(l.precio_lista) || num(l.precio), precio_cliente: num(l.precio),
    cantidad: Math.max(1, Math.round(num(l.cantidad)) || 1), descuento_pct: num(l.descuento_pct),
    requisito_especial: l.requisito_especial?.trim() || null, es_libre: !!l.es_libre, notas: l.notas ?? null, orden: i,
  }
}

const textoOrNull = (v) => (typeof v === 'string' ? (v.trim() || null) : v ?? null)

// Guarda (inserta o actualiza) una cotización con sus líneas. Orden pensado para
// no perder nada si algo falla a medias: primero se insertan las líneas nuevas,
// luego se retiran las anteriores y al final se actualiza el encabezado.
export async function guardarCotizacion({ id, adminEmail, proyecto, cliente, clienteId, ajustes, lineas, notasInternas, status }) {
  const t = totales(lineas, ajustes)
  const campos = {
    nombre_proyecto: proyecto?.trim() || 'Cotización', total: t.total, subtotal: t.subtotal, descuento: t.descuento, iva: t.iva,
    cliente_id: clienteId ?? null, cliente_datos: cliente, ajustes,
    cliente_nombre: textoOrNull(cliente.nombre), cliente_email: textoOrNull(cliente.email), cliente_telefono: textoOrNull(cliente.telefono),
    notas_internas: textoOrNull(notasInternas), markup_pct: 0, marca_distribuidor: false,
  }
  if (status) campos.status = status
  let cot
  if (id) {
    const { data: previas, error: e1 } = await supabase.from('cotizacion_items').select('id').eq('cotizacion_id', id)
    if (e1) throw e1
    if (lineas.length) {
      const { data: nuevas, error: e2 } = await supabase.from('cotizacion_items').insert(lineas.map((l, i) => itemDeLinea(l, i, id))).select('id')
      if (e2) throw e2
      if (previas.length) {
        const { error: e3 } = await supabase.from('cotizacion_items').delete().in('id', previas.map(r => r.id))
        if (e3) { await supabase.from('cotizacion_items').delete().in('id', nuevas.map(r => r.id)); throw e3 }
      }
    } else if (previas.length) {
      const { error: e3 } = await supabase.from('cotizacion_items').delete().in('id', previas.map(r => r.id))
      if (e3) throw e3
    }
    const { data, error } = await supabase.from('cotizaciones').update(campos).eq('id', id).select().single()
    if (error) throw error
    cot = data
  } else {
    const { data, error } = await supabase.from('cotizaciones')
      .insert({ ...campos, distribuidor_email: adminEmail, origen: 'admin', status: status ?? 'borrador' }).select().single()
    if (error) throw error
    cot = data
    if (lineas.length) {
      const { error: ei } = await supabase.from('cotizacion_items').insert(lineas.map((l, i) => itemDeLinea(l, i, cot.id)))
      if (ei) { await supabase.from('cotizaciones').delete().eq('id', cot.id); throw ei }
    }
  }
  return cot
}

// Cambia el estado. Al emitir se fija la fecha y el vencimiento con la vigencia de ESA cotización.
export async function cambiarEstado(cot, status) {
  const campos = { status }
  if (status === 'emitida' && !cot.emitida_at) {
    const dias = Math.max(1, Math.round(num(cot.ajustes?.vigencia_dias)) || 15)
    const ahora = new Date()
    campos.emitida_at = ahora.toISOString()
    campos.vence_at = new Date(ahora.getTime() + dias * 86400000).toISOString()
  }
  const { data, error } = await supabase.from('cotizaciones').update(campos).eq('id', cot.id).select().single()
  if (error) throw error
  return data
}

export async function borrarCotizacion(id) {
  // Las líneas se borran solas (ON DELETE CASCADE). Si otra cotización nació de esta, se suelta el vínculo.
  await supabase.from('cotizaciones').update({ origen_cotizacion_id: null }).eq('origen_cotizacion_id', id)
  const { error } = await supabase.from('cotizaciones').delete().eq('id', id)
  if (error) throw error
}

// Copia una cotización (propia o de un distribuidor) como borrador nuevo del admin,
// editable. Los armados de Modulares se vuelven una línea por pieza.
export async function duplicarCotizacion(id, adminEmail, fijos) {
  const cot = await leerCotizacion(id)
  const lineas = cot.items.map(it => { const l = lineaDeItem(it); if (l.notas && /"armado"/.test(l.notas)) l.notas = null; return l })
  const base = cot.ajustes ?? ajustesIniciales(fijos)
  const cliente = cot.cliente_datos ?? { ...{ nombre: '', empresa: '', rfc: '', email: '', telefono: '', direccion: '', notas: '' }, nombre: cot.cliente_nombre ?? '', email: cot.cliente_email ?? '', telefono: cot.cliente_telefono ?? '' }
  const nueva = await guardarCotizacion({
    adminEmail, proyecto: cot.nombre_proyecto, cliente, clienteId: cot.cliente_id, ajustes: base, lineas, notasInternas: cot.notas_internas, status: 'borrador',
  })
  await supabase.from('cotizaciones').update({ origen_cotizacion_id: cot.id }).eq('id', nueva.id)
  return nueva
}

/* ─── Resumen para lista / dashboard ───────────────────────────────── */

export const clienteTexto = (c) => c.cliente_datos?.nombre || c.cliente_nombre || ''
export { precioNeto }
