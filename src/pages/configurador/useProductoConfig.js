// src/pages/configurador/useProductoConfig.js
//
// Dado un producto (con id e isometrico_url), carga sus tamaños, telas,
// galería y precio. A diferencia de la primera versión, NO guarda la
// selección (medida/grado/tela/color) como estado local propio — la deriva
// de `preferred` (medidaNombre/telaNombre/colorNombre), que el llamador
// arma a partir de la URL. Así no hay dos fuentes de verdad: la URL manda,
// y esto solo resuelve "¿ese valor preferido existe en las opciones reales
// de este producto? si no, ¿cuál es el default?". Ver spec:
// docs/superpowers/specs/2026-08-10-configurador-sticky-design.md
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS_ORDEN = ['AA', 'A', 'B', 'C']

export function useProductoConfig(producto, distribuidor, preferred = {}) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [telas, setTelas] = useState([])
  const [galeria, setGaleria] = useState([])
  const [activeImgUrl, setActiveImgUrl] = useState(null)
  const [precios, setPrecios] = useState([])

  // Dependencia en producto?.id (no en el objeto producto) para no recargar
  // si el objeto se recalcula (ej. useMemo del padre) pero sigue siendo el
  // mismo producto.
  useEffect(() => {
    if (!producto) {
      setConfiguraciones([]); setTelas([]); setGaleria([]); setActiveImgUrl(null)
      return
    }
    let ignore = false
    async function load() {
      const [cfgRes, telasRes, imgRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', producto.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
        supabase.from('producto_imagenes').select('*')
          .eq('producto_id', producto.id).order('orden'),
      ])
      if (ignore) return

      setConfiguraciones(cfgRes.data ?? [])

      const telasConColores = (telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))
      setTelas(telasConColores)

      const imgs = imgRes.data ?? []
      setGaleria(imgs)
      setActiveImgUrl(producto.isometrico_url ?? imgs[0]?.url ?? null)
    }
    load()
    return () => { ignore = true }
  }, [producto?.id])

  // Medida preferida (de la URL) si sigue existiendo en este producto; si
  // no, la primera disponible. Esto ES la regla de "conservar selecciones
  // válidas": si el paso anterior cambió pero la medida sigue existiendo
  // (misma medida, otro cabecera por ejemplo), se mantiene sin que el
  // llamador tenga que hacer nada especial.
  const medidaSel = useMemo(
    () => configuraciones.find(c => c.nombre === preferred.medidaNombre) ?? configuraciones[0] ?? null,
    [configuraciones, preferred.medidaNombre]
  )

  const telaSel = useMemo(() => {
    const porNombre = preferred.telaNombre && telas.find(t => t.nombre === preferred.telaNombre)
    if (porNombre) return porNombre
    const gradoDefault = GRADOS_ORDEN.find(g => telas.some(t => t.grado === g)) ?? null
    return telas.find(t => t.grado === gradoDefault) ?? null
  }, [telas, preferred.telaNombre])

  const gradoSel = telaSel?.grado ?? null

  const colorSel = useMemo(
    () => (preferred.colorNombre && telaSel?.colores?.find(c => c.nombre === preferred.colorNombre)) || telaSel?.colores?.[0] || null,
    [telaSel, preferred.colorNombre]
  )

  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

  useEffect(() => {
    if (!distribuidor || !producto || !medidaSel) { setPrecios([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('producto_precios').select('grado, precio')
        .eq('producto_id', producto.id).eq('configuracion_id', medidaSel.id)
      if (!ignore) setPrecios(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [distribuidor, producto?.id, medidaSel?.id])

  const precioLookup = useMemo(() => {
    const row = precios.find(p => p.grado === telaSel?.grado)
    return row ? row.precio : null
  }, [precios, telaSel])

  return {
    configuraciones, medidaSel,
    telas, telasDelGrado, gradoSel, telaSel, colorSel,
    galeria, activeImgUrl, setActiveImgUrl,
    precioLookup,
  }
}
