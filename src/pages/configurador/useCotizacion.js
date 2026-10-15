// src/pages/configurador/useCotizacion.js
//
// Extraccion 1:1 de la logica de cotizacion que ya existe en Configurador.jsx
// (Paso 4 legado), parametrizada para poder usarse desde los componentes
// nuevos. Mismas tablas (cotizaciones, cotizacion_items), misma RPC
// (emitir_cotizacion). Sin cambios de comportamiento, solo de ubicacion.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { generarPdfDeCotizacion } from './cotizacionPdf/pdfActions'
import { TIEMPO_FABRICACION } from './ModularesConfigurador'
import { cargarParaEditar, guardarCotizacionSimple } from './cotizacionEdit'

export function useCotizacion({ distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup }) {
  const [cotizModo, setCotizModo] = useState(null) // null | 'borrador' | 'emitir'
  const [cotizForm, setCotizForm] = useState({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
  const [cotizSaving, setCotizSaving] = useState(false)
  const [cotizResultado, setCotizResultado] = useState(null)

  // Mi Espacio → Editar/Duplicar: ?cotizacion=ID&modo=editar|duplicar. Se lee
  // una vez al montar (el configurador reescribe la URL al cambiar opciones).
  const [searchParams] = useSearchParams()
  const [edicion, setEdicion] = useState(null) // { id, modo, status }
  const [prefill, setPrefill] = useState(null)
  useEffect(() => {
    const id = searchParams.get('cotizacion')
    if (!id || !distribuidor) return
    let ignore = false
    cargarParaEditar(id, distribuidor.email, searchParams.get('modo')).then(r => {
      if (ignore || !r) return
      setEdicion({ id: r.id, modo: r.modo, status: r.status }); setPrefill(r.form)
    })
    return () => { ignore = true }
  }, [distribuidor?.email])

  const puedeGuardar = !!(distribuidor && producto && medidaSel && telaSel && colorSel && precioLookup != null)

  const abrirCotizModal = (modo) => {
    if (!puedeGuardar) return
    setCotizForm(prefill ?? { cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
    setCotizResultado(null)
    setCotizModo(modo)
  }

  const cerrarCotizModal = () => { if (!cotizSaving) setCotizModo(null) }

  const confirmarCotizacion = async () => {
    if (!cotizForm.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setCotizSaving(true)
    try {
      const { cot, item, precioCliente } = await guardarCotizacionSimple({
        distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup, form: cotizForm, edicion,
      })

      if (cotizModo === 'emitir') {
        const { error: emitErr } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
        if (emitErr) throw emitErr
      }

      // PDF (producto único) con los mismos datos que se acaban de guardar;
      // si falla, la cotización ya quedó guardada y solo se avisa.
      let pdfBlob = null, pdfNombre = null, pdfError = null
      try {
        const { data: fresca } = await supabase.from('cotizaciones').select('*').eq('id', cot.id).single()
        const res = await generarPdfDeCotizacion({ ...(fresca ?? cot), items: [item] }, TIEMPO_FABRICACION)
        pdfBlob = res.blob; pdfNombre = res.nombre
      } catch (err) { pdfError = err.message }
      setEdicion({ id: cot.id, modo: 'editar', status: cotizModo === 'emitir' ? 'emitida' : 'borrador' })
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
    edicion, puedeGuardar, abrirCotizModal, cerrarCotizModal, confirmarCotizacion,
  }
}
