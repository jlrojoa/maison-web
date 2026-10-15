import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import PerfilDistribuidor from '../components/PerfilDistribuidor'
import { useDistribuidor } from '../contexts/DistribuidorContext'

export default function MiPerfil() {
  const ctx = useDistribuidor()
  const navigate = useNavigate()
  useEffect(() => {
    if (!ctx?.loading && !ctx?.distribuidor) navigate('/distribuidores', { replace: true })
  }, [ctx?.loading, ctx?.distribuidor, navigate])
  if (ctx?.loading || !ctx?.distribuidor) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#64748B', fontSize: 13 }}>Cargando…</div>
  }
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0F172A' }}>
      <Nav solid />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '100px 24px 64px' }}>
        <Link to="/mi-espacio" style={{ fontSize: 12, color: '#64748B' }}>← Mi Espacio</Link>
        <h1 style={{ fontSize: 26, fontWeight: 300, margin: '8px 0 4px' }}>Mis datos</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
          Captúralos una sola vez. Salen en el PDF cuando cotizas a tu cliente con tus datos, y puedes cambiarlos cuando quieras.
        </p>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20 }}>
          <PerfilDistribuidor />
        </div>
      </div>
    </div>
  )
}
