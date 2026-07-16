import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import './AdminLayout.css'

export default function AdminLayout() {
  const { email, loading, signOut } = useAdminAuth()
  const location = useLocation()

  if (loading) return null
  if (!email) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  return (
    <div className="adm-app">
      <aside className="adm-sidebar">
        <div className="adm-sidebar-header">
          <div className="adm-sidebar-logo">Brendell</div>
          <div className="adm-sidebar-sub">Admin</div>
        </div>

        <div className="adm-nav-section">
          <NavLink to="/admin" end className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">⌂</span> Dashboard
          </NavLink>
        </div>

        <div className="adm-nav-section">
          <div className="adm-nav-label">CATÁLOGO</div>
          <NavLink to="/admin/productos" end className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">▤</span> Productos
          </NavLink>
          <NavLink to="/admin/productos/modelos" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">⊞</span> Modelos
          </NavLink>
          <NavLink to="/admin/productos/medidas" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">📐</span> Medidas
          </NavLink>
          <NavLink to="/admin/productos/telas" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">▦</span> Telas y categorías
          </NavLink>
          <NavLink to="/admin/productos/colecciones" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">◫</span> Colecciones
          </NavLink>
          <NavLink to="/admin/productos/colores" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">●</span> Colores
          </NavLink>
          <NavLink to="/admin/productos/precios" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">$</span> Precios
          </NavLink>
        </div>

        <div className="adm-nav-section">
          <div className="adm-nav-label">CONTENIDO</div>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">▧</span> Páginas</div>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">▭</span> Banners</div>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">"</span> Testimonios</div>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">✦</span> Inspiración</div>
        </div>

        <div className="adm-nav-section">
          <div className="adm-nav-label">CONFIGURACIÓN</div>
          <NavLink to="/admin/leads" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">◔</span> Leads
          </NavLink>
          <NavLink to="/admin/distribuidores" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">◔</span> Distribuidores
          </NavLink>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">⚙</span> Ajustes</div>
          <div className="adm-nav-item adm-disabled"><span className="adm-nav-icon">▣</span> Roles</div>
        </div>

        <NavLink to="/" className="adm-sidebar-footer">← Volver al sitio</NavLink>
        <button type="button" className="adm-sidebar-footer" onClick={signOut}>⏻ Cerrar sesión ({email})</button>
      </aside>

      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  )
}
