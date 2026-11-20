// src/admin/cotizaciones/movil/MovilLayout.jsx — Marco del cotizador móvil: pide sesión de admin y trae su propio encabezado.
import { useEffect } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../catalogo/AdminAuthContext'
import './movil.css'

export default function MovilLayout() {
  const { email, loading, signOut } = useAdminAuth()
  const location = useLocation()

  // Solo en /m: ícono, nombre y modo "app" para "Agregar a pantalla de inicio" en iPhone.
  // Se ponen aquí (y no en index.html) para no afectar a la tienda pública.
  useEffect(() => {
    const puestos = []
    const poner = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); puestos.push(el) }
    poner('link', { rel: 'manifest', href: '/cotizador/manifest.webmanifest' })
    poner('link', { rel: 'apple-touch-icon', href: '/cotizador/apple-touch-icon.png' })
    poner('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
    poner('meta', { name: 'mobile-web-app-capable', content: 'yes' })
    poner('meta', { name: 'apple-mobile-web-app-title', content: 'Cotizar' })
    poner('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' })
    const vp = document.querySelector('meta[name="viewport"]'); const vpAntes = vp?.getAttribute('content')
    vp?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
    const tituloAntes = document.title; document.title = 'Cotizar · Brendell'
    return () => { puestos.forEach(el => el.remove()); if (vp && vpAntes) vp.setAttribute('content', vpAntes); document.title = tituloAntes }
  }, [])
  if (loading) return <div className="mv-cargando">Cargando…</div>
  if (!email) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return (
    <div className="mv-app">
      <header className="mv-top">
        {location.pathname !== '/m' ? <Link to="/m" className="mv-atras" aria-label="Volver">‹</Link> : <span className="mv-atras" />}
        <span className="mv-logo">BRENDELL</span>
        <button type="button" className="mv-salir" onClick={signOut}>Salir</button>
      </header>
      <main><Outlet /></main>
    </div>
  )
}
