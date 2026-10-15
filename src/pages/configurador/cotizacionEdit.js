// src/pages/configurador/cotizacionEdit.js
//
// Editar / duplicar una cotización guardada desde Mi Espacio (producto
// único: Camas, Sofás, Mesas, Butacas…) y guardarla de nuevo. Modulares
// tiene su propio flujo (secuencia_pdf) dentro de ModularesConfigurador.
import { supabase } from '../../lib/supabase'

export const esModular = (cot) => !!cot.secuencia_pdf?.sequence?.length

// "Cancún (B) · Azul Cielo" -> { tela: 'Cancún', grado: 'B', color: 'Azul Cielo' }
function parseTextilCompleto(textil) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(textil ?? '')
  return m ? { tela: m[1], grado: m[2], color: m[3] } : { tela: textil ?? '', grado: '', color: '' }
}

// Dónde editar/duplicar una cotización guardada: Modulares en su
// configurador (secuencia de piezas); el resto en la "cotización en curso"
// (varios muebles), que se carga desde la cotización guardada.
export function urlParaEditar(cot, modo = 'editar') {
  if (esModular(cot)) return `/configurador/modulares?cotizacion=${cot.id}&modo=${modo}`
  return `/cotizacion?cotizacion=${cot.id}&modo=${modo}`
}

// Datos del cliente/margen de una cotización de Modulares a editar (precarga
// el formulario). Devuelve null si no existe o no es del distribuidor.
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

// Carga una cotización guardada (varios muebles) como "cotización en curso".
export async function cotizacionAlCarrito(id, email, modo) {
  const { data: cot } = await supabase.from('cotizaciones')
    .select('*, items:cotizacion_items(*, producto:productos(slug, categoria:categorias(slug)))')
    .eq('id', id).eq('distribuidor_email', email).single()
  if (!cot) return null
  const lineas = (cot.items ?? []).map(it => {
    const { tela, color, grado } = parseTextilCompleto(it.textil_nombre)
    return {
      productoId: it.producto_id, productoSlug: it.producto?.slug ?? null, categoriaSlug: it.producto?.categoria?.slug ?? null,
      productoNombre: it.producto_nombre, imagenUrl: it.imagen_url, medidaNombre: it.configuracion_nombre,
      dimensiones: it.medidas, telaNombre: tela, telaGrado: grado, colorNombre: color,
      precioUnitario: it.precio_unitario, cantidad: it.cantidad ?? 1,
    }
  })
  return {
    lineas,
    edicion: { id: cot.id, modo: modo === 'duplicar' ? 'duplicar' : 'editar', status: cot.status, folio: cot.folio },
    form: {
      cliente_nombre: cot.cliente_nombre ?? '', cliente_email: cot.cliente_email ?? '',
      cliente_telefono: cot.cliente_telefono ?? '', markup_pct: String(cot.markup_pct ?? 0),
    },
  }
}

// Guarda (inserta, o actualiza el borrador que se está editando) UNA
// cotización con todas las líneas de la cotización en curso.
export async function guardarCotizacionMulti({ distribuidor, lineas, form, edicion }) {
  const markup = parseFloat(form.markup_pct) || 0
  const items = lineas.map(l => ({
    producto_id: l.productoId,
    imagen_url: l.imagenUrl ?? null,
    producto_nombre: l.productoNombre,
    configuracion_nombre: l.medidaNombre,
    medidas: l.dimensiones ?? null,
    textil_nombre: `${l.telaNombre} (${l.telaGrado}) · ${l.colorNombre}`,
    precio_unitario: l.precioUnitario,
    precio_cliente: Math.round(l.precioUnitario * (1 + markup / 100)),
    cantidad: l.cantidad,
  }))
  const total = items.reduce((sum, it) => sum + it.precio_cliente * it.cantidad, 0)
  const nombreProyecto = lineas.length === 1
    ? `${lineas[0].productoNombre} · ${lineas[0].medidaNombre}`
    : `${lineas.length} muebles: ${[...new Set(lineas.map(l => l.productoNombre))].join(', ')}`.slice(0, 120)
  const campos = {
    nombre_proyecto: nombreProyecto, total, markup_pct: markup,
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
  const { error: itemErr } = await supabase.from('cotizacion_items').insert(items.map(it => ({ cotizacion_id: cot.id, ...it })))
  if (itemErr) throw itemErr
  return { cot, items, total }
}
