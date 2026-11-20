// src/admin/cotizaciones/movil/pdfGuardada.js — PDF de una cotización ya guardada (para verlo o reenviarlo desde la lista).
import { ajustesIniciales, folioDe, leerAjustes, leerCotizacion, lineaDeItem } from '../api'
import { generarPdfAdmin } from '../generarPdf'
import { fmtMx, num, totales } from '../calc'
import { mensajeCliente } from './compartir'

export async function pdfDeGuardada(id) {
  const [full, fijos] = await Promise.all([leerCotizacion(id), leerAjustes()])
  const cliente = full.cliente_datos ?? { nombre: full.cliente_nombre ?? '', empresa: '', rfc: '', email: full.cliente_email ?? '', telefono: full.cliente_telefono ?? '', direccion: '' }
  const ajustes = { ...ajustesIniciales(fijos), ...(full.ajustes ?? {}) }
  const lineas = full.items.map(it => { const l = lineaDeItem(it); if (l.notas && /"armado"/.test(l.notas)) l.notas = null; return l })
  const { blob, nombre } = await generarPdfAdmin({ cot: full, proyecto: full.nombre_proyecto, cliente, ajustes, fijos, lineas })
  const folio = folioDe(full)
  const total = fmtMx(totales(lineas, ajustes).total)
  const dias = Math.max(1, Math.round(num(ajustes.vigencia_dias)) || 15)
  return { blob, nombre, folio, total, cliente, cot: full, texto: mensajeCliente({ nombre: cliente.nombre, folio, total, dias }), asunto: `Cotización ${folio} · Brendell` }
}
