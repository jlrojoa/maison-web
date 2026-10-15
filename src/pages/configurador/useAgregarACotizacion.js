// src/pages/configurador/useAgregarACotizacion.js
//
// Acciones de los configuradores de producto único sobre la "cotización en
// curso" (ver lib/cotizacionCarrito.js): agregar el mueble configurado,
// o —si se llegó con ?linea=ID desde la cotización— actualizar esa línea.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCarrito, agregarLinea, actualizarLinea } from '../../lib/cotizacionCarrito'

const STICKY = ['camas', 'sofas', 'escuadras-l', 'chaise-lounge']

// URL del configurador para editar una línea (selección precargada).
export function urlEditarLinea(l) {
  if (l.tipo === 'modular') return `/configurador/modulares?linea=${l.key}`
  if (!l.categoriaSlug || !l.productoSlug) return '/configurador'
  const q = new URLSearchParams()
  if (STICKY.includes(l.categoriaSlug)) {
    if (l.medidaNombre) q.set('tamano', l.medidaNombre)
    if (l.telaNombre) q.set('tela', l.telaNombre)
    if (l.colorNombre) q.set('color', l.colorNombre)
    q.set('linea', l.key)
    return `/configurador/${l.categoriaSlug}/${l.productoSlug}?${q}`
  }
  q.set('tipo', l.categoriaSlug); q.set('modelo', l.productoSlug)
  if (l.medidaNombre) q.set('medida', l.medidaNombre)
  if (l.telaNombre) q.set('tela', l.telaNombre)
  if (l.colorNombre) q.set('color', l.colorNombre)
  q.set('linea', l.key)
  return `/configurador?${q}`
}

export function useAgregarACotizacion({ distribuidor, categoriaSlug, producto, medidaSel, telaSel, colorSel, precioLookup }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [lineaKey] = useState(() => searchParams.get('linea')) // se lee una vez: el configurador reescribe la URL
  const [aviso, setAviso] = useState(false)
  const carrito = useCarrito(distribuidor?.email)

  const editandoLinea = !!lineaKey && carrito.lineas.some(l => l.key === lineaKey)
  const puede = !!(distribuidor && producto && medidaSel && telaSel && colorSel && precioLookup != null)

  const construir = () => ({
    tipo: 'mueble', categoriaSlug, productoSlug: producto.slug, productoId: producto.id, productoNombre: producto.nombre,
    imagenUrl: producto.isometrico_url ?? null,
    configuracionId: medidaSel.id, medidaNombre: medidaSel.nombre, dimensiones: medidaSel.dimensiones ?? null,
    telaNombre: telaSel.nombre, telaGrado: telaSel.grado, colorNombre: colorSel.nombre,
    precioUnitario: precioLookup,
  })

  const agregar = () => {
    if (!puede) return
    agregarLinea(distribuidor.email, { ...construir(), cantidad: 1 })
    setAviso(true)
    setTimeout(() => setAviso(false), 4000)
  }
  const actualizar = () => {
    if (!puede || !editandoLinea) return
    actualizarLinea(distribuidor.email, lineaKey, construir())
    navigate('/cotizacion')
  }
  const verCotizacion = () => navigate('/cotizacion')

  return { n: carrito.lineas.length, puede, editandoLinea, aviso, agregar, actualizar, verCotizacion }
}
