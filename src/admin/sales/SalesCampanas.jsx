import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './sales.css'

// Panel de monitoreo de Meta Ads para la cuenta de Brendell. Lee y controla
// (pausar/reactivar/presupuesto) campañas reales vía api/meta-campanas.js.
// A propósito NO crea campañas nuevas todavía — ese flujo (targeting,
// creativos, Page) se arma directo con Claude en el chat hasta que se
// decida construir un wizard dedicado en el admin.

const ESTADO_COLOR = {
  ACTIVE: '#059669', PAUSED: '#D97706', ARCHIVED: '#9CA3AF', DELETED: '#9CA3AF',
  IN_PROCESS: '#2563EB', WITH_ISSUES: '#DC2626', PENDING_REVIEW: '#7C3AED',
}
const money = n => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

export default function SalesCampanas() {
  const [campanas, setCampanas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actualizandoId, setActualizandoId] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/meta-campanas', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'No se pudo cargar Meta Ads')
        setCampanas([])
      } else {
        setCampanas(data.campanas || [])
      }
    } catch {
      setError('Error de red al conectar con Meta')
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const actualizar = async (campaignId, accion, dailyBudget) => {
    setActualizandoId(campaignId)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/meta-campanas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ campaignId, accion, dailyBudget }),
    })
    if (res.ok) await cargar()
    else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error || 'No se pudo actualizar la campaña')
    }
    setActualizandoId(null)
  }

  const noConfigurado = error?.includes('META_ACCESS_TOKEN')

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Campañas</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Campañas</b> · Meta Ads (Brendell)</div>
        </div>
      </div>

      <div className="adm-content">
        <div className="sls-note">
          Este panel muestra y controla (pausar, reactivar, cambiar presupuesto) las campañas reales de la cuenta de Meta de Brendell.
          Para <b>crear</b> una campaña nueva — objetivo, audiencia, presupuesto, arte y copy — todavía no hay un wizard aquí:
          pídemelo directo en el chat y la armamos juntos, tú revisando el arte antes de que se active.
        </div>

        {noConfigurado ? (
          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-title" style={{ marginBottom: 8 }}>Falta conectar Meta</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
              Falta configurar <code>META_ACCESS_TOKEN</code> y <code>META_AD_ACCOUNT_ID</code> en Vercel.
              El token sale de Business Settings → System Users en Meta Business Manager, generado sobre el Business
              <b> Brendellsofa</b> con permiso <b>ads_management</b> sobre la cuenta de anuncios de Brendell.
            </div>
          </div>
        ) : (
          <div className="adm-card" style={{ margin: 0, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '30px 0' }}>Cargando…</div>
            ) : error ? (
              <div style={{ textAlign: 'center', color: '#DC2626', padding: '30px 0' }}>{error}</div>
            ) : campanas.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '30px 0' }}>
                No hay campañas todavía en la cuenta de Brendell — cuando lancemos la primera, va a aparecer aquí.
              </div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Campaña</th><th>Objetivo</th><th>Estado</th><th>Gasto (30d)</th>
                    <th>Alcance</th><th>Clics</th><th>Presupuesto diario</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {campanas.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                      <td style={{ color: '#6B7280' }}>{c.objetivo}</td>
                      <td><span className="sls-etapa-badge" style={{ color: ESTADO_COLOR[c.estado] ?? '#4B5563' }}>{c.estado}</span></td>
                      <td>{money(c.gasto)}</td>
                      <td>{c.alcance.toLocaleString('es-MX')}</td>
                      <td>{c.clics.toLocaleString('es-MX')}</td>
                      <td>
                        <input
                          className="adm-input"
                          style={{ width: 100, padding: '6px 8px', fontSize: 12.5 }}
                          type="number"
                          defaultValue={c.presupuesto_diario ?? ''}
                          placeholder="—"
                          onBlur={e => {
                            const valor = e.target.value
                            if (valor && Number(valor) !== c.presupuesto_diario) actualizar(c.id, 'presupuesto', Number(valor))
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="adm-btn-sm"
                          disabled={actualizandoId === c.id}
                          onClick={() => actualizar(c.id, c.estado === 'ACTIVE' ? 'pausar' : 'activar')}
                        >
                          {c.estado === 'ACTIVE' ? 'Pausar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
