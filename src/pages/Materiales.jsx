// src/pages/Materiales.jsx
//
// Portada de Materiales: una tarjeta por colección (no todos los colores de
// una vez), agrupadas en su propia fila por categoría (AA, A, B, C), cada
// grupo con su propio título "Categoría X". Cada tarjeta usa como portada la
// foto del primer color activo, recortada a cuadro (object-fit: cover, clase
// .pci-cover-fill — no toca el .pci-bg img{contain} global de las fichas de
// producto). Clic en la tarjeta -> /materiales/coleccion/:slug.
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
  const [filtroTela, setFiltroTela] = useState('')
  const [filtroColor, setFiltroColor] = useState('')

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

  // "Buscar color" ya no filtra colores sueltos (aquí solo se ven portadas) —
  // filtra qué COLECCIONES tienen al menos un color con ese nombre.
  const visibles = useMemo(() => {
    const texto = filtroColor.trim().toLowerCase()
    return telas
      .filter(t => !filtroGrado || t.grado === filtroGrado)
      .filter(t => !filtroTela || t.id === filtroTela)
      .filter(t => !texto || t.colores.some(c => c.nombre?.toLowerCase().includes(texto)))
  }, [telas, filtroGrado, filtroTela, filtroColor])

  // Agrupadas por categoría, cada grupo en su propia fila con su propio título.
  const grupos = useMemo(() => {
    return GRADOS_ORDEN
      .map(g => ({ grado: g, items: visibles.filter(t => t.grado === g) }))
      .filter(g => g.items.length > 0)
  }, [visibles])

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
            <select className="so" value={filtroTela} onChange={e => setFiltroTela(e.target.value)} style={{ padding: '10px 14px' }}>
              <option value="">Catálogo — todos</option>
              {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <input
              className="so"
              type="text"
              placeholder="Buscar color (ej. Beige)…"
              value={filtroColor}
              onChange={e => setFiltroColor(e.target.value)}
              style={{ padding: '10px 14px', minWidth: 200 }}
            />
          </div>
        )}

        {loading ? (
          <div className="cat-loading">CARGANDO…</div>
        ) : grupos.length === 0 ? (
          <p style={{ color: 'var(--taupe)', fontSize: 13, padding: '0 24px' }}>
            {telas.length === 0 ? 'Aún no hay telas cargadas.' : 'Ninguna colección coincide con esos filtros.'}
          </p>
        ) : (
          grupos.map(({ grado, items }) => (
            <div key={grado} className="cat-sec">
              <div className="cat-sec-hd">
                <h2 className="cat-sec-title">Categoría {grado}</h2>
                <span className="cat-sec-count">{items.length} colección{items.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="pg5">
                {items.map(t => {
                  const portada = t.colores[0]
                  return (
                    <Link key={t.id} className="pc" to={`/materiales/coleccion/${t.slug ?? t.id}`}>
                      <div className="pci">
                        <div className="pci-bg">
                          {portada?.imagen_url ? (
                            <img className="pci-cover-fill" src={portada.imagen_url} alt={t.nombre} />
                          ) : (
                            <div className="pc-init"><span>{t.nombre?.[0]}</span></div>
                          )}
                        </div>
                        <div className="pov"><span className="pct">Ver Colección</span></div>
                      </div>
                      <div className="ptg">{t.nombre}</div>
                      <div className="pnm">{t.colores.length} colores</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
    </div>
  )
}
