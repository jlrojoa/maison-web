// src/admin/cotizaciones/Cotizaciones.jsx
//
// Lista de todas las cotizaciones (las del admin y las de los distribuidores)
// con búsqueda, filtros y las acciones más usadas.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../catalogo/AdminAuthContext'
import {
  ESTADOS, ajustesIniciales, borrarCotizacion, cambiarEstado, clienteTexto, duplicarCotizacion, estadoDe, folioDe,
  leerAjustes, leerCotizacion, lineaDeItem, listarCotizaciones,
} from './api'
import { fmtMx } from './calc'
import { abrirBlob, abrirPestanaEspera } from '../../pages/configurador/cotizacionPdf/pdfActions'
import './cotizaciones.css'

const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export default function Cotizaciones() {
  const navigate = useNavigate()
  const { email } = useAdminAuth()
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [origen, setOrigen] = useState('')
  const [ocupada, setOcupada] = useState(null)

  const cargar = async () => {
    try { setFilas(await listarCotizaciones()); setError(null) } catch (err) { setError(err.message); setFilas([]) }
  }
  useEffect(() => { cargar() }, [])

  const visibles = useMemo(() => (filas ?? []).filter(c => {
    const e = estadoDe(c).key
    if (estado && e !== estado) return false
    if (origen && (c.origen ?? 'distribuidor') !== origen) return false
    if (!q.trim()) return true
    const texto = `${folioDe(c)} ${c.nombre_proyecto ?? ''} ${clienteTexto(c)} ${c.distribuidor_email ?? ''}`.toLowerCase()
    return q.toLowerCase().split(/\s+/).every(p => texto.includes(p))
  }), [filas, q, estado, origen])

  const resumen = useMemo(() => {
    const todas = filas ?? []
    const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0)
    const emitidasMes = todas.filter(c => c.emitida_at && new Date(c.emitida_at) >= mes)
    return {
      emitidas: emitidasMes.length,
      monto: emitidasMes.reduce((s, c) => s + Number(c.total ?? 0), 0),
      borradores: todas.filter(c => c.status === 'borrador').length,
      vencidas: todas.filter(c => estadoDe(c).key === 'vencida').length,
    }
  }, [filas])

  const pdf = async (c) => {
    const win = abrirPestanaEspera()
    setOcupada(c.id)
    try {
      const [full, fijos] = await Promise.all([leerCotizacion(c.id), leerAjustes()])
      const { generarPdfAdmin } = await import('./generarPdf')
      const cliente = full.cliente_datos ?? { nombre: full.cliente_nombre ?? '', empresa: '', rfc: '', email: full.cliente_email ?? '', telefono: full.cliente_telefono ?? '', direccion: '' }
      const lineas = full.items.map(it => { const l = lineaDeItem(it); if (l.notas && /"armado"/.test(l.notas)) l.notas = null; return l })
      const { blob } = await generarPdfAdmin({ cot: full, proyecto: full.nombre_proyecto, cliente, ajustes: full.ajustes ?? ajustesIniciales(fijos), fijos, lineas })
      abrirBlob(blob, win)
    } catch (err) { win?.close(); alert(`No se pudo generar el PDF: ${err.message}`) } finally { setOcupada(null) }
  }
  const duplicar = async (c) => {
    try { const fijos = await leerAjustes(); const n = await duplicarCotizacion(c.id, email, fijos); navigate(`/admin/cotizaciones/${n.id}`) } catch (err) { alert(err.message) }
  }
  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar la cotización ${folioDe(c)}${c.nombre_proyecto ? ` (${c.nombre_proyecto})` : ''}? No se puede deshacer.`)) return
    try { await borrarCotizacion(c.id); cargar() } catch (err) { alert(err.message) }
  }
  const marcar = async (c, status) => { try { await cambiarEstado(c, status); cargar() } catch (err) { alert(err.message) } }

  return (
    <div>
      <div className="adm-topbar">
        <div><div className="adm-page-title">Cotizaciones</div><div className="adm-breadcrumb">Todas las cotizaciones, las tuyas y las de distribuidores</div></div>
        <div className="adm-topbar-actions">
          <Link to="/admin/cotizaciones/clientes" className="adm-btn">Clientes</Link>
          <Link to="/admin/cotizaciones/ajustes" className="adm-btn">Ajustes de cotización</Link>
          <Link to="/admin/cotizaciones/nueva" className="adm-btn adm-btn-dark">+ Nueva cotización</Link>
        </div>
      </div>
      <div className="adm-content">
        <div className="adm-stat-grid" style={{ marginBottom: 20 }}>
          <div className="adm-stat-card"><div className="adm-stat-num">{resumen.emitidas}</div><div className="adm-stat-label">Emitidas este mes</div></div>
          <div className="adm-stat-card"><div className="adm-stat-num">{fmtMx(resumen.monto)}</div><div className="adm-stat-label">Monto emitido este mes</div></div>
          <div className="adm-stat-card"><div className="adm-stat-num">{resumen.borradores}</div><div className="adm-stat-label">Borradores sin emitir</div></div>
          <div className="adm-stat-card"><div className="adm-stat-num">{resumen.vencidas}</div><div className="adm-stat-label">Vencidas</div></div>
        </div>

        <div className="adm-card">
          <div className="cz-filtros">
            <input className="adm-input" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por folio, proyecto, cliente o distribuidor…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="adm-select" style={{ minWidth: 150 }} value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
              <option value="vencida">Vencida</option>
            </select>
            <select className="adm-select" style={{ minWidth: 150 }} value={origen} onChange={e => setOrigen(e.target.value)}>
              <option value="">Todos los orígenes</option>
              <option value="admin">Hechas en el admin</option>
              <option value="distribuidor">De distribuidores</option>
            </select>
          </div>
          {error && <div className="cz-aviso cz-aviso-error">No se pudieron leer las cotizaciones: {error}</div>}
          {filas === null ? <div className="adm-empty-note">Cargando…</div> : visibles.length === 0 ? (
            <div className="adm-empty-note">{filas.length === 0 ? 'Todavía no hay cotizaciones. Crea la primera con “+ Nueva cotización”.' : 'Ninguna cotización coincide con los filtros.'}</div>
          ) : (
            <table className="adm-table cz-tabla">
              <thead><tr><th>Folio</th><th>Proyecto</th><th>Cliente</th><th>Origen</th><th>Estado</th><th style={{ textAlign: 'right' }}>Total</th><th>Fecha</th><th /></tr></thead>
              <tbody>
                {visibles.map(c => {
                  const e = estadoDe(c)
                  return (
                    <tr key={c.id}>
                      <td><Link to={`/admin/cotizaciones/${c.id}`} className="cz-folio">{folioDe(c)}</Link></td>
                      <td>{c.nombre_proyecto || '—'}<div className="adm-form-hint">{c.items?.length ?? 0} {(c.items?.length ?? 0) === 1 ? 'línea' : 'líneas'}</div></td>
                      <td>{clienteTexto(c) || <span style={{ color: '#9CA3AF' }}>Sin cliente</span>}</td>
                      <td>{(c.origen ?? 'distribuidor') === 'admin' ? 'Admin' : <span title={c.distribuidor_email}>Distribuidor</span>}</td>
                      <td><span className="cz-estado" style={{ color: e.color, background: e.bg }}>{e.label}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMx(c.total)}</td>
                      <td>{fecha(c.emitida_at ?? c.created_at)}</td>
                      <td>
                        <div className="adm-cell-actions">
                          <Link to={`/admin/cotizaciones/${c.id}`} className="adm-btn-sm">{(c.origen ?? 'distribuidor') === 'admin' ? 'Editar' : 'Ver'}</Link>
                          <button type="button" className="adm-btn-sm" disabled={ocupada === c.id} onClick={() => pdf(c)}>{ocupada === c.id ? '…' : 'PDF'}</button>
                          {c.status === 'emitida' && <button type="button" className="adm-btn-sm" title="Marcar como aceptada por el cliente" onClick={() => marcar(c, 'autorizada')}>Aceptada</button>}
                          <button type="button" className="adm-btn-sm" onClick={() => duplicar(c)}>Duplicar</button>
                          <button type="button" className="adm-btn-sm cz-peligro" onClick={() => eliminar(c)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
