// src/pages/configurador/cotizacionPdf/pdfActions.js
//
// Acciones de PDF compartidas entre Mi Espacio y el modal del configurador:
// generar el blob, abrirlo en pestaña nueva y descargarlo.
import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import ModularesCotizacionPdf from './ModularesCotizacionPdf'
import { fichaTela, fotoProducto } from './imagenesPdf'

// Modulares: agrega la ficha/foto de la tela elegida antes de renderizar.
export async function generarPdfBlob(data) {
  const tela = data.tela ?? await fichaTela({ catalogo: data.telaNombre, grado: data.gradoSel, color: data.colorNombre })
  return pdf(createElement(ModularesCotizacionPdf, { data: { ...data, tela } })).toBlob()
}

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
  const data = buildSimplePdfDataFromCotizacion(cot, tiempoFabricacion)
  // Foto del mueble y ficha de la tela de cada línea (en paralelo).
  data.filas = await Promise.all(data.filas.map(async f => ({
    ...f,
    foto: await fotoProducto(f.imagenUrl, f.productoId),
    tela: await fichaTela({ catalogo: f.textilCatalogo, grado: f.textilGrado, color: f.textilColor }),
  })))
  return { blob: await pdf(createElement(CotizacionSimplePdf, { data })).toBlob(), nombre: `cotizacion-${data.folio}.pdf` }
}

// Envía la cotización con el PDF ADJUNTO cuando el dispositivo lo permite
// (menú de compartir del sistema: correo, WhatsApp…). En computadoras sin
// esa función se descarga el PDF y se abre el correo/WhatsApp con el texto,
// para que la persona solo lo adjunte.
export async function compartirPdf({ blob, nombre, asunto, cuerpo, email, tel }) {
  const file = new File([blob], nombre, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: asunto, text: cuerpo })
      return 'compartido'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelado'
    }
  }
  descargarBlob(blob, nombre)
  const texto = `${cuerpo}\n\n(Adjunta el PDF "${nombre}" que se acaba de descargar.)`
  if (email) window.open(`mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`, '_blank')
  else if (tel) window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank')
  return 'descargado'
}
