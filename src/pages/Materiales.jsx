// src/pages/Materiales.jsx
//
// Biblioteca pública de telas, agrupada por catálogo (telas.nombre), catálogos
// ordenados por categoría (telas.grado: AA→A→B→C, el mismo campo que usa el
// configurador para precio) y luego por su propio orden. Dentro de cada
// catálogo, sus colores (tela_colores) en su orden ya definido en el admin.
// Mismas tablas que alimentan el configurador — sin tabla ni admin aparte.
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

  // Los 3 filtros se combinan con AND. El de Color no oculta catálogos completos —
  // filtra los colores DENTRO de cada catálogo por coincidencia parcial de nombre
  // (case-insensitive) y solo oculta el catálogo si ninguno de sus colores calza.
  const visibles = useMemo(() => {
    const texto = filtroColor.trim().toLowerCase()
    return telas
      .filter(t => !filtroGrado || t.grado === filtroGrado)
      .filter(t => !filtroTela || t.id === filtroTela)
      .map(t => ({ ...t, colores: texto ? t.colores.filter(c => c.nombre?.toLowerCase().includes(texto)) : t.colores }))
      .filter(t => t.colores.length > 0)
  }, [telas, filtroGrado, filtroTela, filtroColor])

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
        ) : visibles.length === 0 ? (
          <p style={{ color: 'var(--taupe)', fontSize: 13, padding: '0 24px' }}>
            {telas.length === 0 ? 'Aún no hay telas cargadas.' : 'Ningún color coincide con esos filtros.'}
          </p>
        ) : (
          visibles.map(t => (
            <div key={t.id} className="cat-sec">
              <div className="cat-sec-hd">
                <h2 className="cat-sec-title">{t.nombre}</h2>
                <span className="cat-sec-count">Categoría {t.grado} · {t.colores.length}</span>
              </div>
              <div className="pg5">
                {t.colores.map(c => (
                  <Link key={c.id} className="pc" to={`/materiales/${c.slug ?? c.id}`}>
                    <div className="pci">
                      <div className="pci-bg">
                        {c.imagen_url ? (
                          <img src={c.imagen_url} alt={c.nombre} />
                        ) : (
                          <div className="pc-init" style={{ background: c.codigo_hex || undefined }}><span>{c.nombre?.[0]}</span></div>
                        )}
                      </div>
                      <div className="pov"><span className="pct">Ver Detalle</span></div>
                    </div>
                    <div className="ptg">{t.nombre}</div>
                    <div className="pnm">{c.nombre}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <Footer />
    </div>
  )
}
