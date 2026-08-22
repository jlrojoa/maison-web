// src/pages/MiEspacioDescargas.jsx
//
// Catálogos, listas de precios y avisos para distribuidores. La seguridad real vive
// en RLS (tabla catalogos + bucket privado 'catalogos', ver Bloque 2) — el redirect de
// abajo es solo UX, no el control de acceso: sin sesión de distribuidor, la consulta a
// `catalogos` ya regresa 0 filas aunque alguien se salte esta pantalla.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import { getCatalogoSignedUrl, TIPO_LABELS } from '../lib/catalogos'
import Nav from '../components/Nav'

function fmtBytes(n) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function MiEspacioDescargas() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null
  const loading = ctx?.loading ?? false
  const navigate = useNavigate()

  const [recursos, setRecursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [descargando, setDescargando] = useState(null)

  useEffect(() => {
    if (!loading && !distribuidor) navigate('/distribuidores', { replace: true })
  }, [loading, distribuidor, navigate])

  useEffect(() => {
    async function load() {
      if (!distribuidor) { setRecursos([]); setCargando(false); return }
      const { data } = await supabase.from('catalogos').select('*')
        .eq('activo', true).order('orden').order('created_at')
      setRecursos(data ?? [])
      setCargando(false)
    }
    load()
  }, [distribuidor?.email])

  const descargar = async (r) => {
    setDescargando(r.id)
    try {
      const url = await getCatalogoSignedUrl(r.storage_path)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      alert(`No se pudo generar la descarga: ${err.message}`)
    } finally {
      setDescargando(null)
    }
  }

  if (!distribuidor) return null

  return (
    <div id="mp">
      <Nav solid />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '140px 24px 80px' }}>
        <p style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 8 }}>Mi Espacio</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 34, color: 'var(--ink)', marginBottom: 32 }}>Descargas</h1>

        {cargando ? (
          <p style={{ color: 'var(--taupe)', fontSize: 13 }}>Cargando…</p>
        ) : recursos.length === 0 ? (
          <p style={{ color: 'var(--taupe)', fontSize: 13 }}>Aún no hay catálogos ni avisos disponibles.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--sand)' }}>
            {recursos.map(r => (
              <div key={r.id} style={{ background: '#fff', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
                    {TIPO_LABELS[r.tipo] ?? r.tipo}
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontFamily: 'var(--serif)' }}>{r.titulo}</div>
                  {r.descripcion && <div style={{ fontSize: 12.5, color: 'var(--taupe)', marginTop: 3 }}>{r.descripcion}</div>}
                  {r.tamano_bytes ? <div style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 3 }}>{fmtBytes(r.tamano_bytes)}</div> : null}
                </div>
                <button
                  className="bcot"
                  style={{ width: 'auto', padding: '10px 22px', flexShrink: 0, opacity: descargando === r.id ? .6 : 1 }}
                  onClick={() => descargar(r)}
                  disabled={descargando === r.id}
                >
                  {descargando === r.id ? 'Generando…' : 'Descargar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
