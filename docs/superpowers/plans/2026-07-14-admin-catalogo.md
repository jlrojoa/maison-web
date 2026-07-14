# Admin de Catálogo (Brendell/Maison) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/admin` catalog panel (shell, Categorías, Productos with Información general/Modelos/Medidas/Precios tabs) replicating `brendell-admin-mockup_7.html` exactly in structure/style, wired to real Supabase data, so JL can create/edit categorías, productos (with images), medidas, and full price matrices without touching SQL.

**Architecture:** A new, self-contained set of components under `src/admin/catalogo/` with their own SaaS-style CSS ported 1:1 from the mockup (`Inter`, ink/white/gray palette, no Maison brand tokens). These REPLACE what the `/admin` route renders in `src/App.jsx`, but the OLD admin files (`AdminLayout.jsx`, `AdminDashboard.jsx`, `AdminProducts.jsx`, `AdminTelas.jsx`, `AdminTextiles.jsx`, `ImageUpload.jsx`) are left on disk untouched and simply unreferenced — per explicit user decision, this task builds fresh rather than restyling in place. `AdminLeads.jsx` and `AdminDistribuidores.jsx` (old brand style, functionally fine) are reused as-is and linked from the new sidebar's CONFIGURACIÓN section — restyling them is out of scope.

**Tech Stack:** React 18, react-router-dom v7 nested routes, `@supabase/supabase-js` (`src/lib/supabase.js`), Supabase Storage (bucket `productos`, created on first upload if missing — the one authorized infra operation, via the Storage client only, never SQL).

**Deviation from the standard TDD template:** Same as the configurador plan — no test runner exists in this repo. Verification is manual dev-server + Playwright + direct read-only Supabase checks per task.

**Scope confirmed with the user before writing this plan:**
- Item 6 of the original task brief ("Telas y categorías / Colecciones / Colores") is **entirely out of scope for this plan**. The mockup's "Telas y categorías" tab implies an open-ended, creatable set of tela "categorías" (grados), but `telas.grado` is a `text` column with a `CHECK` constraint fixed to exactly `('AA','A','B','C')` — there is no table backing an arbitrary 5th category, and altering that constraint is a schema change this task is forbidden from making. Per the user's explicit choice, this whole item (Telas y categorías + Colecciones + Colores tabs) is deferred pending a separate decision with JL. **Do not build any of these three tabs.**
- Real, non-negotiable auth protection of `/admin` (a login screen backed by `admin_users`) is explicitly **out of scope** for this task — the user confirmed this is a future task. `/admin` remains reachable without a login gate, exactly as it is today.
- The mockup's "Categorías de telas" add/edit modal is dropped for the reason above; this plan does not touch it at all (it's not even a stats-only view — item 6 is skipped completely, not partially).
- `AdminTextiles.jsx`/`AdminDashboard.jsx`'s dead reference to a non-existent `textiles` table is left alone (not fixed) per user's choice — this plan's new Dashboard is a fresh file that simply never queries that table, so the dead code in the old files is moot and untouched.
- Leads/Distribuidores get a temporary nav entry under CONFIGURACIÓN in the new sidebar (per user's choice), pointing at the existing, unmodified `/admin/leads` and `/admin/distribuidores` routes/components (old brand styling retained there — out of scope to fix).

**Known mockup gap already adjudicated:** the mockup has no dedicated screen for product-type Categorías CRUD (task item 2) — its only categoria-related UI is a static 4-option hardcoded `<select>`. Since the task explicitly requires this CRUD and forbids inventing new *visual language*, this plan builds it using the exact card/table/icon-button/toggle grammar already established everywhere else in the mockup (e.g. the "Categorías de telas" card's table layout), and adds one new sidebar nav entry for it under CATÁLOGO (a minimal, low-risk navigation addition, not a new design language). This will be called out again in the final report, same as the Task 1 tipo-icon gap was.

**Key schema facts confirmed via Supabase MCP (project `smnjbqjvqomopeulsuvp`) before writing this plan:**
- `categorias`: id, nombre, slug (unique), orden, activo, created_at.
- `productos`: id, categoria_id, nombre, slug (unique), subtitulo, descripcion, precio_desde, badge, activo, orden, isometrico_url, created_at, updated_at.
- `producto_configuraciones`: id, producto_id, nombre, precio_extra, orden, isometrico_url, dimensiones, activo. (`precio_extra` is a pre-existing column not part of this task's scope — never read or written by this plan.)
- `producto_precios`: id, producto_id, configuracion_id, grado (check AA/A/B/C), precio. One row per (producto_id, configuracion_id, grado) combination — upsert target uses all three as the conflict key.
- `producto_imagenes`: id, producto_id, url, alt, orden, es_principal, created_at.
- `producto_specs`: id, producto_id, titulo, tipo (**check constrained to exactly `'tabla'` / `'texto'`, Spanish — NOT `'table'`/`'text'`**, a bug already present in the old, now-unused `AdminProducts.jsx`; this plan always writes `tipo: 'texto'` and never repeats that bug), contenido (jsonb — this plan always stores a plain JSON string for `contenido`, one string per spec row), orden.
- `producto_orientaciones`: id, producto_id, nombre, orden. No `activo` column — orientaciones don't have an active/inactive toggle in the schema, so the mockup's edit/delete icon-buttons map to rename/remove only, never a toggle.
- Categorías whose orientaciones block should show: matched by **slug**, not name (names can be edited) — `categoria.slug === 'escuadras-l' || categoria.slug === 'chaise-lounge'` (the two real slugs confirmed in the DB for "Escuadras" and "Chaise Lounge").
- Storage buckets that already exist: `catalogos` (private), `maison` (public), `telas` (public). **No `productos` bucket exists yet** — Task 3/4 below create it on first upload via `supabase.storage.createBucket` if a preliminary check shows it's missing, exactly the one infra operation this task is authorized to perform, and only through the Storage client.

---

### Task 1: Worktree + new admin shell (sidebar, routing, Dashboard placeholder)

**Files:**
- Create: `src/admin/catalogo/AdminShell.jsx`
- Create: `src/admin/catalogo/AdminShell.css`
- Create: `src/admin/catalogo/Dashboard.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Set up the worktree**

```bash
cd "C:\Users\Usuario\Downloads\Maison"
git worktree add .worktrees/admin-catalogo -b feature/admin-catalogo
cd .worktrees/admin-catalogo
npm install
copy the existing .env.local into this worktree root (same as the configurador worktree setup)
npm run build   # confirm clean baseline before starting
```

- [ ] **Step 2: Create `AdminShell.css`, ported 1:1 from the mockup's `<style>` block**

Every value below is copied verbatim from `brendell-admin-mockup_7.html` (the confirmed final revision — the largest/newest of the 8 downloaded copies, by both file size and mtime; the un-suffixed `brendell-admin-mockup.html` is an early draft and must NOT be used as the source of truth). Class names are prefixed `adm-` to avoid any collision with `index.css` or the configurador's `cfg-` classes.

```css
/* src/admin/catalogo/AdminShell.css */
* { box-sizing: border-box; }
.adm-app { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB; color: #111827; font-size: 14px; display: flex; min-height: 100vh; }

.adm-sidebar { width: 220px; background: #fff; border-right: 1px solid #E5E7EB; padding: 20px 0; flex-shrink: 0; }
.adm-sidebar-header { padding: 0 20px 20px; border-bottom: 1px solid #F3F4F6; margin-bottom: 16px; }
.adm-sidebar-logo { font-size: 17px; font-weight: 700; letter-spacing: 0.3px; }
.adm-sidebar-sub { font-size: 11px; color: #9CA3AF; margin-top: 2px; }

.adm-nav-section { margin-bottom: 18px; }
.adm-nav-label { font-size: 10px; font-weight: 600; color: #9CA3AF; letter-spacing: 0.8px; padding: 0 20px; margin-bottom: 6px; }
.adm-nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 20px; font-size: 13.5px; color: #4B5563; cursor: pointer; text-decoration: none; }
.adm-nav-item:hover { background: #F9FAFB; }
.adm-nav-item.adm-active { background: #F3F4F6; color: #111827; font-weight: 600; border-right: 2px solid #111827; }
.adm-nav-item.adm-disabled { color: #D1D5DB; cursor: not-allowed; }
.adm-nav-item.adm-disabled:hover { background: none; }
.adm-nav-icon { width: 16px; text-align: center; opacity: 0.7; }

.adm-sidebar-footer { padding: 12px 20px; border-top: 1px solid #F3F4F6; margin-top: 12px; font-size: 13px; color: #6B7280; cursor: pointer; text-decoration: none; display: block; }

.adm-main { flex: 1; min-width: 0; }
.adm-topbar { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 18px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
.adm-page-title { font-size: 22px; font-weight: 600; }
.adm-breadcrumb { font-size: 12.5px; color: #9CA3AF; margin-top: 4px; }
.adm-breadcrumb b { color: #4B5563; }
.adm-topbar-actions { display: flex; gap: 10px; }
.adm-btn { padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #E5E7EB; background: #fff; color: #374151; display: flex; align-items: center; gap: 6px; }
.adm-btn-dark { background: #111827; color: #fff; border-color: #111827; }

.adm-tabbar { background: #fff; border-bottom: 1px solid #E5E7EB; padding: 0 32px; display: flex; gap: 28px; }
.adm-tab { padding: 13px 2px; font-size: 13.5px; color: #6B7280; cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; }
.adm-tab.adm-active { color: #111827; font-weight: 600; border-bottom-color: #111827; }

.adm-content { padding: 28px 32px; }

.adm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.adm-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 22px; margin-bottom: 20px; }
.adm-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.adm-card-title { font-size: 15px; font-weight: 600; }
.adm-card-sub { font-size: 12.5px; color: #9CA3AF; margin-bottom: 16px; }

.adm-btn-sm { padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 500; border: 1px solid #E5E7EB; background: #fff; color: #374151; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.adm-btn-sm.adm-dark { background: #111827; color: #fff; border-color: #111827; }

.adm-table { width: 100%; border-collapse: collapse; }
.adm-table th { text-align: left; font-size: 11.5px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; padding: 8px 10px; border-bottom: 1px solid #F3F4F6; }
.adm-table td { padding: 12px 10px; font-size: 13.5px; border-bottom: 1px solid #F9FAFB; vertical-align: middle; }
.adm-table tr:last-child td { border-bottom: none; }
.adm-drag { color: #D1D5DB; cursor: grab; }
.adm-cell-actions { display: flex; gap: 8px; justify-content: flex-end; }
.adm-icon-btn { width: 26px; height: 26px; border: 1px solid #E5E7EB; border-radius: 6px; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7280; font-size: 12px; }
.adm-icon-btn:hover { background: #F9FAFB; }

.adm-select, .adm-input, .adm-textarea { padding: 8px 12px; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 13.5px; font-family: inherit; color: #111827; background: #fff; }
.adm-select { min-width: 220px; }
.adm-label { font-size: 12.5px; font-weight: 500; color: #4B5563; display: block; margin-bottom: 6px; }
.adm-field { margin-bottom: 16px; }
.adm-field-row { display: flex; gap: 16px; }
.adm-field-row > div { flex: 1; }
.adm-textarea { width: 100%; resize: vertical; min-height: 80px; }

.adm-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
.adm-toggle-row:last-child { border-bottom: none; }
.adm-toggle-label { font-size: 13.5px; font-weight: 500; }
.adm-toggle-desc { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.adm-switch { width: 38px; height: 22px; border-radius: 11px; background: #111827; position: relative; cursor: pointer; flex-shrink: 0; border: none; }
.adm-switch.adm-off { background: #E5E7EB; }
.adm-switch::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 2px; right: 2px; transition: 0.15s; }
.adm-switch.adm-off::after { right: auto; left: 2px; }

.adm-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.adm-stat-card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 18px; text-align: center; }
.adm-stat-icon { width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 16px; }
.adm-stat-num { font-size: 24px; font-weight: 700; }
.adm-stat-label { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.adm-empty-note { font-size: 12.5px; color: #9CA3AF; padding: 12px 0; }
.adm-form-hint { font-size: 11.5px; color: #9CA3AF; margin-top: 4px; }

.adm-img-drop { border: 1.5px dashed #E5E7EB; border-radius: 8px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 12.5px; color: #9CA3AF; cursor: pointer; flex-direction: column; gap: 4px; }
.adm-img-thumb { width: 100%; height: 90px; border-radius: 6px; background-size: cover; background-position: center; position: relative; border: 1px solid #E5E7EB; }
.adm-img-thumb .adm-icon-btn { position: absolute; top: 6px; right: 6px; background: #fff; }
.adm-img-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.adm-principal-tag { position: absolute; bottom: 6px; left: 6px; background: #111827; color: #fff; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }

.adm-drawer-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.35); display: none; z-index: 50; }
.adm-drawer-overlay.adm-open { display: block; }
.adm-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; background: #fff; z-index: 51; display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(0,0,0,0.08); }
.adm-drawer-header { padding: 20px 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
.adm-drawer-title { font-size: 17px; font-weight: 600; }
.adm-drawer-close { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #E5E7EB; background: #fff; cursor: pointer; font-size: 14px; color: #6B7280; }
.adm-drawer-body { padding: 24px; overflow-y: auto; flex: 1; }
.adm-drawer-footer { padding: 16px 24px; border-top: 1px solid #E5E7EB; display: flex; gap: 10px; }
.adm-drawer-footer .adm-btn { flex: 1; justify-content: center; }
.adm-step-track { display: flex; gap: 6px; margin-bottom: 20px; }
.adm-step-dot { flex: 1; height: 3px; border-radius: 2px; background: #E5E7EB; }
.adm-step-dot.adm-done { background: #111827; }

.adm-modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.35); display: none; align-items: center; justify-content: center; z-index: 60; }
.adm-modal-overlay.adm-open { display: flex; }
.adm-modal-box { background: #fff; border-radius: 12px; width: 420px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.adm-modal-header { padding: 18px 22px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
.adm-modal-title { font-size: 15.5px; font-weight: 600; }
.adm-modal-body { padding: 22px; overflow-y: auto; }
.adm-modal-footer { padding: 14px 22px; border-top: 1px solid #E5E7EB; display: flex; gap: 10px; }
.adm-modal-footer .adm-btn { flex: 1; justify-content: center; }
```

Note: the mockup's `.drawer`/`.modal-overlay` use CSS transitions driven by toggling an `.open` class on a fixed-position overlay it never removes from the DOM (`transform: translateX(100%)` → `translateX(0)`). In React this plan uses conditional rendering (`{drawerOpen && (...)}`) instead of DOM-persistent class toggling — same visual result, more idiomatic React, matching how the configurador plan already handled the mockup's `hidden`-class pattern.

- [ ] **Step 3: Create `Dashboard.jsx`** — stat cards in zeros only, per the task brief ("Dashboard puede quedar con stat cards en ceros por ahora"). The "Atención requerida" card and "Actividad reciente" table are explicitly a future task — do not build them.

```jsx
// src/admin/catalogo/Dashboard.jsx
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
```

- [ ] **Step 4: Create `AdminShell.jsx`** — sidebar with the mockup's exact 4 sections, CATÁLOGO items pointing at real routes for the parts this plan builds, CONTENIDO fully disabled (placeholder, per brief), CONFIGURACIÓN with Usuarios/Ajustes/Roles disabled placeholders **plus** temporary working links to the existing Leads/Distribuidores pages (per user decision).

```jsx
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
```

Note: `Leads`/`Distribuidores` reuse the `◔` icon from the mockup's own "Usuarios" placeholder glyph (the mockup has no icon for these since it never anticipated them here) — a documented, low-risk reuse, not an invented new icon.

- [ ] **Step 5: Wire routes in `src/App.jsx`**

Read the current `/admin` route block first. Replace ONLY that block (the `<Route path="/admin" ...>` subtree) — do not touch `/`, `/colecciones`, `/producto/:slug`, `/distribuidores` (the public one, unrelated to `/admin/distribuidores`), or any lazy-import lines for pages outside `/admin`.

```jsx
// src/App.jsx — replace the admin-related imports
const AdminShell = lazy(() => import('./admin/catalogo/AdminShell'))
const Dashboard = lazy(() => import('./admin/catalogo/Dashboard'))
const Categorias = lazy(() => import('./admin/catalogo/Categorias'))
const Productos = lazy(() => import('./admin/catalogo/Productos'))
const AdminLeads = lazy(() => import('./admin/AdminLeads'))
const AdminDistribuidores = lazy(() => import('./admin/AdminDistribuidores'))
```

```jsx
// src/App.jsx — replace the entire <Route path="/admin" ...>...</Route> subtree with:
<Route
  path="/admin"
  element={
    <Suspense fallback={<AdminFallback />}>
      <AdminShell />
    </Suspense>
  }
>
  <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
  <Route path="categorias" element={<Suspense fallback={<AdminFallback />}><Categorias /></Suspense>} />
  <Route path="productos/*" element={<Suspense fallback={<AdminFallback />}><Productos /></Suspense>} />
  <Route path="leads" element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
  <Route path="distribuidores" element={<Suspense fallback={<AdminFallback />}><AdminDistribuidores /></Suspense>} />
</Route>
```

`Categorias.jsx` and `Productos.jsx` don't exist yet — Tasks 2-7 create them. For THIS task, create tiny placeholder stubs so the route tree compiles and can be verified, matching the style established in Task 1 of the configurador plan (skeleton first, fill in later):

```jsx
// src/admin/catalogo/Categorias.jsx (placeholder — Task 2 replaces this)
export default function Categorias() {
  return <div className="adm-content">Categorías — pendiente (Task 2)</div>
}
```

```jsx
// src/admin/catalogo/Productos.jsx (placeholder — Task 3 replaces this)
export default function Productos() {
  return <div className="adm-content">Productos — pendiente (Task 3)</div>
}
```

Also delete the now-orphaned old imports/routes this replaces: the old `AdminLayout`, `AdminDashboard`, `AdminProducts`, `AdminTelas` lazy-import lines and their nested `<Route>`s (`telas`). Do NOT delete the actual files (`src/admin/AdminLayout.jsx` etc.) from disk — only stop referencing them from `App.jsx`, per the user's explicit decision to leave old files in place, unused.

- [ ] **Step 6: Verify in browser**

`npm run dev`, open `/admin` → Dashboard with 4 zeroed stat cards, Inter font, no serif/gold anywhere. Click "Categorías" → placeholder text. Click "Productos" → placeholder text. Click "Modelos"/"Medidas"/"Precios" in sidebar → all currently land on the same Productos placeholder (expected, since the real tab logic isn't built yet — just confirm no 404/crash). Click "Leads" → real, working, old-styled Leads page loads (confirms the reuse works). Click "Distribuidores" → same. Click "← Volver al sitio" → home page. Grep the two new files for `--serif`, `--gold`, `--charcoal`, `var(--` → zero matches.

- [ ] **Step 7: Commit**

```bash
git add src/admin/catalogo/ src/App.jsx
git commit -m "feat: add admin catalogo shell, sidebar, and dashboard placeholder"
```

---

### Task 2: Categorías CRUD

**Files:**
- Modify: `src/admin/catalogo/Categorias.jsx` (replace placeholder)

- [ ] **Step 1: Implement full list + create/edit + deactivate**

```jsx
// src/admin/catalogo/Categorias.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY = { nombre: '', slug: '', orden: 0 }

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function Categorias() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('categorias').select('*').order('orden')
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setEditing(null) }

  const openNew = () => { reset(); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row.id)
    setForm({ nombre: row.nombre ?? '', slug: row.slug ?? '', orden: row.orden ?? 0 })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); reset() }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        slug: form.slug || slugify(form.nombre),
        orden: parseInt(form.orden) || 0,
      }
      if (editing) {
        await supabase.from('categorias').update(payload).eq('id', editing)
      } else {
        await supabase.from('categorias').insert({ ...payload, activo: true })
      }
      closeModal()
      load()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (row) => {
    await supabase.from('categorias').update({ activo: !row.activo }).eq('id', row.id)
    load()
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Categorías</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Categorías</b></div>
        </div>
        <div className="adm-topbar-actions">
          <button type="button" className="adm-btn adm-btn-dark" onClick={openNew}>+ Nueva categoría</button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Todas las categorías</div>
              <div className="adm-card-sub">Tipos de producto que ve el cliente en el configurador (Sofás, Camas, Escuadras…).</div>
            </div>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Orden</th><th>Nombre</th><th>Slug</th><th>Activa</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="adm-empty-note">No hay categorías aún</td></tr>
              ) : rows.map(row => (
                <tr key={row.id}>
                  <td className="adm-drag">⠿</td>
                  <td>{row.orden}</td>
                  <td>{row.nombre}</td>
                  <td style={{ color: '#9CA3AF' }}>{row.slug}</td>
                  <td>{row.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸ inactiva</span>}</td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => openEdit(row)}>✎</button>
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(row)}>{row.activo ? '⏸' : '▶'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`adm-modal-overlay ${modalOpen ? 'adm-open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
        {modalOpen && (
          <div className="adm-modal-box">
            <div className="adm-modal-header">
              <div className="adm-modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</div>
              <button type="button" className="adm-drawer-close" onClick={closeModal}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-label">Nombre</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.nombre}
                  onChange={e => { set('nombre', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Slug</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.slug}
                  onChange={e => set('slug', e.target.value)} />
                <div className="adm-form-hint">Se genera automático del nombre; puedes editarlo.</div>
              </div>
              <div className="adm-field">
                <label className="adm-label">Orden de aparición</label>
                <input className="adm-input" type="number" style={{ width: '100%' }} value={form.orden}
                  onChange={e => set('orden', e.target.value)} />
              </div>
              {!editing && (
                <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 14, marginBottom: 0, padding: '12px 14px' }}>
                  <div className="adm-form-hint" style={{ color: '#6B7280' }}>
                    ⚠️ Una categoría nueva afecta la matriz de precios de los productos que se le asignen.
                  </div>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={closeModal}>Cancelar</button>
              <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

Note on deactivate icon: the mockup's generic 🗑 delete icon is replaced here with a ⏸/▶ pause/play toggle icon, since the brief mandates soft-deactivation only ("NO borrado físico") — reusing the mockup's own 🗑→pause-icon convention already seen for inactive rows elsewhere in the mockup (e.g. the Modelos tab's "⏸ inactivo" text), not an invented pattern.

- [ ] **Step 2: Verify in browser**

Open `/admin/categorias`. Confirm the 7 real categorias load (Sofás e Individuales, Camas, Escuadras, Chaise Lounge, Modulares, Butacas, Mesas). Create a test categoría, confirm it appears with an auto-generated slug, edit its orden, deactivate it (confirm it shows "⏸ inactiva" and the row is NOT deleted — re-query the table directly via Supabase to confirm the row still exists with `activo:false`), then delete your test data via the UI's deactivate (do not leave test categorías activo:true in real data — deactivate, don't worry about physical cleanup since soft-delete is the intended mechanism).

- [ ] **Step 3: Commit**

```bash
git add src/admin/catalogo/Categorias.jsx
git commit -m "feat: add categorias CRUD to admin catalogo"
```

---

### Task 3: Productos — Información general tab (form, specs, orientaciones) + Nuevo producto drawer

**Files:**
- Modify: `src/admin/catalogo/Productos.jsx` (replace placeholder)
- Create: `src/admin/catalogo/NuevoProductoDrawer.jsx`

- [ ] **Step 1: Build `NuevoProductoDrawer.jsx`** — matches the mockup's drawer exactly (nombre, tipo/categoría dropdown, descripción, activo toggle, informational hint card). The mockup's 3-dot step-track is kept as a static visual (first dot done) since no steps 2/3 content exists anywhere in the mockup to build against — this plan does not invent multi-step logic beyond what's shown.

```jsx
// src/admin/catalogo/NuevoProductoDrawer.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function NuevoProductoDrawer({ open, categorias, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => { setNombre(''); setCategoriaId(''); setDescripcion(''); setActivo(false) }
  const close = () => { reset(); onClose() }

  const create = async () => {
    if (!nombre.trim()) return alert('El nombre es obligatorio.')
    if (!categoriaId) return alert('Selecciona un tipo (categoría).')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('productos').insert({
        nombre,
        slug: slugify(nombre),
        categoria_id: categoriaId,
        descripcion,
        activo,
        orden: 0,
      }).select().single()
      if (error) throw error
      reset()
      onCreated(data)
    } catch (err) {
      alert(`Error al crear: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-drawer-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="adm-drawer">
        <div className="adm-drawer-header">
          <div className="adm-drawer-title">Nuevo producto</div>
          <button type="button" className="adm-drawer-close" onClick={close}>✕</button>
        </div>
        <div className="adm-drawer-body">
          <div className="adm-step-track">
            <div className="adm-step-dot adm-done"></div>
            <div className="adm-step-dot"></div>
            <div className="adm-step-dot"></div>
          </div>
          <div className="adm-empty-note" style={{ marginBottom: 16 }}>Paso 1 de 3 — Datos básicos</div>

          <div className="adm-field">
            <label className="adm-label">Nombre del modelo</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Cubo" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          <div className="adm-field">
            <label className="adm-label">Tipo (categoría)</label>
            <select className="adm-select" style={{ width: '100%' }} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Selecciona un tipo...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <div className="adm-form-hint">Si el modelo ya existe en otro tipo (ej. Cubo en Sofás), se crea como registro independiente — puede tener medidas y precios distintos.</div>
          </div>

          <div className="adm-field">
            <label className="adm-label">Descripción</label>
            <textarea className="adm-textarea" placeholder="Breve descripción del modelo..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>

          <div className="adm-toggle-row">
            <div>
              <div className="adm-toggle-label">Producto activo</div>
              <div className="adm-toggle-desc">Puedes dejarlo apagado mientras terminas de cargar medidas, precios e imágenes</div>
            </div>
            <button type="button" className={`adm-switch ${activo ? '' : 'adm-off'}`} onClick={() => setActivo(a => !a)} />
          </div>

          <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 16, marginBottom: 0 }}>
            <div className="adm-form-hint" style={{ color: '#6B7280' }}>
              📋 <b>Después de crear</b> podrás agregar sus medidas, precios por grado, imágenes y (si aplica) orientaciones — todo desde sus pestañas correspondientes.
            </div>
          </div>
        </div>
        <div className="adm-drawer-footer">
          <button type="button" className="adm-btn" onClick={close}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-dark" onClick={create} disabled={saving}>
            {saving ? 'Creando…' : 'Crear y continuar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build `Productos.jsx`** — the "Información general" tab only in this task (Modelos/Medidas/Precios tabs are Tasks 5-7; images are Task 4). Use nested routing so the sidebar's Modelos/Medidas/Precios NavLinks (Task 1) actually land on distinguishable tab state, matching the mockup's tabbar visually while using real routes for deep-linkability (documented deviation: the mockup's tabs are plain-JS-toggled with no URL change; this plan uses `react-router-dom` nested routes instead so the sidebar shortcuts work and the tab state survives a refresh — same visual tabbar, same click behavior, no layout/flow difference a user would notice).

```jsx
// src/admin/catalogo/Productos.jsx
import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NuevoProductoDrawer from './NuevoProductoDrawer'

const ORIENTACION_SLUGS = ['escuadras-l', 'chaise-lounge']

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TAB_PATHS = [
  { key: 'general', path: '/admin/productos', label: 'Información general' },
  { key: 'modelos', path: '/admin/productos/modelos', label: 'Modelos' },
  { key: 'medidas', path: '/admin/productos/medidas', label: 'Medidas por modelo' },
  { key: 'precios', path: '/admin/productos/precios', label: 'Precios' },
]

function Tabbar() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div className="adm-tabbar">
      {TAB_PATHS.map(t => (
        <button
          key={t.key}
          type="button"
          className={`adm-tab ${location.pathname === t.path ? 'adm-active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function InformacionGeneral({ productos, categorias, selectedId, onSelectProducto, onProductoSaved }) {
  const producto = productos.find(p => p.id === selectedId) ?? null

  const [form, setForm] = useState({ nombre: '', categoria_id: '', orden: 0, descripcion: '', activo: true })
  const [specs, setSpecs] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!producto) return
    setForm({
      nombre: producto.nombre ?? '',
      categoria_id: producto.categoria_id ?? '',
      orden: producto.orden ?? 0,
      descripcion: producto.descripcion ?? '',
      activo: producto.activo ?? true,
    })
    async function loadDetail() {
      const [specsRes, orientRes] = await Promise.all([
        supabase.from('producto_specs').select('*').eq('producto_id', producto.id).order('orden'),
        supabase.from('producto_orientaciones').select('*').eq('producto_id', producto.id).order('orden'),
      ])
      setSpecs((specsRes.data ?? []).map(s => ({ id: s.id, titulo: s.titulo, contenido: typeof s.contenido === 'string' ? s.contenido : '' })))
      setOrientaciones((orientRes.data ?? []).map(o => ({ id: o.id, nombre: o.nombre })))
    }
    loadDetail()
  }, [producto?.id])

  if (!producto) {
    return <div className="adm-content"><div className="adm-empty-note">Selecciona o crea un producto para editar su información.</div></div>
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const categoriaActual = categorias.find(c => c.id === form.categoria_id)
  const needsOrientaciones = ORIENTACION_SLUGS.includes(categoriaActual?.slug)

  const addSpec = () => setSpecs(s => [...s, { id: null, titulo: '', contenido: '' }])
  const setSpecField = (i, k, v) => setSpecs(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeSpec = (i) => setSpecs(s => s.filter((_, idx) => idx !== i))

  const addOrientacion = () => setOrientaciones(o => [...o, { id: null, nombre: '' }])
  const setOrientacionField = (i, v) => setOrientaciones(o => o.map((x, idx) => idx === i ? { ...x, nombre: v } : x))
  const removeOrientacion = (i) => setOrientaciones(o => o.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      await supabase.from('productos').update({
        nombre: form.nombre,
        categoria_id: form.categoria_id || null,
        orden: parseInt(form.orden) || 0,
        descripcion: form.descripcion,
        activo: form.activo,
      }).eq('id', producto.id)

      await supabase.from('producto_specs').delete().eq('producto_id', producto.id)
      const validSpecs = specs.filter(s => s.titulo.trim())
      if (validSpecs.length > 0) {
        await supabase.from('producto_specs').insert(
          validSpecs.map((s, i) => ({ producto_id: producto.id, titulo: s.titulo, tipo: 'texto', contenido: s.contenido, orden: i }))
        )
      }

      await supabase.from('producto_orientaciones').delete().eq('producto_id', producto.id)
      const validOrient = orientaciones.filter(o => o.nombre.trim())
      if (validOrient.length > 0) {
        await supabase.from('producto_orientaciones').insert(
          validOrient.map((o, i) => ({ producto_id: producto.id, nombre: o.nombre, orden: i }))
        )
      }

      onProductoSaved()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-empty-note" style={{ marginBottom: 16 }}>
        Editando: <b style={{ color: '#111827' }}>{producto.nombre} · {categoriaActual?.nombre ?? '—'}</b>
        &nbsp;·&nbsp;
        <select
          className="adm-select"
          style={{ minWidth: 'auto', fontSize: 12.5, padding: '2px 6px', border: 'none', color: '#2563EB', background: 'none' }}
          value={producto.id}
          onChange={e => onSelectProducto(e.target.value)}
        >
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>)}
        </select>
      </div>

      <div className="adm-grid-2">
        <div>
          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 16 }}>Datos del producto</div>
            <div className="adm-field">
              <label className="adm-label">Nombre del modelo</label>
              <input className="adm-input" style={{ width: '100%' }} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label className="adm-label">Tipo (categoría)</label>
                <select className="adm-select" style={{ width: '100%' }} value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Orden de aparición</label>
                <input className="adm-input" type="number" style={{ width: '100%' }} value={form.orden} onChange={e => set('orden', e.target.value)} />
              </div>
            </div>
            <div className="adm-field">
              <label className="adm-label">Descripción</label>
              <textarea className="adm-textarea" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div className="adm-toggle-row">
              <div>
                <div className="adm-toggle-label">Producto activo</div>
                <div className="adm-toggle-desc">Visible en Colecciones y en el configurador</div>
              </div>
              <button type="button" className={`adm-switch ${form.activo ? '' : 'adm-off'}`} onClick={() => set('activo', !form.activo)} />
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 4 }}>Especificaciones técnicas</div>
            <div className="adm-card-sub">Ficha técnica libre — aparece en el configurador si se agrega.</div>
            <table className="adm-table">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i}>
                    <td style={{ width: '40%' }}>
                      <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Estructura" value={s.titulo} onChange={e => setSpecField(i, 'titulo', e.target.value)} />
                    </td>
                    <td>
                      <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Madera de pino tratada" value={s.contenido} onChange={e => setSpecField(i, 'contenido', e.target.value)} />
                    </td>
                    <td className="adm-cell-actions">
                      <button type="button" className="adm-icon-btn" onClick={() => removeSpec(i)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="adm-btn-sm" style={{ marginTop: 14 }} onClick={addSpec}>+ Agregar especificación</button>
          </div>
        </div>

        <div>
          {needsOrientaciones && (
            <div className="adm-card">
              <div className="adm-card-title" style={{ marginBottom: 4 }}>Orientaciones</div>
              <div className="adm-card-sub">Aplica a Escuadra y Chaise Lounge (izquierda/derecha). Orientación no afecta precio.</div>
              <table className="adm-table">
                <tbody>
                  {orientaciones.map((o, i) => (
                    <tr key={i}>
                      <td><input className="adm-input" style={{ width: '100%' }} value={o.nombre} onChange={e => setOrientacionField(i, e.target.value)} /></td>
                      <td className="adm-cell-actions">
                        <button type="button" className="adm-icon-btn" onClick={() => removeOrientacion(i)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="adm-btn-sm" style={{ marginTop: 14 }} onClick={addOrientacion}>+ Agregar orientación</button>
              <div className="adm-form-hint" style={{ marginTop: 10 }}>Solo aparece este campo si el Tipo del producto es Escuadra o Chaise Lounge.</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*').order('orden'),
      supabase.from('categorias').select('*').eq('activo', true).order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
    if (!selectedId && (p.data ?? []).length > 0) setSelectedId(p.data[0].id)
  }

  useEffect(() => { load() }, [])

  const handleCreated = (nuevo) => {
    setDrawerOpen(false)
    setSelectedId(nuevo.id)
    load()
    navigate('/admin/productos')
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Productos</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Productos</b></div>
        </div>
        <div className="adm-topbar-actions">
          <button type="button" className="adm-btn adm-btn-dark" onClick={() => setDrawerOpen(true)}>+ Nuevo producto</button>
        </div>
      </div>

      <Tabbar />

      <Routes>
        <Route
          index
          element={
            <InformacionGeneral
              productos={productos}
              categorias={categorias}
              selectedId={selectedId}
              onSelectProducto={setSelectedId}
              onProductoSaved={load}
            />
          }
        />
        <Route path="modelos" element={<div className="adm-content">Modelos — pendiente (Task 5)</div>} />
        <Route path="medidas" element={<div className="adm-content">Medidas — pendiente (Task 6)</div>} />
        <Route path="precios" element={<div className="adm-content">Precios — pendiente (Task 7)</div>} />
      </Routes>

      <NuevoProductoDrawer
        open={drawerOpen}
        categorias={categorias}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `/admin/productos`. Confirm the 4 real productos load, the first one auto-selected. Switch producto via the "Cambiar producto" dropdown, confirm its specs/orientaciones load correctly. Confirm the Orientaciones card ONLY appears for productos whose categoria slug is `escuadras-l` or `chaise-lounge` (test: "Cubo" is in `escuadras-l` → card shows; "Luna"/"Odisey"/"Cubo 20" are in `sofas`/`camas` → card hidden). Add a spec row, save, reload the page, confirm it persisted with `tipo: 'texto'` (verify directly via a read-only Supabase query — the `tipo` column must contain the literal string `'texto'`, never `'text'`). Click "+ Nuevo producto", fill the drawer, submit, confirm it creates the row and switches you into editing it. Click the sidebar's "Modelos"/"Medidas"/"Precios" — confirm the tabbar highlights the right tab and shows its placeholder text.

- [ ] **Step 3: Commit**

```bash
git add src/admin/catalogo/Productos.jsx src/admin/catalogo/NuevoProductoDrawer.jsx
git commit -m "feat: add productos informacion general tab, specs, orientaciones, and nuevo producto drawer"
```

---

### Task 4: Productos — Images (imagen principal + galería) with `productos` bucket auto-creation

**Files:**
- Create: `src/admin/catalogo/ProductoImageUpload.jsx`
- Modify: `src/admin/catalogo/Productos.jsx`

**Behavioral requirement from the task brief: "Preview de imagen antes de guardar"** — this means a two-phase flow (stage the file locally with a blob preview when picked, upload to Storage only when the surrounding form's "Guardar cambios" is clicked), NOT immediate upload-on-select. This mirrors the exact pattern the old, now-unused `ImageUpload.jsx` already proved out (`pending` array + `uploadAll()` called from the parent's save). Do not upload anything until the user explicitly saves.

- [ ] **Step 1: Create the bucket-aware upload helper + two presentational (stage-only) picker components**

```jsx
// src/admin/catalogo/ProductoImageUpload.jsx
import { useRef } from 'react'
import { supabase } from '../../lib/supabase'

const BUCKET = 'productos'
let bucketEnsured = false

async function ensureBucket() {
  if (bucketEnsured) return
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets ?? []).some(b => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
  bucketEnsured = true
}

export async function uploadProductoImage(file, path) {
  await ensureBucket()
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Isometric image: shows the saved image, or a local blob preview of a pending
// (not-yet-uploaded) file. Never uploads by itself — the parent's save() does.
export function IsometricoPicker({ currentUrl, pendingFile, pendingPreviewUrl, onFileSelected }) {
  const inputRef = useRef()
  const displayUrl = pendingPreviewUrl || currentUrl

  return (
    <div>
      <div
        className="adm-img-thumb"
        style={{ height: 200, marginBottom: 10, background: displayUrl ? `url(${displayUrl})` : 'linear-gradient(135deg,#D4C4B0,#E8DCC4)' }}
      >
        <button type="button" className="adm-icon-btn" onClick={() => inputRef.current.click()}>✎</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFileSelected(f) }} />
      <div className="adm-form-hint">
        {pendingFile ? `${pendingFile.name} — se subirá al guardar` : 'Recomendado 1200×1200px, fondo neutro.'}
      </div>
    </div>
  )
}

// Gallery: existing (already-saved) images can be deleted immediately (removing
// a saved image doesn't need a "preview before save" gate — only NEW uploads do).
// Newly-picked files are staged as pendingImages and shown with a "Pendiente" tag
// until the parent's save() uploads them.
export function GaleriaPicker({ existingImages, pendingImages, onFilesAdded, onRemovePending, onRemoveExisting }) {
  const inputRef = useRef()

  return (
    <div className="adm-img-grid">
      {existingImages.map(img => (
        <div key={img.id} className="adm-img-thumb" style={{ background: `url(${img.url})` }}>
          {img.es_principal && <span className="adm-principal-tag">Principal</span>}
          <button type="button" className="adm-icon-btn" onClick={() => onRemoveExisting(img)}>🗑</button>
        </div>
      ))}
      {pendingImages.map(item => (
        <div key={item.localId} className="adm-img-thumb" style={{ background: `url(${item.previewUrl})`, opacity: 0.75 }}>
          <span className="adm-principal-tag" style={{ background: '#6B7280' }}>Pendiente</span>
          <button type="button" className="adm-icon-btn" onClick={() => onRemovePending(item.localId)}>🗑</button>
        </div>
      ))}
      <div className="adm-img-drop" onClick={() => inputRef.current.click()}>+ Subir</div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) onFilesAdded(files) }} />
    </div>
  )
}
```

`ensureBucket()` is the ONE authorized infra operation in this whole task — a plain Storage-client call, no SQL, no migration, checked-then-created only once per session (`bucketEnsured` module-level flag avoids a redundant `listBuckets` call on every upload). It only actually runs when `save()` uploads something, never on mere file selection.

- [ ] **Step 2: Wire staging state + deferred upload into `InformacionGeneral` in `Productos.jsx`**

Add the import:

```jsx
import { IsometricoPicker, GaleriaPicker, uploadProductoImage } from './ProductoImageUpload'
```

Add `imagenes` (existing, saved images) state plus pending-upload staging state inside `InformacionGeneral`. Reset all pending state whenever the selected producto changes, so switching producto never carries over another producto's unsaved picks:

```jsx
  const [imagenes, setImagenes] = useState([])
  const [isoFile, setIsoFile] = useState(null)
  const [isoPreview, setIsoPreview] = useState(null)
  const [pendingImages, setPendingImages] = useState([])
```

Extend the existing `useEffect(() => { ... }, [producto?.id])` (the one already loading specs/orientaciones from Task 3) to also load images and reset all pending state:

```jsx
  useEffect(() => {
    if (!producto) return
    setIsoFile(null)
    setIsoPreview(null)
    setPendingImages([])
    // ...(existing form/specs/orientaciones setup from Task 3 stays as-is; add:)
    async function loadImages() {
      const { data } = await supabase.from('producto_imagenes').select('*').eq('producto_id', producto.id).order('orden')
      setImagenes(data ?? [])
    }
    loadImages()
  }, [producto?.id])

  const reloadImagenes = async () => {
    const { data } = await supabase.from('producto_imagenes').select('*').eq('producto_id', producto.id).order('orden')
    setImagenes(data ?? [])
  }

  const onIsoSelected = (file) => { setIsoFile(file); setIsoPreview(URL.createObjectURL(file)) }

  const onFilesAdded = (files) => {
    const items = files.map(file => ({ localId: Math.random().toString(36).slice(2), file, previewUrl: URL.createObjectURL(file) }))
    setPendingImages(prev => [...prev, ...items])
  }
  const onRemovePending = (localId) => setPendingImages(prev => prev.filter(p => p.localId !== localId))
  const onRemoveExisting = async (img) => {
    await supabase.from('producto_imagenes').delete().eq('id', img.id)
    reloadImagenes()
  }
```

Extend the existing `save()` function (from Task 3) to upload the staged isometric file and staged gallery images AFTER the base producto fields are saved, and BEFORE the specs/orientaciones re-sync:

```jsx
  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      await supabase.from('productos').update({
        nombre: form.nombre,
        categoria_id: form.categoria_id || null,
        orden: parseInt(form.orden) || 0,
        descripcion: form.descripcion,
        activo: form.activo,
      }).eq('id', producto.id)

      if (isoFile) {
        const ext = isoFile.name.split('.').pop().toLowerCase()
        const url = await uploadProductoImage(isoFile, `productos/iso-${producto.id}-${Date.now()}.${ext}`)
        await supabase.from('productos').update({ isometrico_url: url }).eq('id', producto.id)
        setIsoFile(null)
        setIsoPreview(null)
      }

      if (pendingImages.length > 0) {
        const startOrden = imagenes.length
        for (let i = 0; i < pendingImages.length; i++) {
          const item = pendingImages[i]
          const ext = item.file.name.split('.').pop().toLowerCase()
          const path = `productos/${producto.id}/${Date.now()}-${i}.${ext}`
          const url = await uploadProductoImage(item.file, path)
          await supabase.from('producto_imagenes').insert({
            producto_id: producto.id,
            url,
            alt: item.file.name.replace(/\.[^.]+$/, ''),
            orden: startOrden + i,
            es_principal: imagenes.length === 0 && i === 0,
          })
        }
        setPendingImages([])
        await reloadImagenes()
      }

      // ...(existing producto_specs delete+insert and producto_orientaciones delete+insert from Task 3 stay exactly as-is here, unchanged)...

      onProductoSaved()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }
```

Insert two new cards in the RIGHT column of `InformacionGeneral`'s `.adm-grid-2`, before the (conditional) Orientaciones card:

```jsx
          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 4 }}>Imagen principal</div>
            <div className="adm-card-sub">Se usa en tarjetas de Colecciones y carousel del configurador.</div>
            <IsometricoPicker
              currentUrl={producto.isometrico_url}
              pendingFile={isoFile}
              pendingPreviewUrl={isoPreview}
              onFileSelected={onIsoSelected}
            />
          </div>

          <div className="adm-card">
            <div className="adm-card-header">
              <div className="adm-card-title">Galería de imágenes</div>
            </div>
            <div className="adm-card-sub">Aparecen como thumbnails debajo del carousel. Se suben al guardar.</div>
            <GaleriaPicker
              existingImages={imagenes}
              pendingImages={pendingImages}
              onFilesAdded={onFilesAdded}
              onRemovePending={onRemovePending}
              onRemoveExisting={onRemoveExisting}
            />
          </div>
```

- [ ] **Step 3: Verify in browser**

Confirm the `productos` bucket doesn't exist yet (read-only check via a Supabase query against `storage.buckets`). Pick an isometric image for a producto — confirm a local blob preview appears immediately WITHOUT any network upload yet (check the Storage bucket still doesn't exist / still has no new file at this point), and the hint text reads "…— se subirá al guardar". Click "Guardar cambios" — confirm the bucket now gets created, the file uploads, `productos.isometrico_url` updates, and the preview switches from the local blob to the real public URL. Repeat for 2-3 gallery images: pick them (see "Pendiente" tags, no upload yet), click Guardar, confirm they upload, the first-ever one is marked "Principal", and `producto_imagenes` rows exist with correct `producto_id`/`orden`. Delete one EXISTING (already-saved) gallery image — confirm this one removes immediately without needing a separate Guardar click (per the plan's own distinction between staged-new vs. saved-existing). Refresh the page — confirm everything persists and no stray pending state leaks across a producto switch (switch producto mid-staging, without saving, and confirm the pending picks are dropped, not silently applied to the wrong producto).

- [ ] **Step 4: Commit**

```bash
git add src/admin/catalogo/ProductoImageUpload.jsx src/admin/catalogo/Productos.jsx
git commit -m "feat: add producto image upload (principal + galeria) with productos bucket auto-creation"
```

---

### Task 5: Modelos tab (global productos list)

**Files:**
- Modify: `src/admin/catalogo/Productos.jsx`

- [ ] **Step 1: Replace the `modelos` route's placeholder with a real global list**

Add a `Modelos` component above `Productos` in the same file:

```jsx
function Modelos({ productos, categorias, configCounts, imageCounts, onEdit }) {
  const navigate = useNavigate()
  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <div className="adm-card-title">Todos los modelos</div>
            <div className="adm-card-sub">Un modelo puede repetirse en distinto tipo (ej. Cubo en Sofás y en Escuadra).</div>
          </div>
        </div>
        <table className="adm-table">
          <thead>
            <tr><th></th><th>Modelo</th><th>Tipo</th><th># Medidas</th><th># Imágenes</th><th>Activo</th><th></th></tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><td colSpan={7} className="adm-empty-note">No hay modelos aún</td></tr>
            ) : productos.map(p => (
              <tr key={p.id}>
                <td className="adm-drag">⠿</td>
                <td>{p.nombre}</td>
                <td>{categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</td>
                <td>{configCounts[p.id] ?? 0}</td>
                <td>{imageCounts[p.id] ?? 0}</td>
                <td>{p.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸ inactivo</span>}</td>
                <td className="adm-cell-actions">
                  <button type="button" className="adm-icon-btn" onClick={() => onEdit(p.id)}>✎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

In `Productos`, add state/loading for the two counts and pass everything through:

```jsx
  const [configCounts, setConfigCounts] = useState({})
  const [imageCounts, setImageCounts] = useState({})

  useEffect(() => {
    async function loadCounts() {
      const [cfgRes, imgRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('producto_id'),
        supabase.from('producto_imagenes').select('producto_id'),
      ])
      const cfgMap = {}
      ;(cfgRes.data ?? []).forEach(r => { cfgMap[r.producto_id] = (cfgMap[r.producto_id] ?? 0) + 1 })
      setConfigCounts(cfgMap)
      const imgMap = {}
      ;(imgRes.data ?? []).forEach(r => { imgMap[r.producto_id] = (imgMap[r.producto_id] ?? 0) + 1 })
      setImageCounts(imgMap)
    }
    loadCounts()
  }, [productos])
```

Replace the `modelos` route:

```jsx
        <Route
          path="modelos"
          element={
            <Modelos
              productos={productos}
              categorias={categorias}
              configCounts={configCounts}
              imageCounts={imageCounts}
              onEdit={(id) => { setSelectedId(id); navigate('/admin/productos') }}
            />
          }
        />
```

The mockup's "+ Nuevo modelo" button on this tab opens the same drawer as the topbar's "+ Nuevo producto" — no new button needed here since the topbar button (already built in Task 3) is visible on every tab of this page, including this one (the `<div className="adm-topbar">` sits above the `<Tabbar />` and `<Routes>`, outside the tab-specific content).

- [ ] **Step 2: Verify in browser**

Open `/admin/productos/modelos`. Confirm all 4 productos list with correct categoría names, correct `# Medidas` (matches actual `producto_configuraciones` row counts — e.g. "Cubo" shows 2), correct `# Imágenes` (0 until Task 4's uploads are tested, then matches). Click ✎ on a row — confirm it navigates to `/admin/productos` with that producto selected in "Información general".

- [ ] **Step 3: Commit**

```bash
git add src/admin/catalogo/Productos.jsx
git commit -m "feat: add modelos tab (global productos list) to admin catalogo"
```

---

### Task 6: Medidas tab (producto_configuraciones CRUD + incompleto indicator)

**Files:**
- Modify: `src/admin/catalogo/Productos.jsx`
- Create: `src/admin/catalogo/MedidaModal.jsx`

- [ ] **Step 1: Build the "nueva medida" modal**

```jsx
// src/admin/catalogo/MedidaModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadProductoImage } from './ProductoImageUpload'

export default function MedidaModal({ open, producto, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [dimensiones, setDimensiones] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => { setNombre(''); setDimensiones(''); setFile(null) }
  const close = () => { reset(); onClose() }

  const create = async () => {
    if (!nombre.trim()) return alert('La etiqueta es obligatoria.')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('producto_configuraciones').insert({
        producto_id: producto.id,
        nombre,
        dimensiones,
        activo: true,
        orden: 999,
      }).select().single()
      if (error) throw error

      if (file) {
        const ext = file.name.split('.').pop().toLowerCase()
        const url = await uploadProductoImage(file, `productos/${producto.id}/medida-${data.id}.${ext}`)
        await supabase.from('producto_configuraciones').update({ isometrico_url: url }).eq('id', data.id)
      }

      reset()
      onCreated()
    } catch (err) {
      alert(`Error al crear medida: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-modal-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="adm-modal-box">
        <div className="adm-modal-header">
          <div className="adm-modal-title">Nueva medida</div>
          <button type="button" className="adm-drawer-close" onClick={close}>✕</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-empty-note" style={{ marginBottom: 14, padding: 0 }}>Para: <b style={{ color: '#111827' }}>{producto.nombre}</b></div>
          <div className="adm-field">
            <label className="adm-label">Etiqueta</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. 220cm" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Dimensiones</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. 220 × 95 × 85 cm" value={dimensiones} onChange={e => setDimensiones(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Imagen isométrica</label>
            <div className="adm-img-drop" onClick={() => document.getElementById('medida-file-input').click()}>
              {file ? file.name : '+ Subir imagen'}
            </div>
            <input id="medida-file-input" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0] ?? null)} />
            <div className="adm-form-hint">Puedes subirla después — mientras tanto se muestra un placeholder en el configurador.</div>
          </div>
          <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 14, marginBottom: 0, padding: '12px 14px' }}>
            <div className="adm-form-hint" style={{ color: '#6B7280' }}>💲 Después de crearla, ve a la pestaña <b>Precios</b> para capturar su valor en los 4 grados de tela.</div>
          </div>
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-dark" onClick={create} disabled={saving}>
            {saving ? 'Creando…' : 'Crear medida'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build the `Medidas` tab component in `Productos.jsx`**

```jsx
import MedidaModal from './MedidaModal'

function Medidas({ productos, categorias, selectedId, onSelectProducto }) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [preciosSet, setPreciosSet] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const producto = productos.find(p => p.id === selectedId) ?? null

  const load = async () => {
    if (!producto) { setConfiguraciones([]); setPreciosSet({}); return }
    const [cfgRes, precRes] = await Promise.all([
      supabase.from('producto_configuraciones').select('*').eq('producto_id', producto.id).order('orden'),
      supabase.from('producto_precios').select('configuracion_id, grado').eq('producto_id', producto.id),
    ])
    setConfiguraciones(cfgRes.data ?? [])
    const set = {}
    ;(precRes.data ?? []).forEach(r => {
      if (!set[r.configuracion_id]) set[r.configuracion_id] = new Set()
      set[r.configuracion_id].add(r.grado)
    })
    setPreciosSet(set)
  }

  useEffect(() => { load() }, [producto?.id])

  const toggleActivo = async (cfg) => {
    await supabase.from('producto_configuraciones').update({ activo: !cfg.activo }).eq('id', cfg.id)
    load()
  }

  const updateField = async (id, field, value) => {
    await supabase.from('producto_configuraciones').update({ [field]: value }).eq('id', id)
    load()
  }

  const isIncompleto = (cfg) => (preciosSet[cfg.id]?.size ?? 0) < 4

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => onSelectProducto(e.target.value)}>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>
          ))}
        </select>
      </div>

      {producto && (
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Medidas de: {producto.nombre} · {categorias.find(c => c.id === producto.categoria_id)?.nombre ?? '—'}</div>
              <div className="adm-card-sub">Cada medida puede tener su propia imagen isométrica.</div>
            </div>
            <button type="button" className="adm-btn-sm adm-dark" onClick={() => setModalOpen(true)}>+ Agregar medida</button>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Etiqueta</th><th>Dimensiones</th><th>Isométrico</th><th>Activo</th><th></th></tr>
            </thead>
            <tbody>
              {configuraciones.length === 0 ? (
                <tr><td colSpan={6} className="adm-empty-note">No hay medidas aún</td></tr>
              ) : configuraciones.map(cfg => (
                <tr key={cfg.id}>
                  <td className="adm-drag">⠿</td>
                  <td>
                    <input className="adm-input" defaultValue={cfg.nombre}
                      onBlur={e => { if (e.target.value !== cfg.nombre) updateField(cfg.id, 'nombre', e.target.value) }} />
                    {isIncompleto(cfg) && (
                      <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>⚠ incompleto — falta precio en algún grado</div>
                    )}
                  </td>
                  <td>
                    <input className="adm-input" defaultValue={cfg.dimensiones ?? ''}
                      onBlur={e => { if (e.target.value !== (cfg.dimensiones ?? '')) updateField(cfg.id, 'dimensiones', e.target.value) }} />
                  </td>
                  <td>
                    <div className="adm-img-thumb" style={{ width: 56, height: 44, background: cfg.isometrico_url ? `url(${cfg.isometrico_url})` : '#F3F4F6' }} />
                  </td>
                  <td>{cfg.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(cfg)}>{cfg.activo ? '⏸' : '▶'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MedidaModal open={modalOpen} producto={producto} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); load() }} />
    </div>
  )
}
```

Wire the route:

```jsx
        <Route
          path="medidas"
          element={<Medidas productos={productos} categorias={categorias} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
```

- [ ] **Step 3: Verify in browser**

Open `/admin/productos/medidas`. Select "Cubo" — confirm its 2 medidas show ("1 Plaza", "1.5 Plazas"), both marked "⚠ incompleto" (since real `producto_precios` data for Cubo currently has all 4 grados populated per the confirmed seed data from the configurador task — re-verify this against live data since it may have changed; if a medida DOES have all 4 grados priced, it should NOT show the incompleto warning — test both states if possible by temporarily noting current real data first). Add a new medida via the modal (with and without an image), confirm it appears, confirm it starts flagged "incompleto" (no prices yet). Rename a medida inline (blur to save), confirm persistence on reload.

- [ ] **Step 4: Commit**

```bash
git add src/admin/catalogo/Productos.jsx src/admin/catalogo/MedidaModal.jsx
git commit -m "feat: add medidas tab with incompleto indicator to admin catalogo"
```

---

### Task 7: Precios tab (matriz medidas × grados)

**Files:**
- Modify: `src/admin/catalogo/Productos.jsx`

- [ ] **Step 1: Build the `Precios` tab component**

```jsx
function PriceCell({ initialValue, onSave }) {
  const [val, setVal] = useState(initialValue)
  useEffect(() => { setVal(initialValue) }, [initialValue])
  return (
    <input
      className="adm-input"
      style={{ width: 100, textAlign: 'right' }}
      value={val}
      onChange={e => setVal(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={() => onSave(val)}
      placeholder="—"
    />
  )
}

const GRADOS = ['AA', 'A', 'B', 'C']

function Precios({ productos, categorias, selectedId, onSelectProducto }) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [matrix, setMatrix] = useState({})
  const producto = productos.find(p => p.id === selectedId) ?? null

  const load = async () => {
    if (!producto) { setConfiguraciones([]); setMatrix({}); return }
    const [cfgRes, precRes] = await Promise.all([
      supabase.from('producto_configuraciones').select('*').eq('producto_id', producto.id).eq('activo', true).order('orden'),
      supabase.from('producto_precios').select('configuracion_id, grado, precio').eq('producto_id', producto.id),
    ])
    setConfiguraciones(cfgRes.data ?? [])
    const m = {}
    ;(precRes.data ?? []).forEach(r => {
      if (!m[r.configuracion_id]) m[r.configuracion_id] = {}
      m[r.configuracion_id][r.grado] = String(r.precio)
    })
    setMatrix(m)
  }

  useEffect(() => { load() }, [producto?.id])

  const saveCell = async (configuracionId, grado, value) => {
    try {
      const trimmed = value.trim()
      if (trimmed === '') {
        await supabase.from('producto_precios').delete()
          .eq('producto_id', producto.id).eq('configuracion_id', configuracionId).eq('grado', grado)
      } else {
        const precio = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
        if (isNaN(precio)) return
        await supabase.from('producto_precios').upsert(
          { producto_id: producto.id, configuracion_id: configuracionId, grado, precio },
          { onConflict: 'producto_id,configuracion_id,grado' }
        )
      }
      load()
    } catch (err) {
      alert(`Error al guardar precio: ${err.message}`)
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => onSelectProducto(e.target.value)}>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>
          ))}
        </select>
      </div>

      {producto && (
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Matriz de precios: {producto.nombre} · {categorias.find(c => c.id === producto.categoria_id)?.nombre ?? '—'}</div>
              <div className="adm-card-sub">Precio mayoreo MXN, IVA incluido. Un valor por Medida × Grado de tela. Guarda al salir de cada celda.</div>
            </div>
          </div>
          {configuraciones.length === 0 ? (
            <div className="adm-empty-note">Este producto no tiene medidas activas — agrégalas en la pestaña Medidas.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Medida</th>{GRADOS.map(g => <th key={g}>Grado {g}</th>)}</tr>
              </thead>
              <tbody>
                {configuraciones.map(cfg => (
                  <tr key={cfg.id}>
                    <td>{cfg.nombre}</td>
                    {GRADOS.map(g => (
                      <td key={g}>
                        <PriceCell
                          initialValue={matrix[cfg.id]?.[g] ?? ''}
                          onSave={val => saveCell(cfg.id, g, val)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
```

Wire the route:

```jsx
        <Route
          path="precios"
          element={<Precios productos={productos} categorias={categorias} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
```

- [ ] **Step 2: Verify in browser**

Open `/admin/productos/precios`. Select "Cubo" — confirm the matrix shows "1 Plaza"/"1.5 Plazas" as rows and AA/A/B/C as columns, pre-filled with the real current prices (cross-check one cell directly against a live Supabase query). Edit a cell, blur, confirm it upserts (re-query to confirm the new value persisted). Clear a cell entirely (empty string) and blur — confirm the row is DELETED from `producto_precios` (not set to 0) and the cell displays as empty (placeholder `—`, not `0`) on next load. Switch to a producto with an "incompleto" medida from Task 6 — confirm the missing grado's cell is genuinely empty here too, consistent with the Medidas tab's warning.

- [ ] **Step 3: Commit**

```bash
git add src/admin/catalogo/Productos.jsx
git commit -m "feat: add precios matrix tab to admin catalogo"
```

---

### Task 8: Full regression pass + final report

**Files:** none (verification only)

- [ ] **Step 1: Walk the full success criterion end to end**

Per the original task brief: "JL puede, sin tocar SQL: crear una categoría nueva, crear un producto con imágenes, darle medidas, llenar su matriz de precios completa... y ver todo reflejado en el configurador al recargar." Do this exact walkthrough with a disposable test categoría/producto (deactivate/clean up afterward, don't leave test junk activo:true), then confirm the new producto/medida/prices actually show up correctly in the real `/configurador` page (the one built in the prior plan) after a reload — this is the one cross-feature check this task's own admin can't self-verify, and it's exactly the stated success criterion.

- [ ] **Step 2: Restriction compliance audit**

- `git diff --stat master...HEAD` from the worktree — confirm the full file list matches exactly what this plan created/modified (all under `src/admin/catalogo/` plus the one `src/App.jsx` edit). Confirm `src/admin/AdminLayout.jsx`, `AdminDashboard.jsx`, `AdminProducts.jsx`, `AdminTelas.jsx`, `AdminTextiles.jsx`, `ImageUpload.jsx` are untouched (0 diff) — they were deliberately left alone, not deleted.
- Grep the whole `src/admin/catalogo/` tree for `gold`, `serif`, `charcoal`, `var(--` — must return nothing.
- Confirm zero SQL/migration was run — every Supabase call across all 7 tasks is `.select()`/`.insert()`/`.update()`/`.delete()`/`.upsert()` against existing tables, plus exactly one `storage.createBucket()` call (guarded by an existence check) — no `CREATE TABLE`, no `ALTER TABLE`, no RLS policy change.
- Confirm the configurador page (`src/pages/Configurador.jsx` et al, from the separate `feature/configurador-supabase` branch/worktree) was never touched by this branch — this plan's worktree branches from `master`, not from that other feature branch, so this should be true by construction; verify anyway.

- [ ] **Step 3: Report to the user**

Produce the report format required by the task instructions:
1. Full list of files created/modified (`git diff --stat master...HEAD`).
2. URL where the admin catalog panel works (dev URL; note production URL once deployed).
3. Documented, already-adjudicated deviations/gaps (repeat clearly, don't re-litigate):
   - Categorías CRUD screen built using the mockup's established visual grammar since no exact mockup screen exists for it, plus one added sidebar nav entry.
   - Item 6 (Telas y categorías / Colecciones / Colores) intentionally NOT built — blocked on the `telas.grado` CHECK-constraint schema question, pending the user's decision with JL.
   - `/admin` still has no real auth guard — explicitly deferred to a future task.
   - Old admin files (`AdminLayout`, `AdminDashboard`, `AdminProducts`, `AdminTelas`, `AdminTextiles`, `ImageUpload`) left on disk, untouched, now fully unreferenced/orphaned — per explicit user decision to build fresh rather than restyle in place.
   - `AdminLeads`/`AdminDistribuidores` linked from the new CONFIGURACIÓN section as-is, still in the old Maison brand style — restyling them is out of scope for this task.
4. Confirm the `producto_specs.tipo` bug from the old, now-unused code (`'text'/'table'` vs. the DB's real `'texto'/'tabla'` constraint) was NOT repeated in the new implementation.
