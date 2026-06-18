import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

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

  const TH = ({ children }) => (
    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 8 }}>Leads</h1>
      <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.1em', marginBottom: 40 }}>
        {leads.length} consulta{leads.length !== 1 ? 's' : ''} recibida{leads.length !== 1 ? 's' : ''}
      </p>
      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Fecha</TH>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH>Teléfono</TH>
              <TH>Producto</TH>
              <TH>Tejido</TH>
              <TH>Mensaje</TH>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12, letterSpacing: '.15em' }}>CARGANDO…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>No hay leads aún</td></tr>
            ) : leads.map(l => (
              <tr key={l.id}>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
                  {new Date(l.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--sand)' }}>{l.nombre}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>
                  <a href={`mailto:${l.email}`} style={{ color: 'var(--charcoal)', textDecoration: 'none' }}>{l.email}</a>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{l.telefono ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--gold)', borderBottom: '1px solid var(--sand)' }}>{l.producto_interes ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{l.textile_interes ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--stone)', borderBottom: '1px solid var(--sand)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.mensaje ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
