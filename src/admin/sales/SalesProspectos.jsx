import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './sales.css'

const ETAPAS = ['Nuevo', 'Contactado', 'Interesado', 'Muestrario', 'Cotización', 'Negociación', 'Cliente']
const TIPOS = [
  { value: 'mueblería', label: 'Mueblería' },
  { value: 'diseñador_interior', label: 'Diseñador de interiores' },
  { value: 'arquitecto', label: 'Arquitecto' },
  { value: 'fabrica_muebles', label: 'Fábrica de muebles' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'otro', label: 'Otro' },
]
const tipoLabel = v => TIPOS.find(t => t.value === v)?.label ?? v
const SCORE_COLOR = { A: '#059669', B: '#D97706', C: '#9CA3AF' }

export default function SalesProspectos() {
  const [prospectos, setProspectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const cargar = () => {
    setLoading(true)
    supabase
      .from('prospectos')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProspectos(data ?? [])
        setLoading(false)
      })
  }

  useEffect(cargar, [])

  const actualizar = async (id, campo, valor) => {
    setSavingId(id)
    setProspectos(prev => prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p)))
    await supabase.from('prospectos').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('id', id)
    setSavingId(null)
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Prospectos</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Prospectos</b> · {prospectos.length} registro{prospectos.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="adm-content">
        <div className="sls-note">
          Aquí caen dos fuentes: los mensajes reales del formulario del sitio (fuente "Sitio web") y lo que agregues desde el <b>Prospector</b>. Etapa y calificación se guardan de verdad.
        </div>

        <div className="adm-card" style={{ margin: 0, overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Contacto</th>
                <th>Fuente</th>
                <th>Score</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF' }}>Cargando…</td></tr>
              ) : prospectos.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF' }}>No hay prospectos aún — agrega desde el Prospector</td></tr>
              ) : prospectos.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap', color: '#9CA3AF' }}>
                    {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" style={{ color: '#111827' }}>{p.nombre} ↗</a> : p.nombre}
                  </td>
                  <td style={{ color: '#6B7280' }}>{tipoLabel(p.tipo)}</td>
                  <td style={{ color: '#9CA3AF' }}>{[p.colonia, p.municipio, p.estado].filter(Boolean).join(', ') || '—'}</td>
                  <td>
                    {p.telefono && <div>{p.telefono}</div>}
                    {p.email && <a href={`mailto:${p.email}`} style={{ color: '#111827' }}>{p.email}</a>}
                    {!p.telefono && !p.email && '—'}
                  </td>
                  <td><span className="sls-etapa-badge">{p.fuente === 'leads_sitio' ? 'Sitio web' : p.fuente === 'google_places' ? 'Google' : 'Manual'}</span></td>
                  <td>
                    <select
                      className="adm-select"
                      style={{ minWidth: 0, padding: '6px 8px', fontSize: 12, color: p.score ? SCORE_COLOR[p.score] : undefined, fontWeight: p.score ? 700 : 400 }}
                      value={p.score ?? ''}
                      onChange={e => actualizar(p.id, 'score', e.target.value || null)}
                    >
                      <option value="">Sin calificar</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="adm-select"
                      style={{ minWidth: 0, padding: '6px 8px', fontSize: 12, opacity: savingId === p.id ? 0.5 : 1 }}
                      value={p.etapa}
                      onChange={e => actualizar(p.id, 'etapa', e.target.value)}
                    >
                      {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
