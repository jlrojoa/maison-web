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
import { generarPdfDeCotizacion, abrirBlob, descargarBlob, abrirPestanaEspera, compartirPdf } from './configurador/cotizacionPdf/pdfActions'
import { useCarrito } from '../lib/cotizacionCarrito'
import { urlParaEditar } from './configurador/cotizacionEdit'
import { TIEMPO_FABRICACION } from './configurador/ModularesConfigurador'

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
  const carrito = useCarrito(distribuidor?.email)

  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [busy, setBusy] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [descargando, setDescargando] = useState(null)
  const [emitida, setEmitida] = useState(null) // cotización recién emitida (banner con acciones)

  // Antes `error` se descartaba en silencio y una falla de query (ej. un
  // 400 por un embed de PostgREST que no puede resolver una relación) se
  // veía exactamente igual que "no tienes cotizaciones" — mismo bug que
  // dejó "Mi Espacio" vacío sin ningún indicio de qué pasaba (JL,
  // 2026-09-02). Ahora el error se guarda y se muestra aparte del estado
  // vacío real.
  const load = async () => {
    if (!distribuidor) { setCotizaciones([]); setErrorCarga(null); setCargando(false); return }
    setCargando(true)
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*, items:cotizacion_items(*, producto:productos(slug, categoria:categorias(slug)))')
      .eq('distribuidor_email', distribuidor.email)
      .order('created_at', { ascending: false })
    if (error) {
      setErrorCarga(error.message)
    } else {
      setErrorCarga(null)
      setCotizaciones(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => { load() }, [distribuidor?.email])

  useEffect(() => {
    if (!loading && !distribuidor) navigate('/distribuidores', { replace: true })
  }, [loading, distribuidor, navigate])

  const contar = (key) => key === 'todas' ? cotizaciones.length : cotizaciones.filter(c => estadoDe(c) === key).length
  const visibles = filtro === 'todas' ? cotizaciones : cotizaciones.filter(c => estadoDe(c) === filtro)

  const tienePdf = (cot) => (cot.items?.length ?? 0) > 0

  // Abre el configurador con la cotización cargada: `editar` actualiza el
  // borrador al guardar; `duplicar` arma lo mismo pero crea una nueva.
  const irAConfigurar = (cot, modo = 'editar') => navigate(urlParaEditar(cot, modo))

  const emitir = async (cot) => {
    setBusy(cot.id)
    const win = tienePdf(cot) ? abrirPestanaEspera() : null
    try {
      const { error } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
      if (error) throw error
      const { data: fresca } = await supabase
        .from('cotizaciones')
        .select('*, items:cotizacion_items(*, producto:productos(slug, categoria:categorias(slug)))')
        .eq('id', cot.id).single()
      await load()
      setEmitida(fresca ?? cot)
      if (fresca && tienePdf(fresca)) {
        const { blob } = await generarPdfDeCotizacion(fresca, TIEMPO_FABRICACION)
        abrirBlob(blob, win)
      }
    } catch (err) {
      win?.close()
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

  // Envía con el PDF adjunto (menú de compartir) o, si el dispositivo no
  // lo permite, descarga el PDF y abre correo/WhatsApp con el texto.
  const enviar = async (cot) => {
    const item = cot.items?.[0]
    if (!cot.cliente_email && !cot.cliente_telefono) {
      alert('Esta cotización no tiene email ni teléfono de cliente guardado.')
      return
    }
    setDescargando(cot.id)
    try {
      const { blob, nombre } = await generarPdfDeCotizacion(cot, TIEMPO_FABRICACION)
      await compartirPdf({
        blob, nombre, email: cot.cliente_email, tel: cot.cliente_telefono,
        asunto: `Cotización ${cot.folio ? 'BR-' + cot.folio : ''} — ${item?.producto_nombre ?? ''}`,
        cuerpo: `Hola ${cot.cliente_nombre ?? ''},\n\nTe comparto tu cotización de ${item?.producto_nombre ?? ''} (${item?.configuracion_nombre ?? ''}) en ${item?.textil_nombre ?? ''}.\nPrecio: ${fmt((cot.items?.length ?? 0) > 1 ? cot.total : (item?.precio_cliente ?? cot.total))}.\n\nSaludos.`,
      })
    } catch (err) {
      alert(`No se pudo preparar el envío: ${err.message}`)
    } finally {
      setDescargando(null)
    }
  }

  // Regenera el PDF desde los datos YA GUARDADOS de esa cotización
  // (secuencia_pdf + cotizacion_items, precios ya congelados) — nunca
  // desde el estado en vivo del configurador, para que "descargar" siga
  // dando el mismo documento aunque el distribuidor esté armando otra
  // cosa en ese momento, o los precios/telas hayan cambiado desde
  // entonces. Solo aplica a cotizaciones de Modulares con secuencia_pdf
  // guardada (ver puedeDescargar más abajo) — las demás categorías no
  // tienen generador de PDF todavía.
  const pdfDe = async (cot, accion) => {
    setDescargando(cot.id)
    // La pestaña se abre en el clic (antes del await) para no ser bloqueada.
    const win = accion === 'ver' ? abrirPestanaEspera() : null
    try {
      const { blob, nombre } = await generarPdfDeCotizacion(cot, TIEMPO_FABRICACION)
      if (accion === 'ver') abrirBlob(blob, win)
      else descargarBlob(blob, nombre)
    } catch (err) {
      win?.close()
      alert(`No se pudo generar el PDF: ${err.message}`)
    } finally {
      setDescargando(null)
    }
  }
  const verPdf = (cot) => pdfDe(cot, 'ver')
  const descargarPdf = (cot) => pdfDe(cot, 'descargar')

  if (loading || cargando) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#64748B', fontSize: 13 }}>Cargando…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0F172A' }}>
      <Nav solid />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 64px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 4 }}>Mi Espacio</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Tus cotizaciones guardadas y emitidas</p>
        <button type="button" onClick={() => navigate('/cotizacion')} style={{ ...btnStyle(true), marginBottom: 24, padding: '10px 16px', fontSize: 13 }}>
          {carrito.lineas.length > 0 ? `Mi cotización en curso (${carrito.lineas.length})` : '+ Nueva cotización'}
        </button>

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

        {emitida && (
          <div role="status" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '16px 24px', marginBottom: 16, color: '#047857', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 200 }}><b>¡Cotización BR-{emitida.folio} emitida!</b> Vigente 15 días.</span>
            {tienePdf(emitida) && (
              <>
                <button type="button" onClick={() => verPdf(emitida)} style={btnStyle(true)}>Ver PDF</button>
                <button type="button" onClick={() => descargarPdf(emitida)} style={btnStyle()}>Descargar PDF</button>
              </>
            )}
            <button type="button" onClick={() => enviar(emitida)} style={btnStyle()}>Enviar</button>
            <button type="button" onClick={() => setEmitida(null)} style={btnStyle()}>Cerrar</button>
          </div>
        )}

        {errorCarga ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '24px', color: '#B91C1C', fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No se pudieron cargar tus cotizaciones.</div>
            <div style={{ marginBottom: 12 }}>{errorCarga}</div>
            <button type="button" onClick={load} style={{ ...btnStyle(), borderColor: '#B91C1C', color: '#B91C1C' }}>Reintentar</button>
          </div>
        ) : visibles.length === 0 ? (
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
          // Solo cotizaciones de Modulares emitidas después de que
          // secuencia_pdf existiera tienen lo necesario para regenerar el
          // PDF (mismo criterio que descargarPdf(), que si no tira error).
          const puedeDescargar = tienePdf(cot)
          return (
            <div key={cot.id} style={{
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px', marginBottom: 12,
              display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 24, alignItems: 'center', opacity: estado === 'vencida' ? 0.7 : 1,
            }}>
              <div style={{ borderRight: '1px solid #F1F5F9', paddingRight: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {cot.folio
                    ? (puedeDescargar
                      ? <button type="button" onClick={() => verPdf(cot)} disabled={descargando === cot.id} title="Ver PDF de esta cotización" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 600, color: '#0F172A', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#CBD5E1' }}>BR-{cot.folio}</button>
                      : `BR-${cot.folio}`)
                    : <span style={{ color: '#94A3B8', fontStyle: 'italic', fontWeight: 400 }}>Sin folio</span>}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(cot.created_at)}</div>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, marginTop: 6, textTransform: 'uppercase', letterSpacing: '.5px', ...badgeStyle }}>
                  {estado === 'emitida' ? 'Emitida' : estado === 'vencida' ? 'Vencida' : 'Borrador'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{(cot.items?.length ?? 0) > 1 ? cot.nombre_proyecto : `${item?.producto_nombre ?? cot.nombre_proyecto} · ${item?.configuracion_nombre ?? ''}`}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{item?.textil_nombre ?? '—'} · Para: {cot.cliente_nombre ?? '—'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{fmt((cot.items?.length ?? 0) > 1 ? (cot.total ?? 0) : (item?.precio_cliente ?? cot.total ?? 0))}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {estado === 'emitida' && `Vigente hasta el ${fmtDate(cot.vence_at)}`}
                  {estado === 'vencida' && `Venció el ${fmtDate(cot.vence_at)}`}
                  {estado === 'borrador' && 'Guardada en tu espacio — sin emitir'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 320 }}>
                {puedeDescargar ? (
                  <>
                    <button type="button" disabled={descargando === cot.id} onClick={() => verPdf(cot)} style={btnStyle()}>{descargando === cot.id ? '…' : 'Ver PDF'}</button>
                    <button type="button" disabled={descargando === cot.id} onClick={() => descargarPdf(cot)} style={btnStyle()}>Descargar PDF</button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>PDF no disponible para esta cotización</span>
                )}
                {estado === 'emitida' && (
                  <>
                    <button type="button" onClick={() => enviar(cot)} style={btnStyle()}>Enviar</button>
                    <button type="button" onClick={() => irAConfigurar(cot, 'duplicar')} style={btnStyle()}>Duplicar</button>
                  </>
                )}
                {estado === 'borrador' && (
                  <>
                    <button type="button" disabled={busy === cot.id} onClick={() => emitir(cot)} style={btnStyle(true)}>{busy === cot.id ? '…' : 'Emitir cotización'}</button>
                    <button type="button" onClick={() => irAConfigurar(cot, 'editar')} style={btnStyle()}>Editar</button>
                    <button type="button" disabled={busy === cot.id} onClick={() => eliminar(cot)} style={btnStyle()}>Eliminar</button>
                  </>
                )}
                {estado === 'vencida' && (
                  <button type="button" onClick={() => irAConfigurar(cot, 'duplicar')} style={btnStyle(true)}>Recotizar</button>
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
