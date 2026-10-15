// src/pages/configurador/cotizacionEdit.js
//
// Cotización en curso <-> cotización guardada (cotizaciones + cotizacion_items):
//   - cotizacionAlCarrito: carga una guardada (Mi Espacio → Editar/Duplicar).
//   - guardarCotizacionMulti: guarda/actualiza UNA cotización con todas las líneas.
//   - refrescarPrecios: vuelve a leer los precios vigentes antes de guardar.
//
// Una línea es un mueble (tipo 'mueble') o un armado de Modulares (tipo
// 'modular', con la secuencia de piezas). Sin cambios de esquema en Supabase:
//   - Cada pieza de un armado se guarda como un cotizacion_items; el armado
//     (secuencia, espejo, cantidad) viaja en `notas` como JSON.
//   - cotizaciones.secuencia_pdf solo se llena cuando la cotización es UN
//     armado, igual que antes (así el PDF de Modulares con plano sigue igual).
import { supabase } from '../../lib/supabase'
import { nombreDelArmado, notasArmado, esModular, parseTextil } from './modularesNombre'

const baseNombrePieza = (n) => (n ?? '').replace(/\s*\(\d+\s*cm\)\s*$/, '')

// Dónde editar/duplicar una cotización guardada: siempre en la cotización
// en curso, que la carga desde la guardada.
export const urlParaEditar = (cot, modo = 'editar') => `/cotizacion?cotizacion=${cot.id}&modo=${modo}`

/* ─── Guardada → cotización en curso ─────────────────────────────────── */

function armadoDeItems(items, armado, cantidadArmados) {
  const { catalogo: tela, grado, color } = parseTextil(items[0].textil_nombre)
  const piezas = items.map(it => {
    const ancho = Number(/(\d+)\s*cm/.exec(it.medidas ?? '')?.[1]) || null
    return {
      configuracionId: null, nombre: it.configuracion_nombre, ancho,
      cantidad: Math.max(1, Math.round((it.cantidad ?? 1) / cantidadArmados)),
      precioUnitario: it.precio_unitario, imagenUrl: it.imagen_url,
    }
  })
  const sequence = armado.sequence.map(p => ({ type: p.type, ancho: p.ancho ?? null }))
  return {
    tipo: 'modular', categoriaSlug: 'modulares', productoId: items[0].producto_id, productoNombre: items[0].producto_nombre,
    nombreArmado: armado.nombre ?? nombreDelArmado(sequence), sequence, mirrored: !!armado.mirrored,
    telaNombre: tela, telaGrado: grado, colorNombre: color, piezas,
    precioUnitario: piezas.reduce((s, p) => s + (p.precioUnitario ?? 0) * p.cantidad, 0),
    imagenUrl: items[0].imagen_url, cantidad: cantidadArmados,
  }
}

export async function cotizacionAlCarrito(id, email, modo) {
  const { data: cot } = await supabase.from('cotizaciones')
    .select('*, items:cotizacion_items(*, producto:productos(slug, categoria:categorias(slug)))')
    .eq('id', id).eq('distribuidor_email', email).single()
  if (!cot) return null

  const lineas = []
  const grupos = new Map() // id de armado -> { armado, items }
  const legacy = esModular(cot) && !(cot.items ?? []).some(it => notasArmado(it))
  for (const it of cot.items ?? []) {
    const arm = notasArmado(it)
    if (arm) {
      if (!grupos.has(arm.id)) grupos.set(arm.id, { armado: arm, items: [] })
      grupos.get(arm.id).items.push(it)
    } else if (!legacy) {
      const { catalogo: tela, grado, color } = parseTextil(it.textil_nombre)
      lineas.push({
        tipo: 'mueble', productoId: it.producto_id, productoSlug: it.producto?.slug ?? null, categoriaSlug: it.producto?.categoria?.slug ?? null,
        productoNombre: it.producto_nombre, imagenUrl: it.imagen_url, configuracionId: null, medidaNombre: it.configuracion_nombre,
        dimensiones: it.medidas, telaNombre: tela, telaGrado: grado, colorNombre: color,
        precioUnitario: it.precio_unitario, cantidad: it.cantidad ?? 1,
      })
    }
  }
  for (const { armado, items } of grupos.values()) lineas.push(armadoDeItems(items, armado, armado.qty ?? 1))
  if (legacy && (cot.items ?? []).length > 0) {
    lineas.push(armadoDeItems(cot.items, { sequence: cot.secuencia_pdf.sequence, mirrored: cot.secuencia_pdf.mirrored }, 1))
  }

  return {
    lineas,
    edicion: { id: cot.id, modo: modo === 'duplicar' ? 'duplicar' : 'editar', status: cot.status, folio: cot.folio },
    form: {
      cliente_nombre: cot.cliente_nombre ?? '', cliente_email: cot.cliente_email ?? '',
      cliente_telefono: cot.cliente_telefono ?? '', markup_pct: String(cot.markup_pct ?? 0),
    },
  }
}

/* ─── Cotización en curso → guardada ─────────────────────────────────── */

// Margen del distribuidor: 0–500 %, número válido (un valor raro no debe generar precios absurdos).
export const parseMargen = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? Math.min(500, Math.max(0, n)) : 0
}
export const conMargen = (precio, markup) => Math.round(precio * (1 + markup / 100))

export function itemsDeLineas(lineas, markup) {
  return lineas.flatMap(l => {
    const textil = `${l.telaNombre} (${l.telaGrado}) · ${l.colorNombre}`
    if (l.tipo !== 'modular') {
      return [{
        producto_id: l.productoId, imagen_url: l.imagenUrl ?? null, producto_nombre: l.productoNombre,
        configuracion_nombre: l.medidaNombre, medidas: l.dimensiones ?? null, textil_nombre: textil,
        precio_unitario: l.precioUnitario, precio_cliente: conMargen(l.precioUnitario, markup), cantidad: l.cantidad, notas: null,
      }]
    }
    const notas = JSON.stringify({ armado: { id: l.key, sequence: l.sequence, mirrored: !!l.mirrored, nombre: l.nombreArmado, qty: l.cantidad } })
    return l.piezas.map(p => ({
      producto_id: l.productoId, imagen_url: p.imagenUrl ?? null, producto_nombre: l.productoNombre,
      configuracion_nombre: p.nombre, medidas: p.ancho != null ? `${p.ancho}cm (aprox.)` : null, textil_nombre: textil,
      precio_unitario: p.precioUnitario, precio_cliente: conMargen(p.precioUnitario, markup),
      cantidad: p.cantidad * l.cantidad, notas,
    }))
  })
}

function nombreProyecto(lineas) {
  if (lineas.length === 1) {
    const l = lineas[0]
    return l.tipo === 'modular' ? `Modulares · ${l.nombreArmado}` : `${l.productoNombre} · ${l.medidaNombre}`
  }
  const nombres = [...new Set(lineas.map(l => (l.tipo === 'modular' ? `Modulares ${l.nombreArmado}` : l.productoNombre)))]
  return `${lineas.length} muebles: ${nombres.join(', ')}`.slice(0, 120)
}

// Guarda (inserta, o actualiza el borrador que se está editando) UNA
// cotización con todas las líneas de la cotización en curso.
export async function guardarCotizacionMulti({ distribuidor, lineas, form, edicion }) {
  const markup = parseMargen(form.markup_pct)
  const items = itemsDeLineas(lineas, markup)
  const total = items.reduce((sum, it) => sum + it.precio_cliente * it.cantidad, 0)
  const unSoloArmado = lineas.length === 1 && lineas[0].tipo === 'modular' && lineas[0].cantidad === 1
  const campos = {
    nombre_proyecto: nombreProyecto(lineas), total, markup_pct: markup,
    cliente_nombre: form.cliente_nombre.trim(),
    cliente_email: form.cliente_email.trim() || null,
    cliente_telefono: form.cliente_telefono.trim() || null,
    secuencia_pdf: unSoloArmado ? { sequence: lineas[0].sequence, mirrored: !!lineas[0].mirrored } : null,
  }
  const editando = edicion?.modo === 'editar' && edicion.status === 'borrador'
  const filas = (cotId) => items.map(it => ({ cotizacion_id: cotId, ...it }))
  let cot
  if (editando) {
    // Orden pensado para no perder nada si algo falla a medias: primero se
    // insertan las líneas nuevas, luego se retiran las anteriores (si eso
    // falla se retiran las nuevas) y al final se actualiza el encabezado.
    const { data: previas, error: prevErr } = await supabase.from('cotizacion_items').select('id').eq('cotizacion_id', edicion.id)
    if (prevErr) throw prevErr
    const { data: nuevas, error: insErr } = await supabase.from('cotizacion_items').insert(filas(edicion.id)).select('id')
    if (insErr) throw insErr
    if (previas.length > 0) {
      const { error: delErr } = await supabase.from('cotizacion_items').delete().in('id', previas.map(r => r.id))
      if (delErr) {
        await supabase.from('cotizacion_items').delete().in('id', nuevas.map(r => r.id))
        throw delErr
      }
    }
    const { data, error } = await supabase.from('cotizaciones').update(campos).eq('id', edicion.id).eq('distribuidor_email', distribuidor.email).select().single()
    if (error) throw error
    cot = data
  } else {
    const { data, error } = await supabase.from('cotizaciones')
      .insert({ distribuidor_email: distribuidor.email, status: 'borrador', ...campos }).select().single()
    if (error) throw error
    cot = data
    const { error: itemErr } = await supabase.from('cotizacion_items').insert(filas(cot.id))
    if (itemErr) {
      // Una cotización nueva sin líneas no sirve: se retira para no dejar un borrador vacío.
      await supabase.from('cotizaciones').delete().eq('id', cot.id)
      throw itemErr
    }
  }
  return { cot, items, total }
}

/* ─── Precios vigentes ───────────────────────────────────────────────── */

// Vuelve a leer los precios de distribuidor de cada línea (el distribuidor
// pudo dejar la cotización días en curso, o venir de una guardada con precios
// de ese día). Devuelve { lineas, cambios, nuevos } — `cambios` lista lo que se
// movió y `nuevos` los precios para aplicarlos sobre la versión actual de cada línea.
// Si un precio ya no se puede resolver, se conserva el guardado.
export async function refrescarPrecios(lineas) {
  const ids = [...new Set(lineas.map(l => l.productoId).filter(Boolean))]
  if (ids.length === 0) return { lineas, cambios: [], nuevos: {} }
  const [cfgRes, preRes] = await Promise.all([
    supabase.from('producto_configuraciones').select('id, producto_id, nombre').in('producto_id', ids),
    supabase.from('producto_precios').select('producto_id, configuracion_id, grado, precio').in('producto_id', ids),
  ])
  if (cfgRes.error || preRes.error) return { lineas, cambios: [], nuevos: {} }
  const precioDe = (productoId, nombre, grado) => {
    const cfg = cfgRes.data.find(c => c.producto_id === productoId && c.nombre === nombre)
    const row = cfg && preRes.data.find(p => p.configuracion_id === cfg.id && p.grado === grado)
    return row?.precio ?? null
  }
  const cambios = []
  const nuevos = {} // key -> { precio } | { piezas: { nombre: precio } }
  const nuevas = lineas.map(l => {
    if (l.tipo === 'modular') {
      const porNombre = {}
      const piezas = l.piezas.map(p => {
        const nuevo = precioDe(l.productoId, baseNombrePieza(p.nombre), l.telaGrado)
        if (nuevo == null) return p
        porNombre[p.nombre] = nuevo
        return { ...p, precioUnitario: nuevo }
      })
      const precioUnitario = piezas.reduce((s, p) => s + (p.precioUnitario ?? 0) * p.cantidad, 0)
      if (precioUnitario !== l.precioUnitario) { cambios.push(`${l.productoNombre} · ${l.nombreArmado}`); nuevos[l.key] = { piezas: porNombre } }
      return { ...l, piezas, precioUnitario }
    }
    const nuevo = precioDe(l.productoId, l.medidaNombre, l.telaGrado)
    if (nuevo != null && nuevo !== l.precioUnitario) { cambios.push(`${l.productoNombre} · ${l.medidaNombre}`); nuevos[l.key] = { precio: nuevo }; return { ...l, precioUnitario: nuevo } }
    return l
  })
  return { lineas: nuevas, cambios, nuevos }
}
