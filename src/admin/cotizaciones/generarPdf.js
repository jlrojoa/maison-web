// src/admin/cotizaciones/generarPdf.js
//
// Arma los datos del PDF a partir de una cotización (guardada o en edición) y
// la renderiza. Las imágenes se bajan y convierten a JPEG (ver imagenesPdf.js);
// si alguna falla el PDF sale igual con un recuadro neutro.
import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '../../lib/supabase'
import { fichaTela, imagenParaPdf, fotoProducto } from '../../pages/configurador/cotizacionPdf/imagenesPdf'
import { num, totales, precioNeto, totalLinea, textoMedidas } from './calc'
import { debeEspejar } from './orientacion'

// `lineas` en formato del editor; `cot` aporta folio y fechas (puede venir vacío en un borrador sin guardar).
export async function generarPdfAdmin({ cot, proyecto, cliente, ajustes, fijos, lineas: todas }) {
  // Un renglón sin nombre y sin precio es uno que se agregó y no se llenó: no sale en el PDF.
  const lineas = todas.filter(l => (l.producto_nombre ?? '').trim() || num(l.precio))
  const { default: AdminCotizacionPdf } = await import('./AdminCotizacionPdf')
  // Categoría de cada mueble: define qué orientación muestra su foto y si hay que voltearla.
  const ids = [...new Set(lineas.map(l => l.producto_id).filter(Boolean))]
  let productos = []
  if (ids.length) { try { productos = (await supabase.from('productos').select('id, nombre, categoria:categorias(nombre)').in('id', ids)).data ?? [] } catch { /* sin categoría: no se voltea */ } }
  const filas = await Promise.all(lineas.map(async l => {
    const espejo = debeEspejar(l, productos)
    const [foto, iso, tela] = await Promise.all([
      l.imagen_url ? imagenParaPdf(l.imagen_url, 1000, espejo) : (l.es_libre || !l.producto_id ? null : fotoProducto(null, l.producto_id, espejo)),
      imagenParaPdf(l.isometrico_url, 800, espejo),
      l.tela_catalogo ? fichaTela({ catalogo: l.tela_catalogo, grado: l.tela_grado, color: l.tela_color }) : null,
    ])
    return {
      esLibre: !!l.es_libre, producto: l.producto_nombre, configuracion: l.configuracion_nombre, medidas: textoMedidas(l.medidas_cm), medidasCm: l.medidas_cm,
      cantidad: Math.max(1, Math.round(num(l.cantidad)) || 1), precio: num(l.precio), descuento: num(l.descuento_pct),
      precioNeto: precioNeto(l), subtotal: totalLinea(l),
      textilCatalogo: l.tela_catalogo, textilGrado: l.tela_grado, textilColor: l.tela_color,
      requisito: l.requisito_especial?.trim() || '', orientacion: l.orientacion?.trim() || '', foto, iso, tela,
    }
  }))
  const fecha = cot?.emitida_at ? new Date(cot.emitida_at) : new Date(cot?.created_at ?? Date.now())
  const dias = Math.max(1, Math.round(num(ajustes.vigencia_dias)) || 15)
  const vence = cot?.vence_at ? new Date(cot.vence_at) : new Date(fecha.getTime() + dias * 86400000)
  const empresa = { ...fijos, logo: await imagenParaPdf(fijos.logo_url, 500) }
  const data = {
    folio: cot?.folio ? `BR-${cot.folio}` : 'BORRADOR', fecha, vence, vigenciaDias: dias,
    proyecto, cliente, ajustes, empresa, filas, totales: totales(lineas, ajustes),
  }
  const blob = await pdf(createElement(AdminCotizacionPdf, { data })).toBlob()
  return { blob, nombre: `cotizacion-${data.folio}.pdf` }
}
