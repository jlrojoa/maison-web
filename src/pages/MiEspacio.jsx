// src/pages/MiEspacio.jsx
//
// Panel de cotizaciones del distribuidor, según mi-espacio-mockup.html. El backend
// (cotizaciones, cotizacion_items, emitir_cotizacion(), RLS por distribuidor_email) ya
// existía en Supabase — ver ESTADO-DEL-PROYECTO.md sección 10. Esta página es el frontend
// que faltaba.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
const fmtDate = v => v ? new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function estadoDe(cot) {
  if (cot.status === 'emitida' && cot.vence_at && new Date(cot.vence_at) < new Date()) return 'vencida'
  return cot.status ?? 'borrador'
}

const FILTROS = [
  { key: 'todas', label: 'Todas' },
  { key: 'emitida', label: 'Emitidas' },
  { key: 'borrador', label: 'Borradores' },
  { key: 'vencida', label: 'Vencidas' },
]

export default function MiEspacio() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null
  const loading = ctx?.loading ?? false
  const navigate = useNavigate()

  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [busy, setBusy] = useState(null)

  const load = async () => {
    if (!distribuidor) { setCotizaciones([]); setCargando(false); return }
    setCargando(true)
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*, items:cotizacion_items(*, producto:productos(slug, categoria:categorias(slug)))')
      .eq('distribuidor_email', distribuidor.email)
      .order('created_at', { ascending: false })
    if (!error) setCotizaciones(data ?? [])
    setCargando(false)
  }

  useEffect(() => { load() }, [distribuidor?.email])

  useEffect(() => {
    if (!loading && !distribuidor) navigate('/distribuidores', { replace: true })
  }, [loading, distribuidor, navigate])

  const contar = (key) => key === 'todas' ? cotizaciones.length : cotizaciones.filter(c => estadoDe(c) === key).length
  const visibles = filtro === 'todas' ? cotizaciones : cotizaciones.filter(c => estadoDe(c) === filtro)

  const irAConfigurar = (cot) => {
    const item = cot.items?.[0]
    const tipo = item?.producto?.categoria?.slug
    const modelo = item?.producto?.slug
    if (!modelo) { navigate('/configurador'); return }
    navigate(tipo ? `/configurador?tipo=${tipo}&modelo=${modelo}` : `/configurador?modelo=${modelo}`)
  }

  const emitir = async (cot) => {
    setBusy(cot.id)
    try {
      const { error } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
      if (error) throw error
      await load()
    } catch (err) {
      alert(`Error al emitir: ${err.message}`)
    } finally {
      setBusy(null)
    }
  }

  const eliminar = async (cot) => {
    if (!confirm('¿Eliminar este borrador?')) return
    setBusy(cot.id)
    try {
      await supabase.from('cotizaciones').delete().eq('id', cot.id)
      await load()
    } finally {
      setBusy(null)
    }
  }

  const enviar = (cot) => {
    const item = cot.items?.[0]
    const asunto = encodeURIComponent(`Cotización ${cot.folio ? 'BR-' + cot.folio : ''} — ${item?.producto_nombre ?? ''}`)
    const cuerpo = encodeURIComponent(
      `Hola ${cot.cliente_nombre ?? ''},\n\nAdjunto tu cotización de ${item?.producto_nombre ?? ''} (${item?.configuracion_nombre ?? ''}) en ${item?.textil_nombre ?? ''}.\nPrecio: ${fmt(item?.precio_cliente ?? cot.total)}.\n\nSaludos.`
    )
    if (cot.cliente_email) {
      window.open(`mailto:${cot.cliente_email}?subject=${asunto}&body=${cuerpo}`, '_blank')
    } else if (cot.cliente_telefono) {
      window.open(`https://wa.me/${cot.cliente_telefono.replace(/\D/g, '')}?text=${cuerpo}`, '_blank')
    } else {
      alert('Esta cotización no tiene email ni teléfono de cliente guardado.')
    }
  }

  if (loading || cargando) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#64748B', fontSize: 13 }}>Cargando…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0F172A' }}>
      <Nav />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 64px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 4 }}>Mi Espacio</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 32 }}>Tus cotizaciones guardadas y emitidas</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              style={{
                padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                background: filtro === f.key ? '#0F172A' : '#fff', color: filtro === f.key ? '#fff' : '#64748B', borderColor: filtro === f.key ? '#0F172A' : '#E2E8F0',
              }}
            >
              {f.label} ({contar(f.key)})
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '40px 24px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            {cotizaciones.length === 0
              ? <>Aún no tienes cotizaciones. Créalas desde el <a href="/configurador" style={{ color: '#0F172A' }}>configurador</a>.</>
              : 'No hay cotizaciones en este filtro.'}
          </div>
        ) : visibles.map(cot => {
          const estado = estadoDe(cot)
          const item = cot.items?.[0]
          const badgeStyle = {
            emitida: { background: '#ECFDF5', color: '#047857' },
            borrador: { background: '#F1F5F9', color: '#64748B' },
            vencida: { background: '#FEF2F2', color: '#B91C1C' },
          }[estado]
          return (
            <div key={cot.id} style={{
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px', marginBottom: 12,
              display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 24, alignItems: 'center', opacity: estado === 'vencida' ? 0.7 : 1,
            }}>
              <div style={{ borderRight: '1px solid #F1F5F9', paddingRight: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {cot.folio ? `BR-${cot.folio}` : <span style={{ color: '#94A3B8', fontStyle: 'italic', fontWeight: 400 }}>Sin folio</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(cot.created_at)}</div>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, marginTop: 6, textTransform: 'uppercase', letterSpacing: '.5px', ...badgeStyle }}>
                  {estado === 'emitida' ? 'Emitida' : estado === 'vencida' ? 'Vencida' : 'Borrador'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{item?.producto_nombre ?? cot.nombre_proyecto} · {item?.configuracion_nombre ?? ''}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{item?.textil_nombre ?? '—'} · Para: {cot.cliente_nombre ?? '—'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{fmt(item?.precio_cliente ?? cot.total ?? 0)}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {estado === 'emitida' && `Vigente hasta el ${fmtDate(cot.vence_at)}`}
                  {estado === 'vencida' && `Venció el ${fmtDate(cot.vence_at)}`}
                  {estado === 'borrador' && 'Guardada en tu espacio — sin emitir'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {estado === 'emitida' && (
                  <button type="button" onClick={() => enviar(cot)} style={btnStyle()}>Enviar</button>
                )}
                {estado === 'borrador' && (
                  <>
                    <button type="button" disabled={busy === cot.id} onClick={() => emitir(cot)} style={btnStyle(true)}>{busy === cot.id ? '…' : 'Emitir cotización'}</button>
                    <button type="button" onClick={() => irAConfigurar(cot)} style={btnStyle()}>Editar</button>
                    <button type="button" disabled={busy === cot.id} onClick={() => eliminar(cot)} style={btnStyle()}>Eliminar</button>
                  </>
                )}
                {estado === 'vencida' && (
                  <button type="button" onClick={() => irAConfigurar(cot)} style={btnStyle(true)}>Recotizar</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function btnStyle(primary) {
  return {
    padding: '8px 12px', border: '1px solid #E2E8F0', background: primary ? '#0F172A' : '#fff', color: primary ? '#fff' : '#0F172A',
    borderRadius: 4, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', borderColor: primary ? '#0F172A' : '#E2E8F0',
  }
}
