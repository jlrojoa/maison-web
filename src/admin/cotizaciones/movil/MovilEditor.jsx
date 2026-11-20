// src/admin/cotizaciones/movil/MovilEditor.jsx
//
// Cotizar desde el celular: cliente → muebles → condiciones → enviar. Usa las mismas tablas,
// cuentas y PDF que el cotizador de escritorio; una cotización hecha aquí se ve y se edita allá.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from '../../catalogo/AdminAuthContext'
import { useCatalogo } from '../useCatalogo'
import {
  ajustesIniciales, CLIENTE_VACIO, LINEA_VACIA, cambiarEstado, folioDe, guardarCliente, guardarCotizacion,
  leerAjustes, leerCotizacion, lineaDeItem, listarClientes, nuevaClave, duplicarCotizacion,
} from '../api'
import { fmtMx, num, totales } from '../calc'
import { generarPdfAdmin } from '../generarPdf'
import MovilLinea from './MovilLinea'
import VisorPdf from './VisorPdf'
import { lineaLlena } from './lineaOps'
import { sinOrientacion } from '../orientacion'
import { compartirPdf, descargarPdf, mensajeCliente, primerNombre, puedeCompartirArchivos, urlCorreo, urlWhatsapp } from './compartir'
import { borrarRespaldo, guardarRespaldo, leerRespaldo } from './respaldo'

export default function MovilEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { email: adminEmail } = useAdminAuth()
  const cat = useCatalogo()
  const [cargando, setCargando] = useState(true)
  const [fijos, setFijos] = useState({})
  const [clientes, setClientes] = useState([])
  const [cot, setCot] = useState(null)
  const [proyecto, setProyecto] = useState('')
  const [cliente, setCliente] = useState({ ...CLIENTE_VACIO })
  const [clienteId, setClienteId] = useState(null)
  const [ajustes, setAjustes] = useState(null)
  const [lineas, setLineas] = useState([])
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [visor, setVisor] = useState(null) // vista previa: { blob, nombre, folio, total, texto, asunto, emitida }
  const [envio, setEnvio] = useState(null) // { blob, nombre, folio, total, texto, asunto }
  const [respaldo, setRespaldo] = useState(null)
  const [masCliente, setMasCliente] = useState(false)
  const [condiciones, setCondiciones] = useState(false)
  const listoParaRespaldar = useRef(false)

  const mostrar = (texto, error = false) => { setAviso({ texto, error }); setTimeout(() => setAviso(null), error ? 8000 : 3000) }

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
          setCot(c); setProyecto(c.nombre_proyecto ?? '')
          setCliente({ ...CLIENTE_VACIO, nombre: c.cliente_nombre ?? '', email: c.cliente_email ?? '', telefono: c.cliente_telefono ?? '', ...(c.cliente_datos ?? {}) })
          setClienteId(c.cliente_id ?? null)
          setAjustes({ ...ajustesIniciales(f), ...(c.ajustes ?? {}) })
          setLineas(c.items.map(lineaDeItem))
        } else {
          setAjustes(ajustesIniciales(f)); setLineas([LINEA_VACIA()])
          const r = leerRespaldo(); if (r?.lineas?.some(lineaLlena) || r?.cliente?.nombre) setRespaldo(r)
        }
      } catch (err) { mostrar(`No se pudo cargar: ${err.message}`, true) } finally { if (!ignore) { setCargando(false); listoParaRespaldar.current = true } }
    })()
    return () => { ignore = true }
  }, [id])

  // Respaldo local del borrador nuevo (solo mientras no se haya guardado en la base).
  useEffect(() => {
    if (id || cot || !listoParaRespaldar.current || respaldo) return
    if (lineas.some(lineaLlena) || cliente.nombre) guardarRespaldo({ proyecto, cliente, clienteId, ajustes, lineas })
  }, [id, cot, proyecto, cliente, clienteId, ajustes, lineas, respaldo])

  const soloLectura = !!cot && cot.origen !== 'admin'
  const t = useMemo(() => (ajustes ? totales(lineas.filter(lineaLlena), ajustes) : null), [lineas, ajustes])

  const cambiarLinea = (key, patch) => setLineas(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))
  const setAj = (k, v) => setAjustes(a => ({ ...a, [k]: v }))
  const setCli = (k, v) => setCliente(c => ({ ...c, [k]: v }))
  const elegirCliente = (cid) => {
    if (!cid) { setClienteId(null); return }
    const c = clientes.find(x => x.id === cid); if (!c) return
    setClienteId(c.id)
    setCliente({ ...CLIENTE_VACIO, nombre: c.nombre ?? '', empresa: c.empresa ?? '', rfc: c.rfc ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '', notas: c.notas ?? '' })
  }
  const restaurar = () => {
    setProyecto(respaldo.proyecto ?? ''); setCliente({ ...CLIENTE_VACIO, ...(respaldo.cliente ?? {}) }); setClienteId(respaldo.clienteId ?? null)
    if (respaldo.ajustes) setAjustes(respaldo.ajustes)
    setLineas((respaldo.lineas?.length ? respaldo.lineas : [LINEA_VACIA()])); setRespaldo(null)
  }

  const guardar = async (status) => {
    const llenas = lineas.filter(lineaLlena)
    if (!cliente.nombre.trim()) { mostrar('Escribe el nombre del cliente.', true); return null }
    if (!llenas.length) { mostrar('Agrega al menos un mueble o concepto.', true); return null }
    const guardada = await guardarCotizacion({ id: cot?.id, adminEmail, proyecto, cliente, clienteId, ajustes, lineas: llenas })
    let final = guardada
    if (status === 'emitida' && guardada.status === 'borrador') final = await cambiarEstado(guardada, 'emitida')
    setCot({ ...final, items: [] }); setLineas(llenas); borrarRespaldo()
    // Se cambia la dirección sin recargar la pantalla: si se navegara aquí, se perdería el envío en curso.
    if (!id) window.history.replaceState(window.history.state, '', `/m/c/${final.id}`)
    return final
  }

  const soloGuardar = async () => {
    setOcupado('guardar')
    try { const f = await guardar(null); if (f) mostrar(`Guardada (${folioDe(f)}).`) } catch (err) { mostrar(`No se pudo guardar: ${err.message}`, true) } finally { setOcupado(null) }
  }

  // Valida lo mínimo antes de guardar o mostrar el PDF.
  const validar = () => {
    if (!cliente.nombre.trim()) { mostrar('Escribe el nombre del cliente.', true); return false }
    if (!lineas.some(lineaLlena)) { mostrar('Agrega al menos un mueble o concepto.', true); return false }
    const sinOri = sinOrientacion(lineas.filter(lineaLlena), cat.productos)
    if (sinOri.length) { mostrar(`Falta la orientación (izquierda o derecha) en: ${sinOri.map(x => x.nombre).join(', ')}.`, true); return false }
    return true
  }
  const armarPdf = async (final) => {
    const llenas = lineas.filter(lineaLlena)
    const { blob, nombre } = await generarPdfAdmin({ cot: final, proyecto, cliente, ajustes, fijos, lineas: llenas })
    const tt = totales(llenas, ajustes); const folio = folioDe(final)
    const dias = Math.max(1, Math.round(num(ajustes.vigencia_dias)) || 15)
    return { blob, nombre, folio, total: fmtMx(tt.total), texto: mensajeCliente({ nombre: cliente.nombre, folio, total: fmtMx(tt.total), dias }), asunto: `Cotización ${folio} · Brendell`, emitida: final.status !== 'borrador' }
  }

  // "Revisar y enviar": guarda como borrador, arma el PDF y lo muestra ANTES de emitir o mandar nada.
  const revisar = async () => {
    if (!validar()) return
    setOcupado('revisar')
    try {
      const final = await guardar(null); if (!final) return
      setVisor(await armarPdf(final))
    } catch (err) { mostrar(`No se pudo preparar el PDF: ${err.message}`, true) } finally { setOcupado(null) }
  }

  // Desde la vista previa: si ya estaba emitida se manda tal cual; si no, se emite (fija fecha y vigencia) y se rearma el PDF.
  const confirmarEnvio = async () => {
    if (visor.emitida) { setEnvio({ ...visor, dias: Math.max(1, Math.round(num(ajustes.vigencia_dias)) || 15) }); setVisor(null); return }
    if (!window.confirm('Al enviar se emite la cotización y empieza su vigencia. ¿Continuar?')) return
    setOcupado('enviar')
    try {
      const final = await guardar('emitida'); if (!final) return
      const pdf = await armarPdf(final)
      setVisor(null); setEnvio({ ...pdf, dias: Math.max(1, Math.round(num(ajustes.vigencia_dias)) || 15) })
    } catch (err) { mostrar(`No se pudo emitir: ${err.message}`, true) } finally { setOcupado(null) }
  }

  const duplicar = async () => {
    try { const n = await duplicarCotizacion(cot.id, adminEmail, fijos); navigate(`/m/c/${n.id}`) } catch (err) { mostrar(err.message, true) }
  }
  const guardarClienteDir = async () => {
    try {
      const { direccion_entrega, ...p } = cliente // eslint-disable-line no-unused-vars
      const g = await guardarCliente({ ...(clienteId ? { id: clienteId } : {}), ...p }); setClientes(await listarClientes()); setClienteId(g.id); mostrar('Cliente guardado en el directorio.')
    } catch (err) { mostrar(err.message, true) }
  }

  if (cargando || !ajustes) return <div className="mv-cargando">Cargando…</div>
  if (soloLectura) return (
    <div className="mv-pad">
      <p>Esta cotización es de un distribuidor y no se edita aquí.</p>
      <button type="button" className="mv-btn" onClick={duplicar}>Duplicar para editar</button>
      <Link to="/m" className="mv-btn-sec mv-bloque">Volver</Link>
    </div>
  )

  return (
    <div className="mv-editor">
      {aviso && <div className={`mv-aviso ${aviso.error ? 'err' : ''}`} role="status">{aviso.texto}</div>}
      {respaldo && (
        <div className="mv-banner">
          Tienes una cotización sin terminar en este celular.
          <div><button type="button" onClick={restaurar}>Continuar</button><button type="button" onClick={() => { borrarRespaldo(); setRespaldo(null) }}>Descartar</button></div>
        </div>
      )}

      <section className="mv-card">
        <h2>Cliente</h2>
        {clientes.length > 0 && (
          <label className="mv-campo"><span>Del directorio</span>
            <select value={clienteId ?? ''} onChange={e => elegirCliente(e.target.value)}>
              <option value="">— Cliente nuevo —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` · ${c.empresa}` : ''}</option>)}
            </select>
          </label>
        )}
        <label className="mv-campo"><span>Nombre *</span><input value={cliente.nombre} onChange={e => setCli('nombre', e.target.value)} autoComplete="off" /></label>
        <div className="mv-fila">
          <label className="mv-campo"><span>WhatsApp / teléfono</span><input type="tel" inputMode="tel" value={cliente.telefono} onChange={e => setCli('telefono', e.target.value)} /></label>
          <label className="mv-campo"><span>Correo</span><input type="email" inputMode="email" autoCapitalize="none" value={cliente.email} onChange={e => setCli('email', e.target.value)} /></label>
        </div>
        <button type="button" className="mv-link" onClick={() => setMasCliente(m => !m)}>{masCliente ? 'Menos datos' : 'Más datos (empresa, RFC, dirección, proyecto)'}</button>
        {masCliente && (
          <>
            <label className="mv-campo"><span>Proyecto</span><input value={proyecto} onChange={e => setProyecto(e.target.value)} placeholder="Ej. Sala y recámara principal" /></label>
            <label className="mv-campo"><span>Empresa</span><input value={cliente.empresa} onChange={e => setCli('empresa', e.target.value)} /></label>
            <label className="mv-campo"><span>RFC</span><input autoCapitalize="characters" value={cliente.rfc} onChange={e => setCli('rfc', e.target.value)} /></label>
            <label className="mv-campo"><span>Dirección de entrega</span><input value={cliente.direccion_entrega ?? ''} onChange={e => setCli('direccion_entrega', e.target.value)} /></label>
          </>
        )}
        {cliente.nombre.trim() && <button type="button" className="mv-link" onClick={guardarClienteDir}>{clienteId ? 'Actualizar en el directorio' : 'Guardar en el directorio de clientes'}</button>}
      </section>

      <h2 className="mv-titulo">Muebles</h2>
      {!cat.listo && <div className="mv-cargando">Cargando catálogo…</div>}
      {lineas.map((l, i) => (
        <MovilLinea key={l.key} linea={l} index={i} cat={cat} onChange={p => cambiarLinea(l.key, p)} onDelete={() => setLineas(ls => (ls.length > 1 ? ls.filter(x => x.key !== l.key) : [LINEA_VACIA()]))} />
      ))}
      <div className="mv-agregar">
        <button type="button" className="mv-btn-sec" onClick={() => setLineas(ls => [...ls, LINEA_VACIA()])}>+ Mueble del catálogo</button>
        <button type="button" className="mv-btn-sec" onClick={() => setLineas(ls => [...ls, { ...LINEA_VACIA(), key: nuevaClave(), a_mano: true }])}>+ Mueble a mano</button>
        <button type="button" className="mv-btn-sec" onClick={() => setLineas(ls => [...ls, { ...LINEA_VACIA(), key: nuevaClave(), es_libre: true }])}>+ Flete / concepto</button>
      </div>

      <section className="mv-card">
        <button type="button" className="mv-acordeon" onClick={() => setCondiciones(c => !c)}>Condiciones {condiciones ? '▾' : '▸'}</button>
        {condiciones && (
          <>
            <div className="mv-fila">
              <label className="mv-campo"><span>Descuento %</span><input inputMode="decimal" value={ajustes.descuento_pct} onChange={e => setAj('descuento_pct', e.target.value)} /></label>
              <label className="mv-campo"><span>Anticipo %</span><input inputMode="decimal" value={ajustes.anticipo_pct} onChange={e => setAj('anticipo_pct', e.target.value)} /></label>
            </div>
            <label className="mv-campo"><span>IVA</span>
              <select value={ajustes.iva_modo} onChange={e => setAj('iva_modo', e.target.value)}>
                <option value="ninguno">No mostrar IVA</option><option value="sumar">Sumar IVA al subtotal</option><option value="incluido">Precios ya incluyen IVA</option>
              </select>
            </label>
            <div className="mv-fila">
              <label className="mv-campo"><span>Vigencia (días)</span><input inputMode="numeric" value={ajustes.vigencia_dias} onChange={e => setAj('vigencia_dias', e.target.value)} /></label>
              <label className="mv-campo"><span>Entrega</span><input value={ajustes.tiempo_entrega} onChange={e => setAj('tiempo_entrega', e.target.value)} placeholder="6 a 8 semanas" /></label>
            </div>
            <label className="mv-campo"><span>Notas para el cliente</span><textarea rows={2} value={ajustes.notas} onChange={e => setAj('notas', e.target.value)} /></label>
          </>
        )}
      </section>

      <div className="mv-barra">
        <div className="mv-total">
          <small>{t.iva > 0 && ajustes.iva_modo === 'sumar' ? `IVA ${fmtMx(t.iva)} incl.` : 'Total'}</small>
          <b>{fmtMx(t.total)}</b>
        </div>
        <button type="button" className="mv-btn-sec" disabled={!!ocupado} onClick={soloGuardar}>{ocupado === 'guardar' ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="mv-btn" disabled={!!ocupado} onClick={revisar}>{ocupado === 'revisar' ? 'Preparando PDF…' : 'Revisar y enviar'}</button>
      </div>

      {visor && (
        <VisorPdf blob={visor.blob} titulo={`Cotización ${visor.folio} · ${visor.total}`} onCerrar={() => setVisor(null)}
          acciones={(
            <>
              <button type="button" className="mv-btn-sec" onClick={() => setVisor(null)}>Seguir editando</button>
              <button type="button" className="mv-btn" disabled={ocupado === 'enviar'} onClick={confirmarEnvio}>{ocupado === 'enviar' ? 'Emitiendo…' : (visor.emitida ? 'Enviar' : 'Emitir y enviar')}</button>
            </>
          )} />
      )}
      {envio && <HojaEnvio envio={envio} cliente={cliente} onCerrar={() => setEnvio(null)} onListo={() => navigate('/m')} />}
    </div>
  )
}

// Hoja de envío: el PDF ya está listo, así el menú de compartir del iPhone abre al primer toque.
function HojaEnvio({ envio, cliente, onCerrar, onListo }) {
  const [msg, setMsg] = useState(null)
  const comparte = puedeCompartirArchivos(envio.blob, envio.nombre)
  const enviar = async () => {
    try {
      const r = await compartirPdf({ blob: envio.blob, nombre: envio.nombre, titulo: envio.asunto, texto: envio.texto })
      if (r === 'compartido') setMsg('Listo. Si ya la mandaste, puedes salir.')
      if (r === 'sin-soporte') { descargarPdf(envio.blob, envio.nombre); setMsg('Este navegador no puede adjuntar el archivo: se descargó el PDF para que lo mandes a mano.') }
    } catch (e) { setMsg(`No se pudo abrir el menú de enviar: ${e.message}`) }
  }
  const verPdf = () => { const url = URL.createObjectURL(envio.blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 120000) }
  return (
    <div className="mv-hoja-fondo" onClick={onCerrar}>
      <div className="mv-hoja" onClick={e => e.stopPropagation()} role="dialog" aria-label="Enviar cotización">
        <h3>Cotización {envio.folio} lista</h3>
        <p className="mv-mut">{cliente.nombre} · {envio.total}</p>
        <button type="button" className="mv-btn mv-grande" onClick={enviar}>{comparte ? 'Enviar PDF (WhatsApp, correo…)' : 'Descargar PDF'}</button>
        {comparte && <p className="mv-mut">Se abre el menú del iPhone: elige <b>WhatsApp</b> o <b>Mail</b> y el cliente.</p>}
        {cliente.telefono && <a className="mv-btn-sec mv-bloque" href={urlWhatsapp(cliente.telefono, envio.texto)} target="_blank" rel="noreferrer">Chat de WhatsApp con {primerNombre(cliente.nombre) || 'el cliente'} (sin PDF)</a>}
        {cliente.email && <a className="mv-btn-sec mv-bloque" href={urlCorreo(cliente.email, envio.asunto, envio.texto)}>Correo a {cliente.email} (sin PDF)</a>}
        <button type="button" className="mv-btn-sec mv-bloque" onClick={verPdf}>Ver el PDF</button>
        {msg && <p className="mv-aviso-in">{msg}</p>}
        <button type="button" className="mv-link" onClick={onListo}>Terminar y volver al inicio</button>
      </div>
    </div>
  )
}
