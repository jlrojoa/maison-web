// src/pages/configurador/cotizacionEdit.js
//
// Editar / duplicar una cotización guardada desde Mi Espacio (producto
// único: Camas, Sofás, Mesas, Butacas…) y guardarla de nuevo. Modulares
// tiene su propio flujo (secuencia_pdf) dentro de ModularesConfigurador.
import { supabase } from '../../lib/supabase'

const STICKY = ['camas', 'sofas', 'escuadras-l', 'chaise-lounge']

export const esModular = (cot) => !!cot.secuencia_pdf?.sequence?.length

// "Cancún (B) · Azul Cielo" -> { tela: 'Cancún', color: 'Azul Cielo' }
export function parseTextil(textil) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(textil ?? '')
  return m ? { tela: m[1], color: m[3] } : { tela: null, color: null }
}

// URL del configurador con la cotización cargada. `modo`: 'editar' |
// 'duplicar'.
export function urlParaEditar(cot, modo = 'editar') {
  if (esModular(cot)) return `/configurador/modulares?cotizacion=${cot.id}&modo=${modo}`
  const item = cot.items?.[0]
  const cat = item?.producto?.categoria?.slug
  const prod = item?.producto?.slug
  if (!cat || !prod) return '/configurador'
  const { tela, color } = parseTextil(item.textil_nombre)
  const q = new URLSearchParams()
  if (STICKY.includes(cat)) {
    if (item.configuracion_nombre) q.set('tamano', item.configuracion_nombre)
    if (tela) q.set('tela', tela)
    if (color) q.set('color', color)
    q.set('cotizacion', cot.id); q.set('modo', modo)
    return `/configurador/${cat}/${prod}?${q}`
  }
  q.set('tipo', cat); q.set('modelo', prod)
  if (item.configuracion_nombre) q.set('medida', item.configuracion_nombre)
  if (tela) q.set('tela', tela)
  if (color) q.set('color', color)
  q.set('cotizacion', cot.id); q.set('modo', modo)
  return `/configurador?${q}`
}

// Datos del cliente/margen de la cotización a editar (para precargar el
// formulario). Devuelve null si no existe o no es del distribuidor.
export async function cargarParaEditar(id, email, modo) {
  const { data: cot } = await supabase.from('cotizaciones').select('*')
    .eq('id', id).eq('distribuidor_email', email).single()
  if (!cot) return null
  return {
    id: cot.id, modo: modo === 'duplicar' ? 'duplicar' : 'editar', status: cot.status,
    form: {
      cliente_nombre: cot.cliente_nombre ?? '', cliente_email: cot.cliente_email ?? '',
      cliente_telefono: cot.cliente_telefono ?? '', markup_pct: String(cot.markup_pct ?? 0),
    },
  }
}

// Guarda (inserta, o actualiza el borrador que se está editando) una
// cotización de producto único con su línea. Devuelve la fila de cotizaciones.
export async function guardarCotizacionSimple({ distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup, form, edicion }) {
  const markup = parseFloat(form.markup_pct) || 0
  const precioCliente = Math.round(precioLookup * (1 + markup / 100))
  const campos = {
    nombre_proyecto: `${producto.nombre} · ${medidaSel.nombre}`,
    total: precioCliente,
    markup_pct: markup,
    cliente_nombre: form.cliente_nombre.trim(),
    cliente_email: form.cliente_email.trim() || null,
    cliente_telefono: form.cliente_telefono.trim() || null,
  }
  const editando = edicion?.modo === 'editar' && edicion.status === 'borrador'
  let cot
  if (editando) {
    const { data, error } = await supabase.from('cotizaciones').update(campos).eq('id', edicion.id).select().single()
    if (error) throw error
    cot = data
    const { error: delErr } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', cot.id)
    if (delErr) throw delErr
  } else {
    const { data, error } = await supabase.from('cotizaciones')
      .insert({ distribuidor_email: distribuidor.email, status: 'borrador', ...campos }).select().single()
    if (error) throw error
    cot = data
  }
  const item = {
    producto_nombre: producto.nombre,
    configuracion_nombre: medidaSel.nombre,
    medidas: medidaSel.dimensiones ?? null,
    textil_nombre: `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`,
    precio_unitario: precioLookup,
    precio_cliente: precioCliente,
    cantidad: 1,
  }
  const { error: itemErr } = await supabase.from('cotizacion_items').insert({
    cotizacion_id: cot.id, producto_id: producto.id, imagen_url: producto.isometrico_url ?? null, ...item,
  })
  if (itemErr) throw itemErr
  return { cot, item, precioCliente }
}
