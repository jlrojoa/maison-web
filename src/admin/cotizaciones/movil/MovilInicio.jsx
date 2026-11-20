// src/admin/cotizaciones/movil/MovilInicio.jsx — Inicio del cotizador móvil: nueva cotización y las últimas.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarCotizaciones, estadoDe, folioDe, clienteTexto } from '../api'
import { fmtMx } from '../calc'
import { leerRespaldo } from './respaldo'
import VisorPdf from './VisorPdf'
import { pdfDeGuardada } from './pdfGuardada'
import { compartirPdf, descargarPdf, puedeCompartirArchivos } from './compartir'

const fecha = (d) => { const f = new Date(d); return Number.isNaN(f.getTime()) ? '' : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(f) }

export default function MovilInicio() {
  const [cots, setCots] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const respaldo = leerRespaldo()
  const [visor, setVisor] = useState(null)
  const [abriendo, setAbriendo] = useState(null)
  const [msg, setMsg] = useState(null)
  const verPdf = async (c) => {
    setAbriendo(c.id); setMsg(null)
    try { setVisor({ ...(await pdfDeGuardada(c.id)), id: c.id, emitida: c.status !== 'borrador' }) } catch (e) { setMsg(`No se pudo abrir el PDF: ${e.message}`) } finally { setAbriendo(null) }
  }
  const enviarVisor = async () => {
    try {
      const r = puedeCompartirArchivos(visor.blob, visor.nombre) ? await compartirPdf({ blob: visor.blob, nombre: visor.nombre, titulo: visor.asunto, texto: visor.texto }) : 'sin-soporte'
      if (r === 'sin-soporte') descargarPdf(visor.blob, visor.nombre)
    } catch (e) { setMsg(`No se pudo abrir el menú de enviar: ${e.message}`) }
  }
  useEffect(() => { listarCotizaciones().then(r => setCots(r.filter(c => c.origen === 'admin'))).catch(e => setError(e.message)) }, [])
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (cots ?? []).filter(c => !t || `${folioDe(c)} ${clienteTexto(c)} ${c.nombre_proyecto ?? ''}`.toLowerCase().includes(t)).slice(0, 40)
  }, [cots, q])
  return (
    <div className="mv-pad">
      <Link to="/m/nueva" className="mv-btn mv-grande mv-bloque">+ Nueva cotización</Link>
      {respaldo && <Link to="/m/nueva" className="mv-banner mv-banner-link">Tienes una cotización sin terminar. Toca para continuarla.</Link>}
      <h2 className="mv-titulo">Mis cotizaciones</h2>
      <input className="mv-buscar" type="search" placeholder="Buscar por cliente, folio o proyecto" value={q} onChange={e => setQ(e.target.value)} />
      {error && <p className="mv-aviso err">No se pudieron cargar: {error}</p>}
      {!cots && !error && <div className="mv-cargando">Cargando…</div>}
      {cots && lista.length === 0 && <p className="mv-mut">{q ? 'No hay resultados.' : 'Aún no has hecho cotizaciones desde el admin.'}</p>}
      {msg && <p className="mv-aviso err" style={{ position: 'static' }}>{msg}</p>}
      <ul className="mv-lista">
        {lista.map(c => { const e = estadoDe(c); return (
          <li key={c.id} className="mv-item">
            <Link to={`/m/c/${c.id}`}>
              <div><b>{clienteTexto(c) || 'Sin cliente'}</b><small>{folioDe(c)} · {fecha(c.emitida_at ?? c.created_at)}{c.nombre_proyecto && c.nombre_proyecto !== 'Cotización' ? ` · ${c.nombre_proyecto}` : ''}</small></div>
              <div className="mv-der"><b>{fmtMx(c.total)}</b><span className="mv-chip" style={{ background: e.bg, color: e.color }}>{e.label}</span></div>
            </Link>
            <button type="button" className="mv-pdf" disabled={abriendo === c.id} onClick={() => verPdf(c)}>{abriendo === c.id ? '…' : 'PDF'}</button>
          </li>
        ) })}
      </ul>
      {visor && (
        <VisorPdf blob={visor.blob} titulo={`Cotización ${visor.folio} · ${visor.total}`} onCerrar={() => setVisor(null)}
          acciones={(
            <>
              <Link to={`/m/c/${visor.id}`} className="mv-btn-sec">Editar</Link>
              <button type="button" className="mv-btn" onClick={enviarVisor}>{visor.emitida ? 'Enviar' : 'Enviar borrador'}</button>
            </>
          )} />
      )}
    </div>
  )
}
