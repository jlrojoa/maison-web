// src/pages/MaterialColeccion.jsx
//
// Detalle público de UNA colección: ficha técnica (tomada del primer color
// activo, ya que estos datos se repiten idénticos en todos los colores de la
// misma colección) + el grid completo de sus colores. Clic en un color sigue
// yendo a /materiales/:slug (MaterialDetalle.jsx), sin cambios ahí.
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SPEC_ROWS = [
  ['composicion', 'Composición'],
  ['martindale', 'Martindale'],
  ['resistencia_luz', 'Resistencia a la luz'],
  ['pilling', 'Pilling'],
  ['pais_origen', 'País de origen'],
]

export default function MaterialColeccion() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tela, setTela] = useState(null)
  const [colores, setColores] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setNotFound(false)

      let { data } = await supabase.from('telas')
        .select('*, colores:tela_colores(*)')
        .eq('slug', slug).eq('activo', true).maybeSingle()

      if (!data && UUID_RE.test(slug)) {
        const r = await supabase.from('telas')
          .select('*, colores:tela_colores(*)')
          .eq('id', slug).eq('activo', true).maybeSingle()
        data = r.data
      }

      if (ignore) return
      if (!data) { setNotFound(true); setLoading(false); return }

      const activos = (data.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden)
      setTela(data)
      setColores(activos)
      setLoading(false)
    }
    load()
    return () => { ignore = true }
  }, [slug])

  if (loading) {
    return (
      <div id="mp">
        <Nav solid />
        <div className="cat-loading" style={{ paddingTop: 160 }}>CARGANDO…</div>
      </div>
    )
  }

  if (notFound || colores.length === 0) {
    return (
      <div id="mp">
        <Nav solid />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '160px 24px 80px', textAlign: 'center' }}>
          <p style={{ color: 'var(--taupe)', fontSize: 14, marginBottom: 20 }}>No encontramos esta colección.</p>
          <button className="bb" onClick={() => navigate('/materiales')} style={{ margin: '0 auto' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" /></svg>
            Volver a Materiales
          </button>
        </div>
      </div>
    )
  }

  const ficha = colores[0] // specs técnicas idénticas en todos los colores de la colección
  const portada = colores.find(c => c.es_portada) ?? colores[0]

  return (
    <div id="mp">
      <Nav solid />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '140px 24px 80px' }}>
        <div className="pnav" style={{ marginBottom: 32 }}>
          <button className="bb" onClick={() => navigate('/materiales')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" /></svg>
            Volver
          </button>
          <span className="bc">Materiales / {tela.nombre}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 64 }}>
          <div style={{ aspectRatio: '1/1', borderRadius: 4, overflow: 'hidden' }}>
            {portada.imagen_url && <img src={portada.imagen_url} alt={tela.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>

          <div>
            <p style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
              Categoría {tela.grado} · {colores.length} colores
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 32, color: 'var(--ink)', marginBottom: 16 }}>{tela.nombre}</h1>
            {tela.descripcion && <p style={{ fontSize: 13.5, color: 'var(--taupe)', lineHeight: 1.7, marginBottom: 24 }}>{tela.descripcion}</p>}

            <div style={{ borderTop: '1px solid var(--sand)' }}>
              {SPEC_ROWS.filter(([key]) => ficha[key] != null && ficha[key] !== '').map(([key, label]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                  <span style={{ color: 'var(--taupe)' }}>{label}</span>
                  <span style={{ color: 'var(--ink)' }}>{ficha[key]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                <span style={{ color: 'var(--taupe)' }}>Fácil limpieza</span>
                <span style={{ color: 'var(--ink)' }}>{ficha.facil_limpieza ? 'Sí' : 'No'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                <span style={{ color: 'var(--taupe)' }}>Repelente a líquidos</span>
                <span style={{ color: 'var(--ink)' }}>{ficha.repelente_liquidos ? 'Sí' : 'No'}</span>
              </div>
            </div>

            {ficha.cuidados && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 8 }}>Cuidados</p>
                <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ficha.cuidados}</p>
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 16 }}>
          Colores disponibles
        </p>
        <div className="pg5">
          {colores.map(c => (
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
              <div className="ptg">{tela.nombre}</div>
              <div className="pnm">{c.nombre}</div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
