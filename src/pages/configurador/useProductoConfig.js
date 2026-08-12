// src/pages/configurador/useProductoConfig.js
//
// Dado un producto (con id e isometrico_url), carga sus tamaños, telas,
// galería y precio, con TODO arrancando en un valor por defecto (a diferencia
// del flujo legado en Configurador.jsx, que arranca en null y bloquea cada
// paso hasta que el usuario elige). Ver spec:
// docs/superpowers/specs/2026-08-10-configurador-sticky-design.md
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS_ORDEN = ['AA', 'A', 'B', 'C']

export function useProductoConfig(producto, distribuidor) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [medidaSel, setMedidaSel] = useState(null)

  const [telas, setTelas] = useState([])
  const [gradoSel, setGradoSel] = useState(null)
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)

  const [galeria, setGaleria] = useState([])
  const [activeImgUrl, setActiveImgUrl] = useState(null)

  const [precios, setPrecios] = useState([])

  // Dependencia en producto?.id (no en el objeto producto) para no recargar
  // si el objeto se recalcula (ej. useMemo del padre) pero sigue siendo el
  // mismo producto.
  useEffect(() => {
    if (!producto) {
      setConfiguraciones([]); setMedidaSel(null)
      setTelas([]); setGradoSel(null); setTelaSel(null); setColorSel(null)
      setGaleria([]); setActiveImgUrl(null)
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

      const cfgs = cfgRes.data ?? []
      setConfiguraciones(cfgs)
      setMedidaSel(cfgs[0] ?? null)

      const telasConColores = (telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))
      setTelas(telasConColores)

      const gradoDefault = GRADOS_ORDEN.find(g => telasConColores.some(t => t.grado === g)) ?? null
      const telaDefault = telasConColores.find(t => t.grado === gradoDefault) ?? null
      setGradoSel(gradoDefault)
      setTelaSel(telaDefault)
      setColorSel(telaDefault?.colores?.[0] ?? null)

      const imgs = imgRes.data ?? []
      setGaleria(imgs)
      setActiveImgUrl(producto.isometrico_url ?? imgs[0]?.url ?? null)
    }
    load()
    return () => { ignore = true }
  }, [producto?.id])

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

  const selectGrado = (grado) => {
    setGradoSel(grado)
    const t = telas.find(x => x.grado === grado) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }

  const selectTela = (telaId) => {
    const t = telas.find(x => x.id === telaId) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }

  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

  return {
    configuraciones, medidaSel, setMedidaSel,
    telas, telasDelGrado, gradoSel, selectGrado, telaSel, selectTela, colorSel, setColorSel,
    galeria, activeImgUrl, setActiveImgUrl,
    precioLookup,
  }
}
