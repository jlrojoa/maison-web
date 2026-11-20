// src/admin/cotizaciones/movil/compartir.js
//
// Enviar el PDF desde el celular. En iPhone el menú de compartir deja elegir WhatsApp, Mail,
// AirDrop, etc., y adjunta el archivo. Ese menú solo abre si se toca un botón justo antes,
// por eso el PDF se genera ANTES de mostrar el botón de enviar.
export const archivoPdf = (blob, nombre) => new File([blob], nombre, { type: 'application/pdf' })

export const puedeCompartirArchivos = (blob, nombre) => {
  try { return !!navigator.canShare?.({ files: [archivoPdf(blob, nombre)] }) } catch { return false }
}

// 'compartido' | 'cancelado' | 'sin-soporte'
export async function compartirPdf({ blob, nombre, titulo, texto }) {
  const file = archivoPdf(blob, nombre)
  if (!navigator.canShare?.({ files: [file] })) return 'sin-soporte'
  try {
    await navigator.share({ files: [file], title: titulo, text: texto })
    return 'compartido'
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelado'
    throw e
  }
}

export function descargarPdf(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// México: 10 dígitos -> 52 + número. Con 52/521 ya puesto se respeta.
export function telefonoWhatsapp(tel) {
  const d = String(tel ?? '').replace(/\D/g, '')
  if (d.length === 10) return `52${d}`
  if (d.length >= 11) return d
  return ''
}
export const urlWhatsapp = (tel, texto) => `https://wa.me/${telefonoWhatsapp(tel)}?text=${encodeURIComponent(texto)}`
export const urlCorreo = (email, asunto, cuerpo) => `mailto:${email ?? ''}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`

// "Arq. Lucía Paredes" -> "Lucía": se salta los títulos para saludar por el nombre.
const TITULOS = /^(arq|ing|lic|dr|dra|sr|sra|srita|mtro|mtra|c)\.?$/i
export const primerNombre = (nombre) => (String(nombre ?? '').trim().split(/\s+/).find(p => p && !TITULOS.test(p)) ?? '')

export function mensajeCliente({ nombre, folio, total, dias }) {
  const saludo = primerNombre(nombre) ? `Hola ${primerNombre(nombre)}` : 'Hola'
  return `${saludo}, te comparto la cotización ${folio} de Brendell por ${total}. Tiene una vigencia de ${dias} días. Quedo atento a tus comentarios.`
}
