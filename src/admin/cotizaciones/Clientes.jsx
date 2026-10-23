// src/admin/cotizaciones/Clientes.jsx
//
// Directorio de clientes para cotizar: se captura una vez y se elige en cada cotización.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CLIENTE_VACIO, borrarCliente, guardarCliente, listarClientes } from './api'
import './cotizaciones.css'

const Campo = ({ label, children }) => (<div className="adm-field" style={{ marginBottom: 12 }}><label className="adm-label">{label}</label>{children}</div>)
const W = { width: '100%' }

export default function Clientes() {
  const [filas, setFilas] = useState(null)
  const [form, setForm] = useState(null) // null = cerrado
  const [q, setQ] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const cargar = async () => setFilas(await listarClientes())
  useEffect(() => { cargar() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const guardar = async () => {
    setGuardando(true); setError(null)
    try { await guardarCliente(form); setForm(null); cargar() } catch (err) { setError(err.message) } finally { setGuardando(false) }
  }
  const borrar = async (c) => {
    if (!window.confirm(`¿Borrar a ${c.nombre} del directorio? Las cotizaciones que ya le hiciste conservan sus datos.`)) return
    try { await borrarCliente(c.id); cargar() } catch (err) { alert(err.message) }
  }
  const visibles = (filas ?? []).filter(c => !q.trim() || `${c.nombre} ${c.empresa ?? ''} ${c.email ?? ''} ${c.telefono ?? ''} ${c.rfc ?? ''}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="adm-topbar">
        <div><div className="adm-page-title">Clientes</div><div className="adm-breadcrumb"><Link to="/admin/cotizaciones" style={{ color: 'inherit' }}>Cotizaciones</Link> › Directorio de clientes</div></div>
        <div className="adm-topbar-actions"><button type="button" className="adm-btn adm-btn-dark" onClick={() => { setForm({ ...CLIENTE_VACIO }); setError(null) }}>+ Nuevo cliente</button></div>
      </div>
      <div className="adm-content">
        <div className="adm-card">
          <input className="adm-input" style={{ ...W, marginBottom: 14 }} placeholder="Buscar por nombre, empresa, correo, teléfono o RFC…" value={q} onChange={e => setQ(e.target.value)} />
          {filas === null ? <div className="adm-empty-note">Cargando…</div> : visibles.length === 0 ? (
            <div className="adm-empty-note">{filas.length === 0 ? 'Aún no hay clientes. Agrega el primero con “+ Nuevo cliente” (o desde una cotización).' : 'Ningún cliente coincide.'}</div>
          ) : (
            <table className="adm-table">
              <thead><tr><th>Nombre</th><th>Empresa</th><th>RFC</th><th>Contacto</th><th /></tr></thead>
              <tbody>
                {visibles.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td><td>{c.empresa || '—'}</td><td>{c.rfc || '—'}</td>
                    <td>{[c.email, c.telefono].filter(Boolean).join(' · ') || '—'}</td>
                    <td><div className="adm-cell-actions">
                      <Link to="/admin/cotizaciones/nueva" state={{ clienteId: c.id }} className="adm-btn-sm">Cotizar</Link>
                      <button type="button" className="adm-btn-sm" onClick={() => { setForm({ ...CLIENTE_VACIO, ...c }); setError(null) }}>Editar</button>
                      <button type="button" className="adm-btn-sm cz-peligro" onClick={() => borrar(c)}>Borrar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <div className="adm-modal-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) setForm(null) }}>
          <div className="adm-modal-box" style={{ width: 520 }}>
            <div className="adm-modal-header"><div className="adm-modal-title">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</div><button type="button" className="adm-drawer-close" onClick={() => setForm(null)}>✕</button></div>
            <div className="adm-modal-body">
              {error && <div className="adm-login-error">{error}</div>}
              <Campo label="Nombre *"><input className="adm-input" style={W} value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} autoFocus /></Campo>
              <div className="adm-field-row">
                <Campo label="Empresa"><input className="adm-input" style={W} value={form.empresa ?? ''} onChange={e => set('empresa', e.target.value)} /></Campo>
                <Campo label="RFC"><input className="adm-input" style={W} value={form.rfc ?? ''} onChange={e => set('rfc', e.target.value)} /></Campo>
              </div>
              <div className="adm-field-row">
                <Campo label="Correo"><input className="adm-input" style={W} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></Campo>
                <Campo label="Teléfono"><input className="adm-input" style={W} value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)} /></Campo>
              </div>
              <Campo label="Dirección"><input className="adm-input" style={W} value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)} /></Campo>
              <Campo label="Notas (solo para ti)"><textarea className="adm-textarea" value={form.notas ?? ''} onChange={e => set('notas', e.target.value)} /></Campo>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={() => setForm(null)}>Cancelar</button>
              <button type="button" className="adm-btn adm-btn-dark" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
