import { Outlet, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/telas', label: 'Telas' },
  { to: '/admin/textiles', label: 'Tejidos' },
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/distribuidores', label: 'Distribuidores' },
]

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--sans)' }}>
      <aside style={{ width: 220, background: 'var(--warm)', borderRight: '1px solid var(--sand)', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: '.2em', marginBottom: 32 }}>
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
              background: isActive ? 'var(--sand)' : 'transparent',
              color: isActive ? 'var(--charcoal)' : 'var(--taupe)',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all .2s',
            })}>
            {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--sand)' }}>
          <NavLink to="/" style={{ fontSize: 11, color: 'var(--taupe)', textDecoration: 'none', letterSpacing: '.1em' }}>
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
