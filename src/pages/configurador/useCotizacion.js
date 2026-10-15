// src/pages/configurador/useCotizacion.js
//
// Extraccion 1:1 de la logica de cotizacion que ya existe en Configurador.jsx
// (Paso 4 legado), parametrizada para poder usarse desde los componentes
// nuevos. Mismas tablas (cotizaciones, cotizacion_items), misma RPC
// (emitir_cotizacion). Sin cambios de comportamiento, solo de ubicacion.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generarPdfDeCotizacion } from './cotizacionPdf/pdfActions'
import { TIEMPO_FABRICACION } from './ModularesConfigurador'

export function useCotizacion({ distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup }) {
  const [cotizModo, setCotizModo] = useState(null) // null | 'borrador' | 'emitir'
  const [cotizForm, setCotizForm] = useState({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
  const [cotizSaving, setCotizSaving] = useState(false)
  const [cotizResultado, setCotizResultado] = useState(null)

  const puedeGuardar = !!(distribuidor && producto && medidaSel && telaSel && colorSel && precioLookup != null)

  const abrirCotizModal = (modo) => {
    if (!puedeGuardar) return
    setCotizForm({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
    setCotizResultado(null)
    setCotizModo(modo)
  }

  const cerrarCotizModal = () => { if (!cotizSaving) setCotizModo(null) }

  const confirmarCotizacion = async () => {
    if (!cotizForm.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setCotizSaving(true)
    try {
      const markup = parseFloat(cotizForm.markup_pct) || 0
      const precioCliente = Math.round(precioLookup * (1 + markup / 100))

      const { data: cot, error: cotErr } = await supabase.from('cotizaciones').insert({
        distribuidor_email: distribuidor.email,
        nombre_proyecto: `${producto.nombre} · ${medidaSel.nombre}`,
        status: 'borrador',
        total: precioCliente,
        markup_pct: markup,
        cliente_nombre: cotizForm.cliente_nombre.trim(),
        cliente_email: cotizForm.cliente_email.trim() || null,
        cliente_telefono: cotizForm.cliente_telefono.trim() || null,
      }).select().single()
      if (cotErr) throw cotErr

      const { error: itemErr } = await supabase.from('cotizacion_items').insert({
        cotizacion_id: cot.id,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        imagen_url: producto.isometrico_url ?? null,
        configuracion_nombre: medidaSel.nombre,
        medidas: medidaSel.dimensiones ?? null,
        textil_nombre: `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`,
        precio_unitario: precioLookup,
        precio_cliente: precioCliente,
        cantidad: 1,
      })
      if (itemErr) throw itemErr

      if (cotizModo === 'emitir') {
        const { error: emitErr } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
        if (emitErr) throw emitErr
      }

      // PDF (producto único) con los mismos datos que se acaban de guardar;
      // si falla, la cotización ya quedó guardada y solo se avisa.
      let pdfBlob = null, pdfNombre = null, pdfError = null
      try {
        const { data: fresca } = await supabase.from('cotizaciones').select('*').eq('id', cot.id).single()
        const res = await generarPdfDeCotizacion({
          ...(fresca ?? cot),
          items: [{ producto_nombre: producto.nombre, configuracion_nombre: medidaSel.nombre, medidas: medidaSel.dimensiones ?? null, textil_nombre: `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`, precio_unitario: precioLookup, precio_cliente: precioCliente, cantidad: 1 }],
        }, TIEMPO_FABRICACION)
        pdfBlob = res.blob; pdfNombre = res.nombre
      } catch (err) { pdfError = err.message }
      setCotizResultado({
        folio: cot.folio, modo: cotizModo, pdfBlob, pdfNombre, pdfError,
        nombre: cotizForm.cliente_nombre.trim(), email: cotizForm.cliente_email.trim(), tel: cotizForm.cliente_telefono.trim(), precio: precioCliente,
      })
    } catch (err) {
      alert(`Error al guardar la cotización: ${err.message}`)
    } finally {
      setCotizSaving(false)
    }
  }

  return {
    cotizModo, cotizForm, setCotizForm, cotizSaving, cotizResultado,
    puedeGuardar, abrirCotizModal, cerrarCotizModal, confirmarCotizacion,
  }
}
