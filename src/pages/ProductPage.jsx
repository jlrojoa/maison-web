import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import ProductDetail from './ProductDetail'

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const QUERY = `*, categoria:categorias(id, nombre, slug), imagenes:producto_imagenes(id, url, alt, orden, es_principal)`

      let { data } = await supabase.from('productos').select(QUERY).eq('slug', slug).maybeSingle()

      // Fall back to querying by id (for products without a slug)
      if (!data) {
        const res = await supabase.from('productos').select(QUERY).eq('id', slug).maybeSingle()
        data = res.data
      }

      if (data) {
        setProduct({
          ...data,
          imagen_principal: data.imagenes?.find(i => i.es_principal) ?? data.imagenes?.[0] ?? null,
        })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.2em' }}>
        CARGANDO…
      </div>
    )
  }

  if (!product) {
    navigate('/colecciones', { replace: true })
    return null
  }

  return (
    <>
      <Nav />
      <ProductDetail product={product} onBack={() => navigate(-1)} />
    </>
  )
}
