// src/admin/cotizaciones/useCatalogo.js
//
// Catálogo para armar cotizaciones: productos, telas con sus colores y, por
// producto, sus medidas, precios por grado y fotos. Todo se lee de las mismas
// tablas que usa el configurador, así que un cambio de precio o de foto en el
// admin se refleja aquí sin tocar nada más.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export const GRADOS = ['AA', 'A', 'B', 'C']

export function useCatalogo() {
  const [productos, setProductos] = useState([])
  const [telas, setTelas] = useState([])
  const [listo, setListo] = useState(false)
  const detalle = useRef(new Map()) // producto_id -> Promise<{ configuraciones, precios, imagenes }>

  useEffect(() => {
    let ignore = false
    ;(async () => {
      const [pr, te] = await Promise.all([
        supabase.from('productos').select('id, nombre, slug, isometrico_url, imagen_portada_url, activo, orden, categoria:categorias(nombre, slug)').eq('activo', true).order('nombre'),
        supabase.from('telas').select('id, nombre, grado, activo, orden, colores:tela_colores(id, nombre, imagen_url, codigo_hex, activo, orden)').eq('activo', true).order('grado').order('orden'),
      ])
      if (ignore) return
      setProductos(pr.data ?? [])
      setTelas((te.data ?? []).map(t => ({ ...t, colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden) })))
      setListo(true)
    })()
    return () => { ignore = true }
  }, [])

  const cargarProducto = (id) => {
    if (!id) return Promise.resolve({ configuraciones: [], precios: [], imagenes: [] })
    if (!detalle.current.has(id)) {
      detalle.current.set(id, (async () => {
        const [cfg, pre, img] = await Promise.all([
          supabase.from('producto_configuraciones').select('id, nombre, dimensiones, isometrico_url, orden').eq('producto_id', id).eq('activo', true).order('orden'),
          supabase.from('producto_precios').select('configuracion_id, grado, precio').eq('producto_id', id),
          supabase.from('producto_imagenes').select('url, alt, orden').eq('producto_id', id).order('orden'),
        ])
        return { configuraciones: cfg.data ?? [], precios: pre.data ?? [], imagenes: img.data ?? [] }
      })())
    }
    return detalle.current.get(id)
  }

  return { productos, telas, listo, cargarProducto }
}

export const precioDeLista = (detalle, configuracionId, grado) =>
  detalle?.precios.find(p => p.configuracion_id === configuracionId && p.grado === grado)?.precio ?? null

// Estado del detalle de UN producto dentro de una línea.
export function useDetalleProducto(cat, productoId) {
  const [det, setDet] = useState(null)
  useEffect(() => {
    let ignore = false
    setDet(null)
    if (productoId) cat.cargarProducto(productoId).then(d => { if (!ignore) setDet(d) })
    return () => { ignore = true }
  }, [productoId]) // eslint-disable-line react-hooks/exhaustive-deps
  return det
}
