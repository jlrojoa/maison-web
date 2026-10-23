// src/admin/cotizaciones/CotizacionEditor.jsx
//
// Crear / editar una cotización desde el admin. Los datos fijos (empresa, logo,
// términos, vigencia, IVA…) se capturan UNA vez en "Ajustes de cotización" y se
// copian a cada cotización nueva; aquí se pueden cambiar solo para esa cotización.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from '../catalogo/AdminAuthContext'
import { useCatalogo } from './useCatalogo'
import LineaCard from './LineaCard'
import {
  CLIENTE_VACIO, ESTADOS, LINEA_VACIA, ajustesIniciales, borrarCotizacion, cambiarEstado, duplicarCotizacion, estadoDe,
  folioDe, guardarCliente, guardarCotizacion, leerAjustes, leerCotizacion, lineaDeItem, listarClientes, nuevaClave,
} from './api'
import { fmtMx, num, totales } from './calc'
import { abrirBlob, abrirPestanaEspera, descargarBlob } from '../../pages/configurador/cotizacionPdf/pdfActions'
import './cotizaciones.css'

const Campo = ({ label, children, hint, style }) => (
  <div className="adm-field" style={{ marginBottom: 12, ...style }}>
    <label className="adm-label">{label}</label>
    {children}
    {hint ? <div className="adm-form-hint">{hint}</div> : null}
  </div>
)
const W = { width: '100%' }

export default function CotizacionEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { email: adminEmail } = useAdminAuth()
  const cat = useCatalogo()

  const [cargando, setCargando] = useState(true)
  const [fijos, setFijos] = useState(null)
  const [clientes, setClientes] = useState([])
  const [cot, setCot] = useState(null)
  const [proyecto, setProyecto] = useState('')
  const [cliente, setCliente] = useState({ ...CLIENTE_VACIO })
  const [clienteId, setClienteId] = useState(null)
  const [ajustes, setAjustes] = useState(null)
  const [lineas, setLineas] = useState([])
  const [notasInternas, setNotasInternas] = useState('')
  const [sucio, setSucio] = useState(false)
  const [ocupado, setOcupado] = useState(null) // 'guardar' | 'pdf' | 'descargar' | 'emitir'
  const [aviso, setAviso] = useState(null)
  const avisoTimer = useRef(null)

  const mostrar = (texto, error = false) => {
    setAviso({ texto, error }); clearTimeout(avisoTimer.current)
    avisoTimer.current = setTimeout(() => setAviso(null), error ? 9000 : 3500)
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setCargando(true)
      try {
        const [f, cl] = await Promise.all([leerAjustes(), listarClientes()])
        if (ignore) return
        setFijos(f); setClientes(cl)
        if (id) {
          const c = await leerCotizacion(id)
          if (ignore) return
          setCot(c)
          setProyecto(c.nombre_proyecto ?? '')
          setCliente({ ...CLIENTE_VACIO, nombre: c.cliente_nombre ?? '', email: c.cliente_email ?? '', telefono: c.cliente_telefono ?? '', ...(c.cliente_datos ?? {}) })
          setClienteId(c.cliente_id ?? null)
          setAjustes({ ...ajustesIniciales(f), ...(c.ajustes ?? {}) })
          setLineas(c.items.map(lineaDeItem))
          setNotasInternas(c.notas_internas ?? '')
        } else {
          setAjustes(ajustesIniciales(f))
          setLineas([LINEA_VACIA()])
          const pre = cl.find(x => x.id === location.state?.clienteId) // viene de Clientes → "Cotizar"
          if (pre) {
            setClienteId(pre.id)
            setCliente({ nombre: pre.nombre ?? '', empresa: pre.empresa ?? '', rfc: pre.rfc ?? '', email: pre.email ?? '', telefono: pre.telefono ?? '', direccion: pre.direccion ?? '', notas: pre.notas ?? '' })
          }
        }
        setSucio(false)
      } catch (err) { mostrar(`No se pudo cargar: ${err.message}`, true) } finally { if (!ignore) setCargando(false) }
    })()
    return () => { ignore = true }
  }, [id])

  useEffect(() => {
    if (!sucio) return undefined
    const f = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sucio])

  const soloLectura = !!cot && cot.origen !== 'admin'
  const t = useMemo(() => (ajustes ? totales(lineas, ajustes) : null), [lineas, ajustes])
  const marcar = (fn) => (...a) => { fn(...a); setSucio(true) }

  const cambiarLinea = marcar((key, patch) => setLineas(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l))))
  const quitarLinea = marcar((key) => setLineas(ls => ls.filter(l => l.key !== key)))
  const duplicarLinea = marcar((key) => setLineas(ls => { const i = ls.findIndex(l => l.key === key); const c = { ...ls[i], key: nuevaClave(), medidas_cm: { ...ls[i].medidas_cm } }; return [...ls.slice(0, i + 1), c, ...ls.slice(i + 1)] }))
  const moverLinea = marcar((key, d) => setLineas(ls => { const i = ls.findIndex(l => l.key === key); const j = i + d; if (j < 0 || j >= ls.length) return ls; const c = [...ls]; [c[i], c[j]] = [c[j], c[i]]; return c }))
  const setAj = marcar((k, v) => setAjustes(a => ({ ...a, [k]: v })))
  const setCli = marcar((k, v) => { setCliente(c => ({ ...c, [k]: v })) })

  const elegirCliente = marcar((cid) => {
    if (!cid) { setClienteId(null); return }
    const c = clientes.find(x => x.id === cid)
    if (!c) return
    setClienteId(c.id)
    setCliente(prev => ({ nombre: c.nombre ?? '', empresa: c.empresa ?? '', rfc: c.rfc ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '', notas: c.notas ?? '', direccion_entrega: prev.direccion_entrega ?? '' }))
  })

  const guardarEnDirectorio = async () => {
    try {
      const { direccion_entrega, ...paraDirectorio } = cliente // eslint-disable-line no-unused-vars
      const guardado = await guardarCliente({ ...(clienteId ? { id: clienteId } : {}), ...paraDirectorio })
      setClientes(await listarClientes()); setClienteId(guardado.id)
      mostrar(clienteId ? 'Cliente actualizado en el directorio.' : 'Cliente guardado en el directorio.')
    } catch (err) { mostrar(err.message, true) }
  }

  const guardar = async (status) => {
    setOcupado(status === 'emitida' ? 'emitir' : 'guardar')
    try {
      const guardada = await guardarCotizacion({ id: cot?.id, adminEmail, proyecto, cliente, clienteId, ajustes, lineas, notasInternas })
      let final = guardada
      if (status === 'emitida') final = await cambiarEstado(guardada, 'emitida')
      setCot({ ...final, items: [] }); setSucio(false)
      mostrar(status === 'emitida' ? `Cotización ${folioDe(final)} emitida.` : 'Cotización guardada.')
      if (!id) navigate(`/admin/cotizaciones/${final.id}`, { replace: true })
      return final
    } catch (err) { mostrar(`No se pudo guardar: ${err.message}`, true); return null } finally { setOcupado(null) }
  }

  const emitir = async () => {
    if (!cliente.nombre.trim()) return mostrar('Para emitir, escribe el nombre del cliente.', true)
    if (lineas.length === 0) return mostrar('Agrega al menos un mueble.', true)
    const sinPrecio = lineas.findIndex(l => !(num(l.precio) > 0))
    if (sinPrecio >= 0) return mostrar(`La línea ${sinPrecio + 1} no tiene precio.`, true)
    if (!window.confirm('Al emitir se fija la fecha y empieza la vigencia. Después puedes seguir editándola. ¿Emitir?')) return
    await guardar('emitida')
  }

  const pdf = async (accion) => {
    const win = accion === 'pdf' ? abrirPestanaEspera() : null
    setOcupado(accion)
    try {
      const { generarPdfAdmin } = await import('./generarPdf')
      const { blob, nombre } = await generarPdfAdmin({ cot, proyecto, cliente, ajustes, fijos, lineas })
      if (accion === 'pdf') abrirBlob(blob, win); else descargarBlob(blob, nombre)
    } catch (err) { win?.close(); mostrar(`No se pudo generar el PDF: ${err.message}`, true) } finally { setOcupado(null) }
  }

  const cambiarStatus = async (status) => {
    if (!cot?.id || status === cot.status) return
    try { const n = await cambiarEstado(cot, status); setCot(c => ({ ...c, ...n })); mostrar(`Estado: ${ESTADOS.find(e => e.key === status)?.label}.`) } catch (err) { mostrar(err.message, true) }
  }
  const duplicar = async () => {
    try { const n = await duplicarCotizacion(cot.id, adminEmail, fijos); mostrar('Copia creada como borrador.'); navigate(`/admin/cotizaciones/${n.id}`) } catch (err) { mostrar(err.message, true) }
  }
  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar la cotización ${folioDe(cot)}? No se puede deshacer.`)) return
    try { await borrarCotizacion(cot.id); setSucio(false); navigate('/admin/cotizaciones', { replace: true }) } catch (err) { mostrar(err.message, true) }
  }

  const setTermino = marcar((i, k, v) => setAjustes(a => ({ ...a, terminos: a.terminos.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })))

  if (cargando || !ajustes || !cat.listo) return <div className="adm-content"><div className="adm-empty-note">Cargando…</div></div>
  const est = cot ? estadoDe(cot) : ESTADOS[0]

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">{cot ? `Cotización ${folioDe(cot)}` : 'Nueva cotización'}</div>
          <div className="adm-breadcrumb"><Link to="/admin/cotizaciones" style={{ color: 'inherit' }}>Cotizaciones</Link> › {cot ? (proyecto || 'Sin nombre') : 'Nueva'}
            {cot && <span className="cz-estado" style={{ color: est.color, background: est.bg, marginLeft: 10 }}>{est.label}</span>}
            {sucio && <span className="cz-sucio">· cambios sin guardar</span>}
          </div>
        </div>
      </div>
      {aviso && <div className={`cz-aviso ${aviso.error ? 'cz-aviso-error' : ''}`} role="status">{aviso.texto}</div>}

      <div className="adm-content cz-layout">
        <div className="cz-main">
          {soloLectura && (
            <div className="cz-banner">
              Esta cotización la hizo un distribuidor ({cot.distribuidor_email}); aquí se puede revisar y generar su PDF.
              Para modificarla, <button type="button" className="cz-link" onClick={duplicar}>crea una copia editable</button>.
            </div>
          )}

          <div className="adm-card">
            <div className="adm-card-title">Proyecto y cliente</div>
            <div className="adm-card-sub">Elige un cliente del directorio o escríbelo; los datos se guardan en esta cotización.</div>
            <fieldset disabled={soloLectura} className="cz-fieldset">
              <div className="adm-field-row">
                <Campo label="Nombre del proyecto"><input className="adm-input" style={W} value={proyecto} onChange={e => { setProyecto(e.target.value); setSucio(true) }} placeholder="Ej. Sala y recámara principal" /></Campo>
                <Campo label="Cliente del directorio">
                  <select className="adm-select" style={{ ...W, minWidth: 0 }} value={clienteId ?? ''} onChange={e => elegirCliente(e.target.value)}>
                    <option value="">— Escribir manualmente —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` · ${c.empresa}` : ''}</option>)}
                  </select>
                </Campo>
              </div>
              <div className="adm-field-row">
                <Campo label="Nombre"><input className="adm-input" style={W} value={cliente.nombre} onChange={e => setCli('nombre', e.target.value)} /></Campo>
                <Campo label="Empresa"><input className="adm-input" style={W} value={cliente.empresa} onChange={e => setCli('empresa', e.target.value)} /></Campo>
                <Campo label="RFC"><input className="adm-input" style={W} value={cliente.rfc} onChange={e => setCli('rfc', e.target.value)} /></Campo>
              </div>
              <div className="adm-field-row">
                <Campo label="Correo"><input className="adm-input" style={W} type="email" value={cliente.email} onChange={e => setCli('email', e.target.value)} /></Campo>
                <Campo label="Teléfono"><input className="adm-input" style={W} value={cliente.telefono} onChange={e => setCli('telefono', e.target.value)} /></Campo>
              </div>
              <div className="adm-field-row">
                <Campo label="Dirección del cliente"><input className="adm-input" style={W} value={cliente.direccion} onChange={e => setCli('direccion', e.target.value)} /></Campo>
                <Campo label="Dirección de entrega" hint="Solo de esta cotización."><input className="adm-input" style={W} value={cliente.direccion_entrega ?? ''} onChange={e => setCli('direccion_entrega', e.target.value)} /></Campo>
              </div>
              {!soloLectura && <button type="button" className="adm-btn-sm" onClick={guardarEnDirectorio} disabled={!cliente.nombre.trim()}>{clienteId ? 'Actualizar en el directorio' : 'Guardar en el directorio de clientes'}</button>}
            </fieldset>
          </div>

          <div className="adm-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="cz-seccion-titulo">Muebles y conceptos</div>
            {lineas.length === 0 && <div className="adm-empty-note">Aún no hay muebles en esta cotización.</div>}
            {lineas.map((l, i) => (
              <LineaCard key={l.key} linea={l} index={i} total={lineas.length} cat={cat} disabled={soloLectura}
                onChange={p => cambiarLinea(l.key, p)} onDelete={() => quitarLinea(l.key)} onDuplicate={() => duplicarLinea(l.key)} onMove={d => moverLinea(l.key, d)} />
            ))}
            {!soloLectura && (
              <div className="cz-fila-botones" style={{ marginTop: 8 }}>
                <button type="button" className="adm-btn adm-btn-dark" onClick={marcar(() => setLineas(ls => [...ls, LINEA_VACIA()]))}>+ Agregar mueble del catálogo</button>
                <button type="button" className="adm-btn" onClick={marcar(() => setLineas(ls => [...ls, { ...LINEA_VACIA(), es_libre: true }]))}>+ Concepto libre (flete, instalación, a la medida…)</button>
              </div>
            )}
          </div>

          <div className="adm-card">
            <div className="adm-card-title">Condiciones de esta cotización</div>
            <div className="adm-card-sub">Arrancan con tus ajustes fijos; lo que cambies aquí solo afecta a esta cotización.</div>
            <fieldset disabled={soloLectura} className="cz-fieldset">
              <div className="adm-field-row">
                <Campo label="Descuento general %"><input className="adm-input" style={W} type="number" min="0" max="100" step="0.5" value={ajustes.descuento_pct} onChange={e => setAj('descuento_pct', e.target.value)} /></Campo>
                <Campo label="Descuento general en pesos"><input className="adm-input" style={W} type="number" min="0" step="1" value={ajustes.descuento_monto} onChange={e => setAj('descuento_monto', e.target.value)} /></Campo>
                <Campo label="IVA">
                  <select className="adm-select" style={{ ...W, minWidth: 0 }} value={ajustes.iva_modo} onChange={e => setAj('iva_modo', e.target.value)}>
                    <option value="ninguno">No mostrar IVA</option>
                    <option value="sumar">Sumar IVA al subtotal</option>
                    <option value="incluido">Precios ya incluyen IVA</option>
                  </select>
                </Campo>
                {ajustes.iva_modo !== 'ninguno' && <Campo label="IVA %"><input className="adm-input" style={W} type="number" min="0" step="0.5" value={ajustes.iva_pct} onChange={e => setAj('iva_pct', e.target.value)} /></Campo>}
              </div>
              <div className="adm-field-row">
                <Campo label="Anticipo %" hint="Vacío = no se muestra anticipo."><input className="adm-input" style={W} type="number" min="0" max="100" step="1" value={ajustes.anticipo_pct} onChange={e => setAj('anticipo_pct', e.target.value)} /></Campo>
                <Campo label="Vigencia (días)"><input className="adm-input" style={W} type="number" min="1" step="1" value={ajustes.vigencia_dias} onChange={e => setAj('vigencia_dias', e.target.value)} /></Campo>
                <Campo label="Tiempo de entrega"><input className="adm-input" style={W} value={ajustes.tiempo_entrega} onChange={e => setAj('tiempo_entrega', e.target.value)} placeholder="Ej. 6 a 8 semanas" /></Campo>
              </div>
              <Campo label="Condiciones de pago"><textarea className="adm-textarea" style={{ minHeight: 56 }} value={ajustes.condiciones_pago} onChange={e => setAj('condiciones_pago', e.target.value)} /></Campo>
              <Campo label="Datos para depósito o transferencia">
                <textarea className="adm-textarea" style={{ minHeight: 56 }} value={ajustes.datos_bancarios} onChange={e => setAj('datos_bancarios', e.target.value)} />
                <label className="cz-check"><input type="checkbox" checked={!!ajustes.mostrar_datos_bancarios} onChange={e => setAj('mostrar_datos_bancarios', e.target.checked)} /> Mostrar en el PDF</label>
              </Campo>
              <Campo label="Notas para el cliente (salen en el PDF)"><textarea className="adm-textarea" value={ajustes.notas} onChange={e => setAj('notas', e.target.value)} /></Campo>
              <Campo label="Notas internas (NO salen en el PDF)"><textarea className="adm-textarea" style={{ minHeight: 56 }} value={notasInternas} onChange={e => { setNotasInternas(e.target.value); setSucio(true) }} /></Campo>
            </fieldset>
          </div>

          <div className="adm-card">
            <div className="adm-card-header">
              <div><div className="adm-card-title">Términos y condiciones</div><div className="adm-card-sub">Salen en el PDF. Edítalos aquí solo para esta cotización.</div></div>
              {!soloLectura && fijos && <button type="button" className="adm-btn-sm" onClick={marcar(() => setAjustes(a => ({ ...a, terminos: (fijos.terminos ?? []).map(x => ({ ...x })) })))}>Restaurar los fijos</button>}
            </div>
            <fieldset disabled={soloLectura} className="cz-fieldset">
              {(ajustes.terminos ?? []).map((x, i) => (
                <div key={i} className="cz-termino">
                  <input className="adm-input" style={W} value={x.titulo} onChange={e => setTermino(i, 'titulo', e.target.value)} placeholder="Título" />
                  <textarea className="adm-textarea" style={{ minHeight: 56 }} value={x.texto} onChange={e => setTermino(i, 'texto', e.target.value)} />
                  {!soloLectura && <button type="button" className="adm-icon-btn" title="Quitar" onClick={marcar(() => setAjustes(a => ({ ...a, terminos: a.terminos.filter((_, j) => j !== i) })))}>✕</button>}
                </div>
              ))}
              {!soloLectura && <button type="button" className="adm-btn-sm" onClick={marcar(() => setAjustes(a => ({ ...a, terminos: [...(a.terminos ?? []), { titulo: '', texto: '' }] })))}>+ Agregar término</button>}
            </fieldset>
          </div>
        </div>

        <aside className="cz-side">
          <div className="adm-card cz-resumen">
            <div className="adm-card-title" style={{ marginBottom: 12 }}>Resumen</div>
            <div className="cz-tot"><span>Subtotal</span><b>{fmtMx(t.subtotal)}</b></div>
            {t.descuento > 0 && <div className="cz-tot"><span>Descuento</span><b>− {fmtMx(t.descuento)}</b></div>}
            {ajustes.iva_modo === 'sumar' && <div className="cz-tot"><span>IVA {num(ajustes.iva_pct)}%</span><b>{fmtMx(t.iva)}</b></div>}
            {ajustes.iva_modo === 'incluido' && <div className="cz-tot cz-tenue"><span>IVA incluido {num(ajustes.iva_pct)}%</span><b>{fmtMx(t.iva)}</b></div>}
            <div className="cz-tot cz-gran"><span>Total</span><b>{fmtMx(t.total)}</b></div>
            {t.anticipo > 0 && <><div className="cz-tot"><span>Anticipo {num(ajustes.anticipo_pct)}%</span><b>{fmtMx(t.anticipo)}</b></div><div className="cz-tot cz-tenue"><span>Saldo</span><b>{fmtMx(t.saldo)}</b></div></>}

            <div className="cz-acciones">
              {!soloLectura && <button type="button" className="adm-btn adm-btn-dark" disabled={!!ocupado} onClick={() => guardar()}>{ocupado === 'guardar' ? 'Guardando…' : (cot ? 'Guardar cambios' : 'Guardar borrador')}</button>}
              <button type="button" className="adm-btn" disabled={!!ocupado} onClick={() => pdf('pdf')}>{ocupado === 'pdf' ? 'Generando…' : 'Vista previa del PDF'}</button>
              <button type="button" className="adm-btn" disabled={!!ocupado} onClick={() => pdf('descargar')}>{ocupado === 'descargar' ? 'Generando…' : 'Descargar PDF'}</button>
              {!soloLectura && (!cot || cot.status === 'borrador') && <button type="button" className="adm-btn" disabled={!!ocupado} onClick={emitir}>{ocupado === 'emitir' ? 'Emitiendo…' : 'Emitir cotización'}</button>}
            </div>

            {cot && (
              <>
                <Campo label="Estado" style={{ marginTop: 14 }}>
                  <select className="adm-select" style={{ ...W, minWidth: 0 }} value={cot.status} onChange={e => cambiarStatus(e.target.value)}>
                    {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                  {cot.vence_at && <div className="adm-form-hint">Vence el {new Date(cot.vence_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                </Campo>
                <div className="cz-fila-botones">
                  <button type="button" className="adm-btn-sm" onClick={duplicar}>Duplicar</button>
                  <button type="button" className="adm-btn-sm cz-peligro" onClick={eliminar}>Eliminar</button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
