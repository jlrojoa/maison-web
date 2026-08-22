// src/pages/MaterialDetalle.jsx
//
// Detalle público de un color de tela: specs técnicas + cuidados + los demás
// colores de la misma colección (mismo tela_id). La URL acepta slug O id —
// fallback necesario mientras JL completa slugs/fotos en el admin.
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

export default function MaterialDetalle() {
  const { idOrSlug } = useParams()
  const navigate = useNavigate()
  const [color, setColor] = useState(null)
  const [hermanos, setHermanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setNotFound(false)

      let { data } = await supabase.from('tela_colores')
        .select('*, tela:telas(nombre, grado, descripcion)')
        .eq('slug', idOrSlug).eq('activo', true).maybeSingle()

      if (!data && UUID_RE.test(idOrSlug)) {
        const r = await supabase.from('tela_colores')
          .select('*, tela:telas(nombre, grado, descripcion)')
          .eq('id', idOrSlug).eq('activo', true).maybeSingle()
        data = r.data
      }

      if (ignore) return
      if (!data) { setNotFound(true); setLoading(false); return }

      setColor(data)
      const { data: sibs } = await supabase.from('tela_colores')
        .select('*').eq('tela_id', data.tela_id).eq('activo', true).neq('id', data.id).order('orden')
      if (!ignore) { setHermanos(sibs ?? []); setLoading(false) }
    }
    load()
    return () => { ignore = true }
  }, [idOrSlug])

  if (loading) {
    return (
      <div id="mp">
        <Nav solid />
        <div className="cat-loading" style={{ paddingTop: 160 }}>CARGANDO…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div id="mp">
        <Nav solid />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '160px 24px 80px', textAlign: 'center' }}>
          <p style={{ color: 'var(--taupe)', fontSize: 14, marginBottom: 20 }}>No encontramos esta tela.</p>
          <button className="bb" onClick={() => navigate('/materiales')} style={{ margin: '0 auto' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" /></svg>
            Volver a Materiales
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="mp">
      <Nav solid />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '140px 24px 80px' }}>
        <div className="pnav" style={{ marginBottom: 32 }}>
          <button className="bb" onClick={() => navigate('/materiales')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3L5 8l5 5" /></svg>
            Volver
          </button>
          <span className="bc">Materiales / {color.tela?.nombre ?? ''} / {color.nombre}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ aspectRatio: '1/1', background: color.imagen_url ? undefined : (color.codigo_hex || 'var(--sand)'), borderRadius: 4, overflow: 'hidden' }}>
              {color.imagen_url && <img src={color.imagen_url} alt={color.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
              {color.tela?.nombre}{color.tela?.grado ? ` · Categoría ${color.tela.grado}` : ''}
            </p>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 32, color: 'var(--ink)', marginBottom: 16 }}>{color.nombre}</h1>
            {color.tela?.descripcion && <p style={{ fontSize: 13.5, color: 'var(--taupe)', lineHeight: 1.7, marginBottom: 24 }}>{color.tela.descripcion}</p>}

            <div style={{ borderTop: '1px solid var(--sand)' }}>
              {SPEC_ROWS.filter(([key]) => color[key] != null && color[key] !== '').map(([key, label]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                  <span style={{ color: 'var(--taupe)' }}>{label}</span>
                  <span style={{ color: 'var(--ink)' }}>{color[key]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                <span style={{ color: 'var(--taupe)' }}>Fácil limpieza</span>
                <span style={{ color: 'var(--ink)' }}>{color.facil_limpieza ? 'Sí' : 'No'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                <span style={{ color: 'var(--taupe)' }}>Repelente a líquidos</span>
                <span style={{ color: 'var(--ink)' }}>{color.repelente_liquidos ? 'Sí' : 'No'}</span>
              </div>
            </div>

            {color.cuidados && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 8 }}>Cuidados</p>
                <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{color.cuidados}</p>
              </div>
            )}
          </div>
        </div>

        {hermanos.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <p style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 16 }}>
              Otros colores de {color.tela?.nombre}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {hermanos.map(h => (
                <Link key={h.id} to={`/materiales/${h.slug ?? h.id}`} style={{ textAlign: 'center', textDecoration: 'none' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', marginBottom: 6,
                    background: h.imagen_url ? `url(${h.imagen_url}) center/cover` : (h.codigo_hex || 'var(--sand)'),
                    border: '1px solid var(--sand)',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--taupe)' }}>{h.nombre}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
