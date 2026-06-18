import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ productos: '…', textiles: '…', leads: '…' })

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('*', { count: 'exact', head: true }),
      supabase.from('textiles').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
    ]).then(([p, t, l]) => setCounts({
      productos: p.count ?? 0,
      textiles: t.count ?? 0,
      leads: l.count ?? 0,
    }))
  }, [])

  const tiles = [
    { label: 'Productos', value: counts.productos, link: '/admin/productos' },
    { label: 'Tejidos', value: counts.textiles, link: '/admin/textiles' },
    { label: 'Leads', value: counts.leads, link: '/admin/leads' },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.1em', marginBottom: 40 }}>Panel de administración Maison</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
        {tiles.map(t => (
          <a key={t.label} href={t.link} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', padding: '32px 28px', borderBottom: '3px solid var(--gold)', cursor: 'pointer', transition: 'transform .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontFamily: 'var(--serif)', fontSize: 52, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>{t.value}</div>
              <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginTop: 8 }}>{t.label}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
