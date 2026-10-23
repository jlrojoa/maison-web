import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Números reales: se leen de las mismas tablas que usa el módulo de cotizaciones.
async function leerCifras() {
  const ahora = new Date()
  const mes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const hace7 = new Date(ahora.getTime() - 7 * 86400000).toISOString()
  const cuenta = (q) => q.then(r => r.count ?? 0)
  const [emitidas, borradores, vencidas, distribuidores] = await Promise.all([
    cuenta(supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).gte('emitida_at', mes)),
    cuenta(supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).eq('status', 'borrador')),
    cuenta(supabase.from('cotizaciones').select('id', { count: 'exact', head: true }).eq('status', 'emitida').lt('vence_at', ahora.toISOString()).gte('vence_at', hace7)),
    cuenta(supabase.from('distribuidores').select('id', { count: 'exact', head: true }).eq('activo', true)),
  ])
  return [emitidas, borradores, vencidas, distribuidores]
}

export default function Dashboard() {
  const [cifras, setCifras] = useState(null)
  useEffect(() => { leerCifras().then(setCifras).catch(() => setCifras(null)) }, [])
  const stats = [
    { icon: '📄', label: 'Cotizaciones emitidas · este mes' },
    { icon: '⏳', label: 'Borradores sin emitir' },
    { icon: '⚠', label: 'Vencidas esta semana' },
    { icon: '👤', label: 'Distribuidores activos' },
  ]

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Dashboard</div>
          <div className="adm-breadcrumb">Inicio</div>
        </div>
        <div className="adm-topbar-actions">
          <Link to="/admin/cotizaciones/nueva" className="adm-btn adm-btn-dark">+ Nueva cotización</Link>
          <button type="button" className="adm-btn">↗ Vista pública</button>
        </div>
      </div>
      <div className="adm-content">
        <div className="adm-stat-grid">
          {stats.map((s, i) => (
            <div key={s.label} className="adm-stat-card">
              <div className="adm-stat-icon">{s.icon}</div>
              <div className="adm-stat-num">{cifras ? cifras[i] : '–'}</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
