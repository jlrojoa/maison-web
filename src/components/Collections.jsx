import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from './ProductCard'

export default function Collections({ onProductClick }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(id, nombre, slug),
          imagenes:producto_imagenes(id, url, alt, orden, es_principal)
        `)
        .eq('activo', true)
        .order('orden')

      if (!error && data) {
        const enriched = data.map(p => ({
          ...p,
          imagen_principal: p.imagenes?.find(i => i.es_principal) ?? p.imagenes?.[0] ?? null
        }))
        setProducts(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section className="coll" id="cl">
      <div className="ch">
        <div>
          <p className="sl rv">Colecciones</p>
          <h2 className="st rv d1">Piezas que <em>definen</em> el espacio</h2>
        </div>
        <a href="#cl" className="la rv d2">Ver todo</a>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.2em' }}>
          CARGANDO…
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.2em' }}>
          PRÓXIMAMENTE
        </div>
      ) : (
        <div className="pg">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onClick={onProductClick} />
          ))}
        </div>
      )}
    </section>
  )
}
