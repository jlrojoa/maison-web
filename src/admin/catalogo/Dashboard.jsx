export default function Dashboard() {
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
          <button type="button" className="adm-btn">↗ Vista pública</button>
        </div>
      </div>
      <div className="adm-content">
        <div className="adm-stat-grid">
          {stats.map(s => (
            <div key={s.label} className="adm-stat-card">
              <div className="adm-stat-icon">{s.icon}</div>
              <div className="adm-stat-num">0</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
