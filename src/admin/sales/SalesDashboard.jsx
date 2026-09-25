import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase'
import './sales.css'

// Dashboard conectado a la tabla real 'prospectos' (Supabase). Todo lo que
// se muestra aquí sale de esa tabla — no hay valores de $ de pipeline ni
// "próximas acciones" inventadas, porque esos datos (monto por deal,
// agenda de tareas) todavía no existen en el esquema. Si se agregan esas
// columnas/tabla más adelante, este dashboard es el lugar para conectarlas.

const ETAPAS = ['Nuevo', 'Contactado', 'Interesado', 'Muestrario', 'Cotización', 'Negociación', 'Cliente']
const ETAPA_COLOR = {
  Nuevo: '#9CA3AF', Contactado: '#2563EB', Interesado: '#7C3AED', Muestrario: '#DB2777',
  Cotización: '#D97706', Negociación: '#EA580C', Cliente: '#059669',
}
const SCORE_COLOR = { A: '#059669', B: '#D97706', C: '#9CA3AF' }
const SCORE_LABEL = { A: 'Alto potencial', B: 'Medio potencial', C: 'Bajo potencial' }
const TIPO_LABEL = {
  'mueblería': 'Mueblerías', diseñador_interior: 'Diseñadores de interiores', arquitecto: 'Arquitectos',
  fabrica_muebles: 'Fábricas de muebles', hotel: 'Hoteles / Hospitality', otro: 'Otro',
}
const TIPO_COLOR = {
  'mueblería': '#2563EB', diseñador_interior: '#7C3AED', arquitecto: '#059669',
  fabrica_muebles: '#D97706', hotel: '#DC2626', otro: '#0EA5E9',
}

function donutGradient(data) {
  let acc = 0
  const stops = data.map(d => {
    const start = acc
    acc += d.pct
    return `${d.color} ${start}% ${acc}%`
  })
  return stops.length ? `conic-gradient(${stops.join(', ')})` : '#F3F4F6'
}

export default function SalesDashboard() {
  const mapDivRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [prospectos, setProspectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroScore, setFiltroScore] = useState('todos') // todos | A | B | C | sin

  useEffect(() => {
    supabase.from('prospectos').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProspectos(data ?? []); setLoading(false) })
  }, [])

  const total = prospectos.length
  const conUbicacion = useMemo(() => prospectos.filter(p => p.lat != null && p.lng != null), [prospectos])

  const kpis = useMemo(() => {
    const porScore = { A: 0, B: 0, C: 0 }
    prospectos.forEach(p => { if (p.score) porScore[p.score] = (porScore[p.score] || 0) + 1 })
    const nuevos = prospectos.filter(p => p.etapa === 'Nuevo').length
    const clientes = prospectos.filter(p => p.etapa === 'Cliente').length
    const conEmail = prospectos.filter(p => p.email).length
    const pct = n => (total ? Math.round((n / total) * 100) : 0)
    return [
      { icon: '👥', label: 'PROSPECTOS TOTALES', value: total, color: '#111827' },
      { icon: '🟢', label: 'SCORE A', value: porScore.A, color: SCORE_COLOR.A, pct: pct(porScore.A) },
      { icon: '🟡', label: 'SCORE B', value: porScore.B, color: SCORE_COLOR.B, pct: pct(porScore.B) },
      { icon: '⚪', label: 'SCORE C', value: porScore.C, color: SCORE_COLOR.C, pct: pct(porScore.C) },
      { icon: '🆕', label: 'ETAPA NUEVO', value: nuevos, color: ETAPA_COLOR.Nuevo, pct: pct(nuevos) },
      { icon: '🤝', label: 'CLIENTES', value: clientes, color: ETAPA_COLOR.Cliente, pct: pct(clientes) },
    ]
  }, [prospectos, total])

  const conEmailCount = prospectos.filter(p => p.email).length

  const pipelineStages = useMemo(() => ETAPAS.map(etapa => {
    const count = prospectos.filter(p => p.etapa === etapa).length
    return { label: etapa, count, pct: total ? Math.round((count / total) * 100) : 0, color: ETAPA_COLOR[etapa] }
  }), [prospectos, total])

  const prospectosPorTipo = useMemo(() => {
    const conteo = {}
    prospectos.forEach(p => { conteo[p.tipo] = (conteo[p.tipo] || 0) + 1 })
    const totalTipo = Object.values(conteo).reduce((s, v) => s + v, 0)
    return Object.entries(conteo)
      .map(([tipo, val]) => ({
        name: TIPO_LABEL[tipo] ?? tipo,
        val,
        pct: totalTipo ? Math.round((val / totalTipo) * 100) : 0,
        color: TIPO_COLOR[tipo] ?? '#6B7280',
      }))
      .sort((a, b) => b.val - a.val)
  }, [prospectos])

  const topZonas = useMemo(() => {
    const conteo = {}
    prospectos.forEach(p => {
      const zona = [p.municipio, p.estado].filter(Boolean).join(', ')
      if (!zona) return
      conteo[zona] = (conteo[zona] || 0) + 1
    })
    return Object.entries(conteo).map(([zona, count]) => ({ zona, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [prospectos])

  const pendientes = useMemo(() => [
    { label: 'Nuevos sin contactar', count: prospectos.filter(p => p.etapa === 'Nuevo').length, color: ETAPA_COLOR.Nuevo },
    { label: 'Sin calificar (score)', count: prospectos.filter(p => !p.score).length, color: '#9CA3AF' },
    { label: 'Sin email', count: prospectos.filter(p => !p.email).length, color: '#D97706' },
    { label: 'Sin ubicación en el mapa', count: prospectos.filter(p => p.lat == null || p.lng == null).length, color: '#9CA3AF' },
  ], [prospectos])

  // Mapa Leaflet real — se inicializa una sola vez.
  useEffect(() => {
    mapRef.current = L.map(mapDivRef.current).setView([23.6345, -102.5528], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)
    return () => mapRef.current?.remove()
  }, [])

  // Pinta/actualiza los marcadores cuando cambian los datos o el filtro de score.
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const visibles = conUbicacion.filter(p => {
      if (filtroScore === 'todos') return true
      if (filtroScore === 'sin') return !p.score
      return p.score === filtroScore
    })

    const bounds = []
    visibles.forEach(p => {
      const color = p.score ? SCORE_COLOR[p.score] : '#D1D5DB'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
      })
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current)
      marker.bindPopup(`<b>${p.nombre}</b><br>${[p.colonia, p.municipio, p.estado].filter(Boolean).join(', ')}<br>Etapa: ${p.etapa}${p.score ? ` · Score ${p.score}` : ''}`)
      markersRef.current.push(marker)
      bounds.push([p.lat, p.lng])
    })

    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
  }, [conUbicacion, filtroScore])

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Dashboard</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Dashboard</b></div>
        </div>
      </div>

      <div className="adm-content">
        {!loading && total > 0 && total <= 10 && (
          <div className="sls-note">
            Todavía hay pocos prospectos cargados ({total}) — las cifras de abajo son reales, no ejemplos, pero van a moverse rápido conforme agregues más desde el <b>Prospector</b>.
          </div>
        )}
        {!loading && total === 0 && (
          <div className="sls-note">No hay prospectos todavía — agrega desde el <b>Prospector</b> para que este dashboard empiece a mostrar datos.</div>
        )}

        <div className="sls-stat-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {kpis.map(k => (
            <div key={k.label} className="sls-stat-card">
              <div className="sls-stat-label">{k.label}</div>
              <div className="sls-stat-num" style={{ color: k.color }}>{k.value}</div>
              {k.pct !== undefined && <div className="sls-kpi-pct">{k.pct}% del total</div>}
            </div>
          ))}
          <div className="sls-stat-card sls-dark">
            <div className="sls-stat-label">LISTOS PARA CAMPAÑA</div>
            <div className="sls-stat-num">{conEmailCount}</div>
            <div className="sls-stat-delta">con email registrado</div>
          </div>
        </div>

        <div className="sls-grid-3">
          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Mapa de prospectos</div></div>
            <div className="sls-map-filter-row">
              {[
                { key: 'todos', label: 'Todos', dot: '#111827' },
                { key: 'A', label: 'Score A', dot: SCORE_COLOR.A },
                { key: 'B', label: 'Score B', dot: SCORE_COLOR.B },
                { key: 'C', label: 'Score C', dot: SCORE_COLOR.C },
                { key: 'sin', label: 'Sin calificar', dot: '#D1D5DB' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`sls-map-filter-chip ${filtroScore === f.key ? 'sls-active' : ''}`}
                  onClick={() => setFiltroScore(f.key)}
                >
                  <span className="sls-map-filter-dot" style={{ background: f.dot }} />
                  {f.label}
                </button>
              ))}
            </div>
            <div className="sls-dash-map" ref={mapDivRef} />
            {conUbicacion.length < total && (
              <div className="sls-colonia-empty-hint" style={{ marginTop: 8 }}>
                {total - conUbicacion.length} prospecto{total - conUbicacion.length !== 1 ? 's' : ''} sin coordenadas — no aparece{total - conUbicacion.length !== 1 ? 'n' : ''} en el mapa (normalmente leads del sitio, sin geocodificar).
              </div>
            )}
            <div className="sls-legend">
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: SCORE_COLOR.A }} /> {SCORE_LABEL.A}</span>
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: SCORE_COLOR.B }} /> {SCORE_LABEL.B}</span>
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: SCORE_COLOR.C }} /> {SCORE_LABEL.C}</span>
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: '#D1D5DB' }} /> Sin calificar</span>
            </div>
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Pendientes</div></div>
            {pendientes.map(p => (
              <div key={p.label} className="sls-pending-item">
                <div className="sls-pending-count" style={{ color: p.color }}>{p.count}</div>
                <div className="sls-pending-label">{p.label}</div>
              </div>
            ))}
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Prospectos por tipo</div></div>
            {prospectosPorTipo.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Sin datos aún</div>
            ) : (
              <>
                <div className="sls-donut-wrap">
                  <div className="sls-donut" style={{ background: donutGradient(prospectosPorTipo) }}>
                    <div className="sls-donut-hole">
                      <div className="sls-donut-total">{total}</div>
                      <div className="sls-donut-total-label">Total</div>
                    </div>
                  </div>
                </div>
                {prospectosPorTipo.map(d => (
                  <div key={d.name} className="sls-donut-legend-row">
                    <span className="sls-legend-swatch" style={{ background: d.color }} />
                    <span className="sls-donut-legend-name">{d.name}</span>
                    <span className="sls-donut-legend-pct">{d.pct}%</span>
                    <span className="sls-donut-legend-val">{d.val}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="sls-grid-3-b">
          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Pipeline comercial</div></div>
            <div className="sls-pipeline-row" style={{ gridTemplateColumns: `repeat(${pipelineStages.length}, 1fr)` }}>
              {pipelineStages.map(s => (
                <div key={s.label} className="sls-pipeline-stage">
                  <div className="sls-pipeline-label">{s.label.toUpperCase()}</div>
                  <div className="sls-pipeline-count" style={{ color: s.color }}>{s.count}</div>
                  <div className="sls-pipeline-value">{s.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-card" style={{ margin: 0, gridColumn: 'span 2' }}>
            <div className="adm-card-header"><div className="adm-card-title">Top zonas</div></div>
            {topZonas.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Sin ubicación registrada todavía</div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Zona</th><th>Prospectos</th></tr></thead>
                <tbody>
                  {topZonas.map(z => (
                    <tr key={z.zona}>
                      <td>{z.zona}</td>
                      <td style={{ fontWeight: 600 }}>{z.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
