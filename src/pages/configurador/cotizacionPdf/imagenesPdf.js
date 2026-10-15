// src/pages/configurador/cotizacionPdf/imagenesPdf.js
//
// react-pdf solo acepta JPG/PNG y las fotos de telas están en .webp, así que
// cada imagen se descarga, se dibuja en un canvas y se entrega como JPEG
// (data URL). Si no se puede (sin red, sin CORS, formato raro) devuelve null
// y el PDF usa un recuadro neutro — nunca falla la generación por una imagen.
import { supabase } from '../../../lib/supabase'

const cache = new Map()

export function imagenParaPdf(url, maxPx = 900) {
  if (!url) return Promise.resolve(null)
  const key = `${url}|${maxPx}`
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      try {
        const res = await fetch(url, { mode: 'cors' })
        if (!res.ok) return null
        const bmp = await createImageBitmap(await res.blob())
        const k = Math.min(1, maxPx / Math.max(bmp.width, bmp.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
        return { src: canvas.toDataURL('image/jpeg', 0.88), w: canvas.width, h: canvas.height }
      } catch { return null }
    })())
  }
  return cache.get(key)
}

// "Cancún (B) · Azul Cielo" -> { catalogo, grado, color }
export function parseTextil(textil) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(textil ?? '')
  return m ? { catalogo: m[1], grado: m[2], color: m[3] } : { catalogo: textil ?? '', grado: '', color: '' }
}

// Ficha de la tela (foto + datos técnicos) desde el catálogo; null si no existe.
export async function fichaTela({ catalogo, grado, color }) {
  if (!catalogo || !color) return null
  try {
    const { data } = await supabase.from('tela_colores')
      .select('nombre, imagen_url, codigo_hex, composicion, martindale, resistencia_luz, facil_limpieza, repelente_liquidos, pais_origen, cuidados, tela:telas(nombre, grado)')
      .eq('nombre', color)
    const fila = (data ?? []).find(r => r.tela?.nombre === catalogo && (!grado || r.tela?.grado === grado))
    if (!fila) return null
    return {
      catalogo, grado: fila.tela.grado, color: fila.nombre, hex: fila.codigo_hex,
      composicion: fila.composicion, martindale: fila.martindale, resistenciaLuz: fila.resistencia_luz,
      facilLimpieza: fila.facil_limpieza, repelente: fila.repelente_liquidos, pais: fila.pais_origen, cuidados: fila.cuidados,
      imagen: await imagenParaPdf(fila.imagen_url, 600),
    }
  } catch { return null }
}

// Foto del producto: la guardada en la cotización o, si no hay, la portada del catálogo.
export async function fotoProducto(imagenUrl, productoId) {
  let url = imagenUrl
  if (!url && productoId) {
    try {
      const { data } = await supabase.from('productos').select('imagen_portada_url, isometrico_url').eq('id', productoId).single()
      url = data?.imagen_portada_url ?? data?.isometrico_url ?? null
    } catch { /* sin foto */ }
  }
  return imagenParaPdf(url, 1000)
}
