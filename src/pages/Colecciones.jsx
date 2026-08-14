import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function Colecciones() {
  const [products, setProducts] = useState([])
  const [categorias, setCategorias] = useState([])
  const [precios, setPrecios] = useState({})
  const [loading, setLoading] = useState(true)
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null

  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('productos')
          .select('*, categoria:categorias(id, nombre, slug, orden), imagenes:producto_imagenes(id, url, alt, orden, es_principal)')
          .eq('activo', true)
          .order('orden'),
        supabase.from('categorias').select('*').order('orden'),
      ])

      const prods = (prodRes.data ?? []).map(p => {
        // "Imagen principal" en el admin escribe en productos.isometrico_url — esa es
        // la que el usuario elige a propósito para esta tarjeta. Antes esto se ignoraba
        // y se usaba en su lugar la galería (es_principal, marcada automáticamente al
        // subir), que es una foto distinta a la que el admin realmente eligió como
        // "Imagen principal". isometrico_url manda; la galería es solo respaldo si
        // el producto no tiene imagen principal capturada todavía.
        const galeria = p.imagenes?.find(i => i.es_principal) ?? p.imagenes?.[0] ?? null
        return {
          ...p,
          imagen_principal: p.isometrico_url
            ? { url: p.isometrico_url, alt: p.nombre }
            : galeria,
        }
      })
      setProducts(prods)
      setCategorias(catRes.data ?? [])

      if (distribuidor) {
        const { data: pData } = await supabase.from('producto_precios').select('producto_id, precio')
        const map = {}
        ;(pData ?? []).forEach(r => { map[r.producto_id] = r.precio })
        setPrecios(map)
      }

      setLoading(false)
    }
    load()
  }, [distribuidor])

  // Las 4 categorías con el layout nuevo del configurador viven en la URL
  // por path (/configurador/:categoria/:productoSlug) — Colecciones ya no
  // es una vista distinta del configurador, es un link directo con el
  // producto pre-seleccionado. Modulares/Mesas/Butacas (fuera del alcance
  // de esta migración) siguen con la forma vieja por querystring, que es
  // la que su flujo legado todavía sabe leer.
  const STICKY_CATEGORIA_SLUGS = ['camas', 'sofas', 'escuadras-l', 'chaise-lounge']

  const configuradorUrl = (product) => {
    const tipo = product?.categoria?.slug
    const modelo = product?.slug ?? product?.id
    if (!modelo) return '/configurador'
    if (tipo && STICKY_CATEGORIA_SLUGS.includes(tipo)) return `/configurador/${tipo}/${modelo}`
    return tipo ? `/configurador?tipo=${tipo}&modelo=${modelo}` : `/configurador?modelo=${modelo}`
  }

  return (
    <div id="mp">
      <Nav solid />
      <div className="cat-pg">
        <div className="cat-hd">
          <p className="sl">Catálogo</p>
          <h1 className="cat-h1">Nuestro <em>catálogo</em> completo</h1>
        </div>

        {loading ? (
          <div className="cat-loading">CARGANDO…</div>
        ) : (
          categorias.map(cat => {
            const matched = products.filter(p => p.categoria?.id === cat.id)
            if (matched.length === 0) return null
            return (
              <div key={cat.id} className="cat-sec">
                <div className="cat-sec-hd">
                  <h2 className="cat-sec-title">{cat.nombre}</h2>
                  <span className="cat-sec-count">{matched.length}</span>
                </div>
                <div className="pg5">
                  {matched.map(product => (
                    <Link key={product.id} className="pc" to={configuradorUrl(product)}>
                      <div className="pci">
                        <div className="pci-bg">
                          {product.imagen_principal
                            ? <img src={product.imagen_principal.url} alt={product.imagen_principal.alt || product.nombre} />
                            : <div className="pc-init"><span>{product.nombre?.[0]}</span></div>
                          }
                        </div>
                        {product.badge && <span className="pbg">{product.badge}</span>}
                        <div className="pov"><span className="pct">Ver Pieza</span></div>
                      </div>
                      <div className="ptg">{product.categoria?.nombre ?? ''}</div>
                      <div className="pnm">{product.nombre}</div>
                      <div className="pds">{product.subtitulo}</div>
                      <div className="ppr">
                        {distribuidor && precios[product.id] != null
                          ? <>{fmt(precios[product.id])}<small> · desde</small></>
                          : <span style={{ color: 'var(--taupe)', fontSize: 12 }}>Precio a consultar</span>
                        }
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
      <Footer />
    </div>
  )
}
