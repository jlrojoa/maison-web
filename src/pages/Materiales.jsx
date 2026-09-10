// src/pages/Materiales.jsx
//
// Portada de Materiales: una tarjeta por colección (no todos los colores de
// una vez). Cada tarjeta usa como portada la foto del primer color activo de
// esa colección. Clic en la tarjeta -> /materiales/coleccion/:slug, la página
// de la colección con su ficha técnica y el grid completo de sus colores.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const GRADOS_ORDEN = ['AA', 'A', 'B', 'C']

export default function Materiales() {
  const [telas, setTelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroGrado, setFiltroGrado] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('telas')
        .select('*, colores:tela_colores(*)')
        .eq('activo', true)
        .order('orden')
      const conColoresActivos = (data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      })).filter(t => t.colores.length > 0)
      conColoresActivos.sort((a, b) => GRADOS_ORDEN.indexOf(a.grado) - GRADOS_ORDEN.indexOf(b.grado) || a.orden - b.orden)
      setTelas(conColoresActivos)
      setLoading(false)
    }
    load()
  }, [])

  const visibles = useMemo(
    () => telas.filter(t => !filtroGrado || t.grado === filtroGrado),
    [telas, filtroGrado]
  )

  return (
    <div id="mp">
      <Nav solid />
      <div className="cat-pg">
        <div className="cat-hd">
          <p className="sl">Materiales</p>
          <h1 className="cat-h1">Nuestra <em>biblioteca</em> de telas</h1>
        </div>

        {!loading && telas.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '0 24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            <select className="so" value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)} style={{ padding: '10px 14px' }}>
              <option value="">Categoría — todas</option>
              {GRADOS_ORDEN.map(g => <option key={g} value={g}>Categoría {g}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div className="cat-loading">CARGANDO…</div>
        ) : visibles.length === 0 ? (
          <p style={{ color: 'var(--taupe)', fontSize: 13, padding: '0 24px' }}>
            {telas.length === 0 ? 'Aún no hay telas cargadas.' : 'Ninguna colección coincide con ese filtro.'}
          </p>
        ) : (
          <div className="pg5" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            {visibles.map(t => {
              const portada = t.colores[0]
              return (
                <Link key={t.id} className="pc" to={`/materiales/coleccion/${t.slug ?? t.id}`}>
                  <div className="pci">
                    <div className="pci-bg">
                      {portada?.imagen_url ? (
                        <img src={portada.imagen_url} alt={t.nombre} />
                      ) : (
                        <div className="pc-init"><span>{t.nombre?.[0]}</span></div>
                      )}
                    </div>
                    <div className="pov"><span className="pct">Ver Colección</span></div>
                  </div>
                  <div className="ptg">Categoría {t.grado}</div>
                  <div className="pnm">{t.nombre} · {t.colores.length} colores</div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
