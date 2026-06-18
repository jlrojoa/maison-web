import { Outlet, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/textiles', label: 'Tejidos' },
  { to: '/admin/leads', label: 'Leads' },
]

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--sans)' }}>
      <aside style={{ width: 220, background: 'var(--ink)', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: '#fff', letterSpacing: '.2em', marginBottom: 32 }}>
          Maison<span style={{ color: 'var(--gold)' }}>.</span>
        </div>
        {LINKS.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            style={({ isActive }) => ({
              padding: '10px 14px',
              textDecoration: 'none',
              fontSize: 11,
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              borderRadius: 2,
              background: isActive ? 'rgba(184,151,106,.18)' : 'transparent',
              color: isActive ? 'var(--gold-l)' : 'rgba(255,255,255,.42)',
              transition: 'all .2s',
            })}>
            {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <NavLink to="/" style={{ fontSize: 11, color: 'rgba(255,255,255,.22)', textDecoration: 'none' }}>
            ← Volver al sitio
          </NavLink>
        </div>
      </aside>
      <main style={{ flex: 1, background: 'var(--warm)', padding: 48, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
