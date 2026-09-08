import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './sales.css'

// Los prospectos que ves aquí SÍ son reales: vienen de la tabla `leads`
// (los mensajes del formulario de contacto del sitio). Todos entran en
// la etapa "Nuevo" porque hoy la tabla `leads` no tiene columna de etapa,
// score ni tipo de prospecto — eso es trabajo aparte (migración de Supabase)
// que falta aprobar antes de que el cambio de etapa se pueda guardar de verdad.
// Por ahora el selector de etapa es solo visual (no persiste).

const ETAPAS = ['Nuevo', 'Contactado', 'Interesado', 'Muestrario', 'Cotización', 'Negociación', 'Cliente']

export default function SalesProspectos() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [etapaLocal, setEtapaLocal] = useState({})

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLeads(data ?? [])
        setLoading(false)
      })
  }, [])

  const setEtapa = (id, etapa) => setEtapaLocal(prev => ({ ...prev, [id]: etapa }))

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Prospectos</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Prospectos</b> · {leads.length} registro{leads.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="adm-content">
        <div className="sls-note">
          Estos son los mensajes reales recibidos por el formulario de contacto del sitio. La etapa de pipeline es editable aquí pero <b>no se guarda todavía</b> — falta agregar la columna <code>etapa</code> a la tabla <code>leads</code> en Supabase.
        </div>

        <div className="adm-card" style={{ margin: 0, overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Producto</th>
                <th>Tejido</th>
                <th>Mensaje</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF' }}>Cargando…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF' }}>No hay prospectos aún</td></tr>
              ) : leads.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap', color: '#9CA3AF' }}>
                    {new Date(l.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{l.nombre}</td>
                  <td><a href={`mailto:${l.email}`} style={{ color: '#111827' }}>{l.email}</a></td>
                  <td style={{ color: '#9CA3AF' }}>{l.telefono ?? '—'}</td>
                  <td>{l.producto_interes ?? '—'}</td>
                  <td style={{ color: '#9CA3AF' }}>{l.textile_interes ?? '—'}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6B7280' }}>{l.mensaje ?? '—'}</td>
                  <td>
                    <select
                      className="adm-select"
                      style={{ minWidth: 0, padding: '6px 8px', fontSize: 12 }}
                      value={etapaLocal[l.id] ?? 'Nuevo'}
                      onChange={e => setEtapa(l.id, e.target.value)}
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
