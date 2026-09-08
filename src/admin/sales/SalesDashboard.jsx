import './sales.css'

// Datos de ejemplo — este dashboard aún no está conectado a Supabase.
// Ver nota en SalesProspectos.jsx sobre qué sí es real.

const kpis = [
  { icon: '👤', label: 'PROSPECTOS ENCONTRADOS', value: '217', delta: '+18% vs mes anterior' },
  { icon: '★', label: 'CALIFICADOS (A)', value: '83', delta: '+12% vs mes anterior' },
  { icon: '☎', label: 'CONTACTADOS', value: '52', delta: '+22% vs mes anterior' },
  { icon: '💬', label: 'CONVERSACIONES', value: '19', delta: '+27% vs mes anterior' },
  { icon: '📄', label: 'COTIZACIONES', value: '7', delta: '+16% vs mes anterior' },
  { icon: '🤝', label: 'CLIENTES NUEVOS', value: '3', delta: '+50% vs mes anterior' },
]

const pipelineTotal = { value: '$486,000', sub: 'MXN', delta: '+31% vs mes anterior' }

const proximasAcciones = [
  { icon: '☎', title: 'Llamar a Estudio Legorreta', sub: 'Polanco, CDMX', when: 'Hoy', time: '10:00 AM' },
  { icon: '📦', title: 'Enviar muestrario Nantes', sub: 'Taller de Mobiliario', when: 'Hoy', time: '12:30 PM' },
  { icon: '📄', title: 'Dar seguimiento a cotización', sub: 'Casa Mirador', when: 'Mañana', time: '09:00 AM' },
  { icon: '📅', title: 'Visita a showroom Brendell', sub: 'Arquitectura 911', when: 'Mañana', time: '04:00 PM' },
  { icon: '✉', title: 'Enviar catálogo Didot', sub: 'Studio Indigo', when: '22 Mayo', time: '11:00 AM' },
]

const actividadReciente = [
  { icon: '📝', text: 'Mariana Gómez agregó una nota a', bold: 'Estudio Legorreta', when: 'Hace 1 hora' },
  { icon: '📦', text: 'José Luis Rojo envió catálogo a', bold: 'Taller de Mobiliario', when: 'Hace 3 horas' },
  { icon: '↻', text: 'Alejandra Díaz cambió etapa de', bold: 'Casa Mirador → Cotización', when: 'Ayer' },
  { icon: '📅', text: 'Mariana Gómez agendó visita con', bold: 'Arquitectura 911', when: 'Ayer' },
  { icon: '＋', text: 'José Luis Rojo creó nuevo contacto', bold: 'Studio Indigo', when: 'Hace 2 días' },
]

const pipelineStages = [
  { label: 'NUEVO', count: 52, value: '$0' },
  { label: 'CONTACTADO', count: 52, value: '$36,000' },
  { label: 'INTERESADO', count: 19, value: '$96,000' },
  { label: 'MUESTRARIO', count: 11, value: '$128,000' },
  { label: 'COTIZACIÓN', count: 7, value: '$148,000' },
  { label: 'NEGOCIACIÓN', count: 4, value: '$76,000' },
  { label: 'CLIENTE', count: 3, value: '$0' },
]

const prospectosPorTipo = [
  { name: 'Interioristas', pct: 38, val: 82, color: '#111827' },
  { name: 'Arquitectos', pct: 27, val: 58, color: '#9CA3AF' },
  { name: 'Mueblerías', pct: 18, val: 39, color: '#D1D5DB' },
  { name: 'Desarrolladores', pct: 10, val: 22, color: '#6B7280' },
  { name: 'Hoteles / Hospitality', pct: 7, val: 16, color: '#E5E7EB' },
]

const topZonas = [
  { zona: 'CDMX - Polanco / Lomas', prospectos: 47, conversaciones: 9 },
  { zona: 'Monterrey - San Pedro', prospectos: 31, conversaciones: 5 },
  { zona: 'Guadalajara - Providencia', prospectos: 28, conversaciones: 3 },
  { zona: 'Cancún - Zona Hotelera', prospectos: 18, conversaciones: 2 },
  { zona: 'Querétaro - Juriquilla', prospectos: 15, conversaciones: 1 },
]

const pins = [
  { x: 30, y: 30, tier: 'A' }, { x: 45, y: 40, tier: 'B' }, { x: 55, y: 55, tier: 'A' },
  { x: 65, y: 35, tier: 'C' }, { x: 25, y: 60, tier: 'C' }, { x: 75, y: 65, tier: 'B' },
]
const tierColor = { A: '#111827', B: '#6B7280', C: '#D1D5DB' }

function donutGradient(data) {
  let acc = 0
  const stops = data.map(d => {
    const start = acc
    acc += d.pct
    return `${d.color} ${start}% ${acc}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default function SalesDashboard() {
  const total = prospectosPorTipo.reduce((s, d) => s + d.val, 0)

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Dashboard</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Dashboard</b></div>
        </div>
        <div className="adm-topbar-actions">
          <button type="button" className="adm-btn adm-btn-dark">+ Nueva actividad</button>
        </div>
      </div>

      <div className="adm-content">
        <div className="sls-note">
          Datos de ejemplo — este dashboard todavía no está conectado a Supabase. Los prospectos reales (mensajes del sitio) se ven en <b>Prospectos</b>.
        </div>

        <div className="sls-stat-grid" style={{ marginBottom: 20 }}>
          {kpis.map(k => (
            <div key={k.label} className="sls-stat-card">
              <div className="sls-stat-label">{k.label}</div>
              <div className="sls-stat-num">{k.value}</div>
              <div className="sls-stat-delta">↑ {k.delta}</div>
            </div>
          ))}
          <div className="sls-stat-card sls-dark">
            <div className="sls-stat-label">PIPELINE TOTAL</div>
            <div className="sls-stat-num">{pipelineTotal.value}</div>
            <div className="sls-stat-delta">↑ {pipelineTotal.delta}</div>
          </div>
        </div>

        <div className="sls-grid-3">
          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Mapa de prospectos</div></div>
            <div className="sls-map-placeholder">
              {pins.map((p, i) => (
                <span key={i} className="sls-pin" style={{ left: `${p.x}%`, top: `${p.y}%`, width: 22, height: 22, background: tierColor[p.tier] }}>{p.tier}</span>
              ))}
              <div className="sls-map-note">
                <div className="sls-map-note-box">Mapa interactivo — próximamente (requiere geocodificar cada prospecto)</div>
              </div>
            </div>
            <div className="sls-legend">
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: '#111827' }} /> Alto potencial</span>
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: '#6B7280' }} /> Medio potencial</span>
              <span className="sls-legend-dot"><span className="sls-legend-swatch" style={{ background: '#D1D5DB' }} /> Bajo potencial</span>
            </div>
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Próximas acciones</div></div>
            {proximasAcciones.map((a, i) => (
              <div key={i} className="sls-list-item">
                <div className="sls-list-icon">{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="sls-list-title">{a.title}</div>
                  <div className="sls-list-sub">{a.sub}</div>
                </div>
                <div className="sls-list-meta">{a.when}<br />{a.time}</div>
              </div>
            ))}
            <div className="sls-list-footer">Ver todas las acciones →</div>
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Actividad reciente</div></div>
            {actividadReciente.map((a, i) => (
              <div key={i} className="sls-list-item">
                <div className="sls-list-icon">{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="sls-list-sub">{a.text}</div>
                  <div className="sls-list-title">{a.bold}</div>
                </div>
                <div className="sls-list-meta">{a.when}</div>
              </div>
            ))}
            <div className="sls-list-footer">Ver toda la actividad →</div>
          </div>
        </div>

        <div className="sls-grid-3-b">
          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Pipeline comercial</div></div>
            <div className="sls-pipeline-row" style={{ gridTemplateColumns: `repeat(${pipelineStages.length}, 1fr)` }}>
              {pipelineStages.map(s => (
                <div key={s.label} className="sls-pipeline-stage">
                  <div className="sls-pipeline-label">{s.label}</div>
                  <div className="sls-pipeline-count">{s.count}</div>
                  <div className="sls-pipeline-value">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="adm-card-sub" style={{ marginBottom: 0 }}>Valor total del pipeline</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>$486,000 <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>MXN</span></div>
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Prospectos por tipo</div></div>
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
          </div>

          <div className="adm-card" style={{ margin: 0 }}>
            <div className="adm-card-header"><div className="adm-card-title">Top zonas</div></div>
            <table className="adm-table">
              <thead><tr><th>Zona</th><th>Prospectos</th><th>Conversac.</th></tr></thead>
              <tbody>
                {topZonas.map(z => (
                  <tr key={z.zona}>
                    <td>{z.zona}</td>
                    <td>{z.prospectos}</td>
                    <td style={{ color: '#9CA3AF' }}>{z.conversaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
