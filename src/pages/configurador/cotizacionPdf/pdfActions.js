// src/pages/configurador/cotizacionPdf/pdfActions.js
//
// Acciones de PDF compartidas entre Mi Espacio y el modal del configurador:
// generar el blob, abrirlo en pestaña nueva y descargarlo.
import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import ModularesCotizacionPdf from './ModularesCotizacionPdf'

export const generarPdfBlob = (data) => pdf(createElement(ModularesCotizacionPdf, { data })).toBlob()

// Abre el visor de PDF del navegador en una pestaña nueva. Debe llamarse
// con la pestaña ya abierta (`win`) porque abrirla después de un await la
// bloquea el navegador; si no hay `win` cae a un enlace temporal.
export function abrirBlob(blob, win) {
  const url = URL.createObjectURL(blob)
  if (win && !win.closed) win.location.href = url
  else window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
}

export function descargarBlob(blob, nombre) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}

// Abre una pestaña en blanco con un aviso mientras se genera el PDF.
export function abrirPestanaEspera() {
  const win = window.open('', '_blank')
  if (win) win.document.write('<title>Cotización</title><p style="font-family:system-ui;color:#64748B;padding:24px">Generando PDF…</p>')
  return win
}

// Genera el PDF de una cotización YA GUARDADA (o con su mismo shape),
// del tipo que corresponda. Devuelve { blob, nombre }.
export async function generarPdfDeCotizacion(cot, tiempoFabricacion) {
  const { buildCotizacionPdfDataFromCotizacion, buildSimplePdfDataFromCotizacion, esModular } = await import('./pdfDataFromSaved')
  if (esModular(cot)) {
    const data = buildCotizacionPdfDataFromCotizacion(cot, tiempoFabricacion)
    return { blob: await generarPdfBlob(data), nombre: `cotizacion-${data.folio}.pdf` }
  }
  const { default: CotizacionSimplePdf } = await import('./CotizacionSimplePdf')
  const data = buildSimplePdfDataFromCotizacion(cot)
  return { blob: await pdf(createElement(CotizacionSimplePdf, { data })).toBlob(), nombre: `cotizacion-${data.folio}.pdf` }
}
