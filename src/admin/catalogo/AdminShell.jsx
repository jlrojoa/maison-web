// src/admin/catalogo/AdminShell.jsx
import { NavLink, Outlet } from 'react-router-dom'
import './AdminShell.css'

export default function AdminShell() {
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
          <NavLink to="/admin/categorias" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">◔</span> Categorías
          </NavLink>
          <NavLink to="/admin/productos" end className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">▤</span> Productos
          </NavLink>
          <NavLink to="/admin/productos/modelos" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">⊞</span> Modelos
          </NavLink>
          <NavLink to="/admin/productos/medidas" className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-active' : ''}`}>
            <span className="adm-nav-icon">📐</span> Medidas
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
      </aside>

      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  )
}
