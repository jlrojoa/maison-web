// src/pages/CotizacionEnCurso.jsx
//
// "Mi cotización": varios muebles (cada uno con su medida, tela, color y
// cantidad) que se guardan juntos como UNA cotización. Se alimenta desde los
// configuradores ("Agregar a la cotización") o desde una cotización guardada
// (Mi Espacio → Editar / Duplicar / Recotizar). Ver lib/cotizacionCarrito.js.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'
import ResultadoCotizacion from './configurador/ResultadoCotizacion'
import { urlEditarLinea } from './configurador/useAgregarACotizacion'
import { cotizacionAlCarrito, guardarCotizacionMulti, refrescarPrecios, parseMargen, conMargen as aplicaMargen } from './configurador/cotizacionEdit'
import { generarPdfDeCotizacion } from './configurador/cotizacionPdf/pdfActions'
import { TIEMPO_FABRICACION } from './configurador/ModularesConfigurador'
import { useCarrito, actualizarLinea, aplicarPrecios as guardarPrecios, quitarLinea, setForm, setEdicion, cargarCarrito, vaciarCarrito } from '../lib/cotizacionCarrito'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
const FORM_VACIO = { cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' }

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }
const input = { width: '100%', padding: '9px 10px', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }
const label = { display: 'block', fontSize: 11, color: '#64748B', margin: '10px 0 4px' }
const btn = (primary) => ({
  padding: '9px 14px', borderRadius: 4, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1px solid ${primary ? '#0F172A' : '#E2E8F0'}`, background: primary ? '#0F172A' : '#fff', color: primary ? '#fff' : '#0F172A',
})

export default function CotizacionEnCurso() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null
  const loading = ctx?.loading ?? false
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = distribuidor?.email
  const carrito = useCarrito(email)
  const { lineas, edicion } = carrito
  const form = carrito.form ?? FORM_VACIO

  const [cargando, setCargando] = useState(!!searchParams.get('cotizacion'))
  const [errorCarga, setErrorCarga] = useState(null)
  const [guardando, setGuardando] = useState(null) // 'borrador' | 'emitir'
  const [resultado, setResultado] = useState(null)
  const [avisoPrecios, setAvisoPrecios] = useState([])
  const cargadaRef = useRef(false)

  useEffect(() => {
    if (!loading && !distribuidor) navigate('/distribuidores', { replace: true })
  }, [loading, distribuidor, navigate])

  // Viene de Mi Espacio: reemplaza la cotización en curso por la guardada.
  useEffect(() => {
    const id = searchParams.get('cotizacion')
    if (!id || !email || cargadaRef.current) return
    cargadaRef.current = true
    cotizacionAlCarrito(id, email, searchParams.get('modo')).then(r => {
      if (r) cargarCarrito(email, r); else setErrorCarga('No se pudo cargar esa cotización.')
      setCargando(false)
      navigate('/cotizacion', { replace: true }) // la URL ya no necesita el parámetro
    })
  }, [email])

  // Precios vigentes: al abrir la pantalla (con la cotización ya cargada) se
  // vuelven a leer; si algo cambió se actualiza y se avisa.
  const aplicarPrecios = async (lista) => {
    const { lineas: nuevas, cambios, nuevos } = await refrescarPrecios(lista)
    if (Object.keys(nuevos).length) guardarPrecios(email, nuevos) // sobre la versión actual de cada línea
    if (cambios.length) setAvisoPrecios(cambios)
    return nuevas
  }
  // Al abrir y cada vez que cambia el conjunto de muebles (agregar/quitar).
  const firma = lineas.map(l => l.key).join(',')
  useEffect(() => {
    if (cargando || !email || lineas.length === 0) return
    aplicarPrecios(lineas)
  }, [cargando, email, firma])

  const markup = parseMargen(form.markup_pct)
  const conMargen = precio => aplicaMargen(precio, markup)
  // Armado: se redondea pieza por pieza, igual que al guardar, para que el total coincida con el PDF.
  const precioCliente = l => (l.tipo === 'modular' ? l.piezas.reduce((sum, p) => sum + conMargen(p.precioUnitario) * p.cantidad, 0) : conMargen(l.precioUnitario))
  const subtotalDist = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0)
  const totalCliente = lineas.reduce((s, l) => s + precioCliente(l) * l.cantidad, 0)
  const editandoBorrador = edicion?.modo === 'editar' && edicion.status === 'borrador'

  const cambiarForm = (campo, valor) => setForm(email, { ...form, [campo]: valor })
  const cambiarCantidad = (l, d) => actualizarLinea(email, l.key, { cantidad: Math.min(99, Math.max(1, l.cantidad + d)) })

  const guardar = async (modo) => {
    if (lineas.length === 0) return
    if (!form.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setGuardando(modo)
    try {
      const vigentes = await aplicarPrecios(lineas)
      const { cot, items, total } = await guardarCotizacionMulti({ distribuidor, lineas: vigentes, form, edicion })
      // Si algo falla de aquí en adelante, reintentar actualiza este mismo borrador (no crea otro).
      setEdicion(email, { id: cot.id, modo: 'editar', status: 'borrador', folio: cot.folio })
      if (modo === 'emitir') {
        const { error } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
        if (error) throw error
      }
      let pdfBlob = null, pdfNombre = null, pdfError = null, folio = cot.folio
      try {
        const { data: fresca } = await supabase.from('cotizaciones').select('*').eq('id', cot.id).single()
        folio = fresca?.folio ?? folio
        const r = await generarPdfDeCotizacion({ ...(fresca ?? cot), items }, TIEMPO_FABRICACION)
        pdfBlob = r.blob; pdfNombre = r.nombre
      } catch (err) { pdfError = err.message }
      setResultado({
        folio, modo, pdfBlob, pdfNombre, pdfError, nombre: form.cliente_nombre.trim(),
        email: form.cliente_email.trim(), tel: form.cliente_telefono.trim(), precio: total,
      })
      vaciarCarrito(email)
    } catch (err) {
      alert(`Error al guardar la cotización: ${err.message}`)
    } finally {
      setGuardando(null)
    }
  }

  if (loading || cargando) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#64748B', fontSize: 13 }}>Cargando…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0F172A' }}>
      <Nav solid />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 64px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 4 }}>Mi cotización</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
          {edicion
            ? (editandoBorrador
              ? `Editando tu borrador${edicion.folio ? ' BR-' + edicion.folio : ''} — al guardar se actualiza.`
              : `Basada en ${edicion.folio ? 'BR-' + edicion.folio : 'una cotización anterior'} — al guardar se crea una nueva.`)
            : 'Agrega todos los muebles que quiera tu cliente, ajusta cantidades y guarda una sola cotización.'}
        </p>
        {avisoPrecios.length > 0 && (
          <div role="status" style={{ ...card, padding: 14, background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E', marginBottom: 16, fontSize: 13 }}>
            Actualizamos los precios vigentes de: {avisoPrecios.join(', ')}.
          </div>
        )}
        {errorCarga && <div style={{ ...card, padding: 16, color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA', marginBottom: 16, fontSize: 13 }}>{errorCarga}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }} className="cot-grid">
          <div style={{ pointerEvents: guardando ? 'none' : 'auto', opacity: guardando ? 0.6 : 1 }}>
            {lineas.length === 0 ? (
              <div style={{ ...card, padding: '40px 24px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                Tu cotización está vacía.<br />
                <button type="button" onClick={() => navigate('/configurador')} style={{ ...btn(true), marginTop: 14 }}>Agregar un mueble</button>
              </div>
            ) : lineas.map(l => (
              <div key={l.key} style={{ ...card, padding: 16, marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {l.tipo === 'modular' ? (
                  // Armado: la imagen de cada módulo pedido, no del mueble armado.
                  <div style={{ width: 170, display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start', flexShrink: 0 }}>
                    {l.piezas.map((p, i) => (
                      <div key={i} title={`${p.cantidad} × ${p.nombre}`} style={{ position: 'relative', width: 52, height: 46, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.imagenUrl ? <img src={p.imagenUrl} alt={p.nombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 8, color: '#94A3B8', textAlign: 'center' }}>{p.nombre.slice(0, 14)}</span>}
                        {p.cantidad > 1 && <span style={{ position: 'absolute', right: 2, bottom: 2, background: '#0F172A', color: '#fff', fontSize: 9, borderRadius: 8, padding: '0 5px' }}>×{p.cantidad}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ width: 110, height: 90, background: '#F1F5F9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {l.imagenUrl ? <img src={l.imagenUrl} alt={l.productoNombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 10, color: '#94A3B8' }}>Sin imagen</span>}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  {l.tipo === 'modular' ? (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{l.productoNombre} · {l.nombreArmado} <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B' }}>(armado modular{l.mirrored ? ', espejo' : ''})</span></div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                        {l.piezas.map(p => `${p.cantidad} × ${p.nombre}`).join(' · ')}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{l.telaNombre} ({l.telaGrado}) · {l.colorNombre}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{l.productoNombre} · {l.medidaNombre}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                        {l.dimensiones ? `${l.dimensiones} · ` : ''}{l.telaNombre} ({l.telaGrado}) · {l.colorNombre}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                    {fmt(precioCliente(l))} {l.tipo === 'modular' ? 'por armado' : 'c/u'}{markup ? ` (con tu margen de ${markup}%)` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" aria-label="Menos" onClick={() => cambiarCantidad(l, -1)} disabled={l.cantidad <= 1} style={{ ...btn(), padding: '4px 10px' }}>−</button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{l.cantidad}</span>
                    <button type="button" aria-label="Más" onClick={() => cambiarCantidad(l, 1)} disabled={l.cantidad >= 99} style={{ ...btn(), padding: '4px 10px' }}>+</button>
                    <button type="button" onClick={() => navigate(urlEditarLinea(l))} disabled={l.tipo !== 'modular' && (!l.productoSlug || !l.categoriaSlug)} title="Cambiar medida, tela o color" style={{ ...btn(), marginLeft: 10, fontSize: 12 }}>Editar</button>
                    <button type="button" onClick={() => quitarLinea(email, l.key)} style={{ ...btn(), fontSize: 12 }}>Eliminar</button>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, alignSelf: 'flex-start' }}>{fmt(precioCliente(l) * l.cantidad)}</div>
              </div>
            ))}
            {lineas.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => navigate('/configurador')} style={btn()}>+ Agregar otro mueble</button>
                <button type="button" onClick={() => { if (confirm('¿Vaciar toda la cotización?')) vaciarCarrito(email) }} style={btn()}>Vaciar</button>
              </div>
            )}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Cliente</div>
            <label style={label}>Nombre del cliente *</label>
            <input style={input} value={form.cliente_nombre} onChange={e => cambiarForm('cliente_nombre', e.target.value)} />
            <label style={label}>Email del cliente</label>
            <input style={input} value={form.cliente_email} onChange={e => cambiarForm('cliente_email', e.target.value)} />
            <label style={label}>Teléfono del cliente</label>
            <input style={input} value={form.cliente_telefono} onChange={e => cambiarForm('cliente_telefono', e.target.value)} />
            <label style={label}>Tu margen (%)</label>
            <input style={input} type="number" min="0" max="500" inputMode="decimal" value={form.markup_pct} onChange={e => cambiarForm('markup_pct', e.target.value)} />
            <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}><span>Precio distribuidor</span><span>{fmt(subtotalDist)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, marginTop: 6 }}><span>Total para tu cliente</span><span>{fmt(totalCliente)}</span></div>
            </div>
            <button type="button" disabled={lineas.length === 0 || !!guardando} onClick={() => guardar('emitir')} style={{ ...btn(true), width: '100%', marginTop: 16 }}>
              {guardando === 'emitir' ? 'Emitiendo…' : 'Crear cotización (emitir)'}
            </button>
            <button type="button" disabled={lineas.length === 0 || !!guardando} onClick={() => guardar('borrador')} style={{ ...btn(), width: '100%', marginTop: 8 }}>
              {guardando === 'borrador' ? 'Guardando…' : editandoBorrador ? 'Guardar cambios del borrador' : 'Guardar como borrador'}
            </button>
          </div>
        </div>
      </div>

      {resultado && (
        <div className="cfg-modal-overlay">
          <div className="cfg-modal-box">
            <ResultadoCotizacion resultado={resultado} onClose={() => { setResultado(null); navigate('/configurador') }} />
          </div>
        </div>
      )}
      <style>{`@media (max-width: 820px) { .cot-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
