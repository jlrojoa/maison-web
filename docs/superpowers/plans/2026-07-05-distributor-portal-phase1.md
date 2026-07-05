# Maison B2B Distributor Portal — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the distributor auth layer, price gating, and extended admin forms for Maison's B2B portal.

**Architecture:** A single `DistribuidorContext` wraps the entire app and holds the Supabase session + distribuidor row. ProductDetail and Colecciones read that context to decide whether to show real prices (fetched from RLS-protected `producto_precios`/`producto_config_precios`/`producto_grado_precios`) or "Precio a consultar". Admin pages are extended in-place following existing patterns.

**Tech Stack:** React 18, Supabase JS v2, React Router v7, Vite, no test framework (verify with `npm run build` and manual browser testing).

---

## ⚠️ Schema column-name assumptions

The Supabase schema is pre-created. Before running each task, verify these names match your actual table columns (use Supabase Table Editor):

| Table | Assumed columns |
|---|---|
| `producto_precios` | `id, producto_id, precio` |
| `producto_config_precios` | `id, configuracion_id, precio_extra` |
| `producto_grado_precios` | `id, producto_id, grado, precio_extra` |
| `producto_textiles` | `id, producto_id, textil_id` |
| `producto_orientaciones` | `id, producto_id, nombre, orden` |
| `distribuidores` | `id, email, nombre, empresa, telefono, activo, created_at` |
| `textiles` | existing + `grado` (values: `'AA'`,`'A'`,`'B'`,`'C'`) |
| `producto_configuraciones` | existing + `isometrico_url` |
| `productos` | existing + `isometrico_url` |

---

## File Map

**CREATE:**
- `src/contexts/DistribuidorContext.jsx` — auth provider + distribuidor verification
- `src/pages/Distribuidores.jsx` — login/signup page at `/distribuidores`
- `src/admin/AdminDistribuidores.jsx` — CRUD admin section for distribuidores table

**MODIFY:**
- `src/App.jsx` — wrap with `DistribuidorProvider`, add `/distribuidores` and `/admin/distribuidores` routes
- `src/components/Nav.jsx` — show "Mi cuenta" + logout when distribuidor session active
- `src/admin/AdminLayout.jsx` — add Distribuidores sidebar link
- `src/admin/AdminTextiles.jsx` — add `grado` select field
- `src/admin/AdminProducts.jsx` — major extension: price tables, grade prices, fabric assignment, orientations, isometric uploads
- `src/pages/Colecciones.jsx` — dynamic categories from DB + price gating
- `src/pages/ProductDetail.jsx` — price gating, live price calculation, grouped swatches + modal, orientations, isometric
- `src/index.css` — styles for login page, grado badge, orientation selector, new admin sections

---

## Task 1: DistribuidorContext

**Files:**
- Create: `src/contexts/DistribuidorContext.jsx`

- [ ] **Step 1: Create the context file**

```jsx
// src/contexts/DistribuidorContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function DistribuidorProvider({ children }) {
  const [session, setSession] = useState(null)
  const [distribuidor, setDistribuidor] = useState(null)
  const [loading, setLoading] = useState(true)

  async function checkDistribuidor(email) {
    if (!email) { setDistribuidor(null); return }
    const { data } = await supabase
      .from('distribuidores')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single()
    setDistribuidor(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkDistribuidor(session?.user?.email).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      checkDistribuidor(session?.user?.email)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = async (email, password) => {
    const { data: dist } = await supabase
      .from('distribuidores')
      .select('id')
      .eq('email', email)
      .eq('activo', true)
      .single()
    if (!dist) return { error: { message: 'Cuenta no autorizada. Contacta a Maison.' } }
    return supabase.auth.signUp({ email, password })
  }

  const signOut = async () => {
    setDistribuidor(null)
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ session, distribuidor, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useDistribuidor = () => useContext(Ctx)
```

- [ ] **Step 2: Verify build**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
```

Expected: build succeeds (file not yet used, no errors).

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/contexts/DistribuidorContext.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: add DistribuidorContext for auth + distribuidor verification"
```

---

## Task 2: Wire DistribuidorProvider into App + add routes

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update App.jsx**

Replace the full file content:

```jsx
// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { DistribuidorProvider } from './contexts/DistribuidorContext'
import Home from './pages/Home'
import Colecciones from './pages/Colecciones'
import ProductPage from './pages/ProductPage'
import Distribuidores from './pages/Distribuidores'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./admin/AdminProducts'))
const AdminTextiles = lazy(() => import('./admin/AdminTextiles'))
const AdminLeads = lazy(() => import('./admin/AdminLeads'))
const AdminDistribuidores = lazy(() => import('./admin/AdminDistribuidores'))

function AdminFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)', color: 'var(--taupe)', letterSpacing: '.2em', fontSize: 12 }}>
      CARGANDO PANEL…
    </div>
  )
}

export default function App() {
  return (
    <DistribuidorProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/colecciones" element={<Colecciones />} />
        <Route path="/producto/:slug" element={<ProductPage />} />
        <Route path="/distribuidores" element={<Distribuidores />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
          <Route path="productos" element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
          <Route path="textiles" element={<Suspense fallback={<AdminFallback />}><AdminTextiles /></Suspense>} />
          <Route path="leads" element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
          <Route path="distribuidores" element={<Suspense fallback={<AdminFallback />}><AdminDistribuidores /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DistribuidorProvider>
  )
}
```

Note: `ScrollToTop` is now inside `DistribuidorProvider` but outside `Routes` — it needs router context from `BrowserRouter` (in `main.jsx`) so this works fine.

- [ ] **Step 2: Verify build** (`npm run build` — will fail on missing `Distribuidores` and `AdminDistribuidores` imports, that's expected; fix by continuing to Task 3)

---

## Task 3: /distribuidores login/signup page

**Files:**
- Create: `src/pages/Distribuidores.jsx`

- [ ] **Step 1: Create the page**

```jsx
// src/pages/Distribuidores.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'

export default function Distribuidores() {
  const { distribuidor, loading, signIn, signUp } = useDistribuidor()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!loading && distribuidor) navigate('/', { replace: true })
  }, [loading, distribuidor, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) { setError(error.message); return }
        navigate('/')
      } else {
        const { error } = await signUp(email, password)
        if (error) { setError(error.message); return }
        setSuccess(true)
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--warm)' }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '100px 24px 64px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <p className="sl" style={{ marginBottom: 16 }}>Portal Distribuidores</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40, lineHeight: 1.15 }}>
            {mode === 'login' ? <>Iniciar <em>sesión</em></> : <>Crear <em>contraseña</em></>}
          </h1>

          {success ? (
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.8, background: '#fff', padding: '24px 28px', borderLeft: '3px solid var(--gold)' }}>
              Revisa tu correo para confirmar tu cuenta.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 6 }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="so"
                  style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 6 }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  className="so"
                  style={{ width: '100%', padding: '12px 16px', boxSizing: 'border-box' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: '#c0392b', margin: 0, lineHeight: 1.5 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="bcot"
                style={{ opacity: busy ? .6 : 1 }}
                disabled={busy}
              >
                {busy ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>

              <button
                type="button"
                onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.1em', color: 'var(--taupe)', cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
              >
                {mode === 'login' ? 'Primera vez — Crear contraseña' : 'Ya tengo cuenta — Iniciar sesión'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
```

Expected: Build still fails only on missing `AdminDistribuidores`. Everything else compiles.

---

## Task 4: AdminDistribuidores CRUD

**Files:**
- Create: `src/admin/AdminDistribuidores.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/admin/AdminDistribuidores.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { email: '', nombre: '', empresa: '', telefono: '', activo: true }

const TH = ({ children }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)', verticalAlign: 'middle', ...style }}>
    {children}
  </td>
)
const Label = ({ children }) => (
  <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
    {children}
  </label>
)

export default function AdminDistribuidores() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('distribuidores').select('*').order('created_at', { ascending: false })
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => { setForm(EMPTY); setEditing(null) }

  const save = async () => {
    if (!form.email.trim()) return alert('El correo es obligatorio.')
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('distribuidores').update(form).eq('id', editing)
      } else {
        await supabase.from('distribuidores').insert(form)
      }
      reset()
      load()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (r) => {
    await supabase.from('distribuidores').update({ activo: !r.activo }).eq('id', r.id)
    load()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este distribuidor?')) return
    await supabase.from('distribuidores').delete().eq('id', id)
    load()
  }

  const edit = (r) => {
    setEditing(r.id)
    setForm({ email: r.email ?? '', nombre: r.nombre ?? '', empresa: r.empresa ?? '', telefono: r.telefono ?? '', activo: r.activo ?? true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Distribuidores</h1>

      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>
          {editing ? 'Editar distribuidor' : 'Nuevo distribuidor'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Correo electrónico *</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="email"
              value={form.email} onChange={e => set('email', e.target.value)} disabled={!!editing} />
          </div>
          <div>
            <Label>Nombre</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <Label>Empresa</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.empresa} onChange={e => set('empresa', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input type="checkbox" id="dist-activo" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            <label htmlFor="dist-activo" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>Activo (puede iniciar sesión y ver precios)</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px', opacity: saving ? .6 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear distribuidor'}
          </button>
          {editing && (
            <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>Cancelar</button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><TH>Email</TH><TH>Nombre</TH><TH>Empresa</TH><TH>Teléfono</TH><TH>Activo</TH><TH></TH></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>No hay distribuidores aún</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <TD style={{ fontFamily: 'var(--sans)' }}>{r.email}</TD>
                <TD>{r.nombre ?? '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.empresa ?? '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.telefono ?? '—'}</TD>
                <TD>
                  <button
                    onClick={() => toggleActivo(r)}
                    style={{ background: r.activo ? 'var(--gold)' : 'var(--sand)', border: 'none', color: r.activo ? '#fff' : 'var(--taupe)', fontSize: 10, letterSpacing: '.1em', padding: '4px 12px', cursor: 'pointer' }}
                  >
                    {r.activo ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="la" onClick={() => edit(r)}>Editar</button>
                    <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }} onClick={() => del(r.id)}>Eliminar</button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/contexts/DistribuidorContext.jsx src/pages/Distribuidores.jsx src/admin/AdminDistribuidores.jsx src/App.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: auth foundation — DistribuidorContext, /distribuidores page, AdminDistribuidores CRUD"
```

---

## Task 5: AdminLayout — add Distribuidores sidebar link

**Files:**
- Modify: `src/admin/AdminLayout.jsx`

- [ ] **Step 1: Add the link**

In `AdminLayout.jsx`, change the `LINKS` array from:

```js
const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/textiles', label: 'Tejidos' },
  { to: '/admin/leads', label: 'Leads' },
]
```

to:

```js
const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/textiles', label: 'Tejidos' },
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/distribuidores', label: 'Distribuidores' },
]
```

- [ ] **Step 2: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminLayout.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: add Distribuidores to admin sidebar"
```

---

## Task 6: Nav — auth state (Mi cuenta + logout)

**Files:**
- Modify: `src/components/Nav.jsx`

- [ ] **Step 1: Update Nav.jsx**

Replace the full file:

```jsx
// src/components/Nav.jsx
import { useNavigate } from 'react-router-dom'
import { useScrollNav } from '../hooks/useScrollNav'
import { useDistribuidor } from '../contexts/DistribuidorContext'

export default function Nav() {
  const scrolled = useScrollNav(60)
  const navigate = useNavigate()
  const { distribuidor, signOut } = useDistribuidor() ?? {}

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav id="nav" className={scrolled ? 's' : ''}>
      <a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="logo">
        Maison<b>.</b>
      </a>
      <ul className="nav-ul">
        <li><a href="/colecciones" onClick={e => { e.preventDefault(); navigate('/colecciones') }}>Colecciones</a></li>
        <li><a href="#mt">Materiales</a></li>
        <li><a href="#kt">Showroom</a></li>
        <li><a href="#" onClick={e => e.preventDefault()}>Nosotros</a></li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {distribuidor ? (
          <>
            <a href="/distribuidores" onClick={e => { e.preventDefault(); navigate('/distribuidores') }}
              className="nbtn" style={{ background: 'transparent', borderColor: 'currentColor' }}>
              Mi cuenta
            </a>
            <button onClick={handleLogout}
              style={{ background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'inherit', cursor: 'pointer', opacity: .7 }}>
              Salir
            </button>
          </>
        ) : (
          <a href="#kt" className="nbtn">Kit de Muestras</a>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/components/Nav.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: nav shows Mi cuenta + logout for logged-in distributors"
```

---

## Task 7: AdminTextiles — add grado field

**Files:**
- Modify: `src/admin/AdminTextiles.jsx`

- [ ] **Step 1: Add grado to EMPTY state and form**

In `AdminTextiles.jsx`:

**Change** the `EMPTY` constant from:
```js
const EMPTY = { nombre: '', categoria: '', color_hex: '', imagen_url: '', descripcion: '', activo: true, orden: 0 }
```
to:
```js
const EMPTY = { nombre: '', categoria: '', grado: 'A', color_hex: '', imagen_url: '', descripcion: '', activo: true, orden: 0 }
```

**Change** the `edit` function's `setForm` call to include `grado`:
```js
setForm({ nombre: r.nombre ?? '', categoria: r.categoria ?? '', grado: r.grado ?? 'A', color_hex: r.color_hex ?? '', imagen_url: r.imagen_url ?? '', descripcion: r.descripcion ?? '', activo: r.activo ?? true, orden: r.orden ?? 0 })
```

**Add** a grado select field in the form grid, after the Categoría field:

```jsx
<div>
  <Label>Grado de tela</Label>
  <select className="so" style={{ width: '100%', padding: '10px 14px' }}
    value={form.grado} onChange={e => set('grado', e.target.value)}>
    <option value="AA">AA — Premium</option>
    <option value="A">A — Alto</option>
    <option value="B">B — Estándar</option>
    <option value="C">C — Económico</option>
  </select>
</div>
```

Place it in the 2-column grid right after the `Categoría` input div.

**Add** `grado` column to the list table: add `<TH>Grado</TH>` header and the corresponding `<TD>{r.grado ?? '—'}</TD>` cell.

- [ ] **Step 2: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminTextiles.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: add grado field (AA/A/B/C) to textiles admin form"
```

---

## Task 8: AdminProducts — price tables (producto_precios + producto_config_precios)

**Files:**
- Modify: `src/admin/AdminProducts.jsx`

This task restructures how prices are stored. Read the full current file carefully before editing.

- [ ] **Step 1: Update EMPTY_FORM**

Change:
```js
const EMPTY_FORM = {
  nombre: '', slug: '', subtitulo: '', descripcion: '',
  precio_desde: '', badge: '', categoria_id: '', activo: true, orden: 0,
}
```
to:
```js
const EMPTY_FORM = {
  nombre: '', slug: '', subtitulo: '', descripcion: '',
  precio_base: '', badge: '', categoria_id: '', activo: true, orden: 0,
  isometrico_url: '',
}
```

- [ ] **Step 2: Add precioBase state and update load/edit/reset**

Add a state variable for the base price (separate from form since it lives in a different table):

The `form.precio_base` field will hold the value typed in the UI. On save it writes to `producto_precios`. On edit it reads from `producto_precios`.

**In the `load` function**, keep it as is (the product list doesn't need to show prices from the new table for the admin list — or you can add it later).

**In the `edit` function**, after the existing queries, add a fetch for the product's price:

```js
const edit = async (p) => {
  setEditing(p.id)
  setForm({
    nombre: p.nombre ?? '',
    slug: p.slug ?? '',
    subtitulo: p.subtitulo ?? '',
    descripcion: p.descripcion ?? '',
    precio_base: '',   // will be filled below
    badge: p.badge ?? '',
    categoria_id: p.categoria_id ?? '',
    activo: p.activo ?? true,
    orden: p.orden ?? 0,
    isometrico_url: p.isometrico_url ?? '',
  })

  const [imgs, cfgs, sps, precioRes] = await Promise.all([
    supabase.from('producto_imagenes').select('*').eq('producto_id', p.id).order('orden'),
    supabase.from('producto_configuraciones').select('*').eq('producto_id', p.id).order('orden'),
    supabase.from('producto_specs').select('*').eq('producto_id', p.id).order('orden'),
    supabase.from('producto_precios').select('precio').eq('producto_id', p.id).single(),
  ])

  setExistingImages(imgs.data ?? [])
  setConfigs((cfgs.data ?? []).map(c => ({
    nombre: c.nombre ?? '',
    precio_extra: String(c.precio_extra ?? 0),
    isometrico_url: c.isometrico_url ?? '',
    isometrico_file: null,
  })))
  setSpecs((sps.data ?? []).map(s => ({ titulo: s.titulo ?? '', tipo: s.tipo ?? 'text', contenido: s.contenido ?? '' })))
  set('precio_base', precioRes.data?.precio != null ? String(precioRes.data.precio) : '')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

- [ ] **Step 3: Update `reset`**

```js
const reset = () => {
  setForm(EMPTY_FORM)
  setEditing(null)
  setExistingImages([])
  setConfigs([])
  setSpecs([])
}
```

- [ ] **Step 4: Update `save` to write producto_precios and producto_config_precios**

Find the `save` function and update it. Replace the payload construction and steps 1+4:

```js
const save = async () => {
  if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
  setSaving(true)
  try {
    const payload = {
      nombre: form.nombre,
      slug: form.slug || slugify(form.nombre),
      subtitulo: form.subtitulo,
      descripcion: form.descripcion,
      badge: form.badge,
      categoria_id: form.categoria_id || null,
      activo: form.activo,
      orden: parseInt(form.orden) || 0,
      isometrico_url: form.isometrico_url || null,
      // precio_desde intentionally left out — dead column
    }

    // 1. Upsert product
    let productId = editing
    if (editing) {
      await supabase.from('productos').update(payload).eq('id', editing)
    } else {
      const { data, error } = await supabase.from('productos').insert(payload).select().single()
      if (error) throw error
      productId = data.id
    }

    // 2. Upload product-level isometric if a new file was staged
    // (handled via form.isometrico_url set by the isometric upload input — see Task 12)

    // 3. Upload product images
    const folder = `productos/${productId}`
    const newImages = await imgRef.current.uploadAll(folder)
    if (newImages.length > 0) {
      await supabase.from('producto_imagenes').insert(
        newImages.map(img => ({ ...img, producto_id: productId }))
      )
    }
    const principalExistingId = imgRef.current.getPrincipalExistingId()
    if (principalExistingId) {
      await supabase.from('producto_imagenes').update({ es_principal: false }).eq('producto_id', productId)
      await supabase.from('producto_imagenes').update({ es_principal: true }).eq('id', principalExistingId)
    }

    // 4. Upsert base price → producto_precios
    if (form.precio_base !== '') {
      await supabase.from('producto_precios').upsert(
        { producto_id: productId, precio: parseFloat(form.precio_base) },
        { onConflict: 'producto_id' }
      )
    }

    // 5. Configurations: delete all → re-insert → then insert config prices
    await supabase.from('producto_configuraciones').delete().eq('producto_id', productId)
    const validConfigs = configs.filter(c => c.nombre.trim())
    if (validConfigs.length > 0) {
      const { data: insertedConfigs, error: cfgErr } = await supabase
        .from('producto_configuraciones')
        .insert(validConfigs.map((c, i) => ({
          producto_id: productId,
          nombre: c.nombre,
          orden: i,
          isometrico_url: c.isometrico_url || null,
        })))
        .select()
      if (cfgErr) throw cfgErr

      // Insert config prices into producto_config_precios
      if (insertedConfigs?.length > 0) {
        await supabase.from('producto_config_precios').insert(
          insertedConfigs.map((cfg, i) => ({
            configuracion_id: cfg.id,
            precio_extra: parseFloat(validConfigs[i].precio_extra) || 0,
          }))
        )
      }
    }

    // 6. Specs: delete all → re-insert
    await supabase.from('producto_specs').delete().eq('producto_id', productId)
    if (specs.length > 0) {
      await supabase.from('producto_specs').insert(
        specs.filter(s => s.titulo.trim()).map((s, i) => ({
          producto_id: productId, titulo: s.titulo, tipo: s.tipo, contenido: s.contenido, orden: i,
        }))
      )
    }

    reset()
    load()
  } catch (err) {
    alert(`Error al guardar: ${err.message}`)
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 5: Update the config row state shape**

Change the `addConfig` helper:
```js
const addConfig = () => setConfigs(c => [...c, { nombre: '', precio_extra: '0', isometrico_url: '', isometrico_file: null }])
```

- [ ] **Step 6: Update the "Información General" form section**

Replace the `Precio desde (MXN)` field with `Precio base (MXN)`:
```jsx
<div>
  <Label>Precio base (MXN)</Label>
  <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number"
    value={form.precio_base} onChange={e => set('precio_base', e.target.value)}
    placeholder="ej: 38000" />
</div>
```

- [ ] **Step 7: Verify build**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
```

Fix any TypeScript/lint errors. No logic test yet (needs live Supabase).

- [ ] **Step 8: Commit**

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: admin product form writes prices to producto_precios + producto_config_precios"
```

---

## Task 9: AdminProducts — grade prices section (producto_grado_precios)

**Files:**
- Modify: `src/admin/AdminProducts.jsx`

- [ ] **Step 1: Add gradoPrecio state**

Add near the other state declarations:
```js
const [gradoPrecio, setGradoPrecio] = useState({ AA: '', A: '', B: '', C: '' })
```

- [ ] **Step 2: Load grade prices in `edit`**

Add `producto_grado_precios` to the parallel fetch in the `edit` function:

```js
const [imgs, cfgs, sps, precioRes, gradoRes] = await Promise.all([
  // ... existing queries ...
  supabase.from('producto_grado_precios').select('grado, precio_extra').eq('producto_id', p.id),
])

const gp = { AA: '', A: '', B: '', C: '' }
;(gradoRes.data ?? []).forEach(g => { gp[g.grado] = String(g.precio_extra ?? 0) })
setGradoPrecio(gp)
```

- [ ] **Step 3: Save grade prices**

In `save`, after step 4 (upsert base price), add:

```js
// 4b. Grade prices → producto_grado_precios
await supabase.from('producto_grado_precios').delete().eq('producto_id', productId)
const gradoRows = Object.entries(gradoPrecio)
  .filter(([, v]) => v !== '')
  .map(([grado, precio_extra]) => ({ producto_id: productId, grado, precio_extra: parseFloat(precio_extra) || 0 }))
if (gradoRows.length > 0) {
  await supabase.from('producto_grado_precios').insert(gradoRows)
}
```

- [ ] **Step 4: Reset grade prices in `reset`**

```js
const reset = () => {
  setForm(EMPTY_FORM)
  setEditing(null)
  setExistingImages([])
  setConfigs([])
  setSpecs([])
  setGradoPrecio({ AA: '', A: '', B: '', C: '' })
}
```

- [ ] **Step 5: Add the UI section**

After the "Configuraciones" section, add a new `<SectionHeader>` and 4 input rows:

```jsx
{/* Grade Prices */}
<SectionHeader>Precio por grado de tela</SectionHeader>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
  {['AA', 'A', 'B', 'C'].map(g => (
    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.1em', color: 'var(--taupe)', width: 28, flexShrink: 0 }}>
        {g}
      </span>
      <input className="so" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
        type="number" placeholder="Extra MXN (0 = incluido)"
        value={gradoPrecio[g]}
        onChange={e => setGradoPrecio(gp => ({ ...gp, [g]: e.target.value }))} />
    </div>
  ))}
</div>
```

- [ ] **Step 6: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: admin product form adds grade price section (producto_grado_precios)"
```

---

## Task 10: AdminProducts — fabric assignment (producto_textiles)

**Files:**
- Modify: `src/admin/AdminProducts.jsx`

- [ ] **Step 1: Add textiles state**

```js
const [allTextiles, setAllTextiles] = useState([])
const [selectedTextileIds, setSelectedTextileIds] = useState(new Set())
```

- [ ] **Step 2: Load all textiles once**

Add to the initial `useEffect`:

```js
useEffect(() => {
  load()
  supabase.from('textiles').select('id, nombre, categoria, grado').eq('activo', true).order('categoria').order('orden')
    .then(({ data }) => setAllTextiles(data ?? []))
}, [])
```

- [ ] **Step 3: Load assigned textiles in `edit`**

Add `producto_textiles` to the parallel fetch:

```js
const [imgs, cfgs, sps, precioRes, gradoRes, textilesRes] = await Promise.all([
  // ... existing queries ...
  supabase.from('producto_textiles').select('textil_id').eq('producto_id', p.id),
])
setSelectedTextileIds(new Set((textilesRes.data ?? []).map(t => t.textil_id)))
```

- [ ] **Step 4: Save fabric assignment**

In `save`, before the final `reset()`, add:

```js
// 7. Fabric assignment → producto_textiles
await supabase.from('producto_textiles').delete().eq('producto_id', productId)
if (selectedTextileIds.size > 0) {
  await supabase.from('producto_textiles').insert(
    [...selectedTextileIds].map(textil_id => ({ producto_id: productId, textil_id }))
  )
}
```

- [ ] **Step 5: Reset in `reset`**

```js
setSelectedTextileIds(new Set())
```

- [ ] **Step 6: Group textiles by category helper**

Add this derived variable inside the component (before `return`):

```js
const textilesGrouped = allTextiles.reduce((acc, t) => {
  const cat = t.categoria ?? 'Sin categoría'
  if (!acc[cat]) acc[cat] = []
  acc[cat].push(t)
  return acc
}, {})
```

- [ ] **Step 7: Add the UI section**

After the "Precio por grado de tela" section:

```jsx
<SectionHeader>Telas disponibles</SectionHeader>
<p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 16px', letterSpacing: '.05em' }}>
  Si no seleccionas ninguna, el producto mostrará todas las telas activas.
</p>
{Object.entries(textilesGrouped).map(([cat, tels]) => (
  <div key={cat} style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--charcoal)' }}>{cat}</span>
      <button type="button" onClick={() => {
        const allSelected = tels.every(t => selectedTextileIds.has(t.id))
        setSelectedTextileIds(prev => {
          const next = new Set(prev)
          tels.forEach(t => allSelected ? next.delete(t.id) : next.add(t.id))
          return next
        })
      }} style={{ fontSize: 10, background: 'none', border: '1px solid var(--sand)', padding: '2px 10px', cursor: 'pointer', color: 'var(--taupe)', letterSpacing: '.1em' }}>
        {tels.every(t => selectedTextileIds.has(t.id)) ? 'Deseleccionar todo' : 'Seleccionar todo'}
      </button>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tels.map(t => (
        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--charcoal)' }}>
          <input type="checkbox"
            checked={selectedTextileIds.has(t.id)}
            onChange={() => setSelectedTextileIds(prev => {
              const next = new Set(prev)
              next.has(t.id) ? next.delete(t.id) : next.add(t.id)
              return next
            })} />
          {t.nombre}
          {t.grado && <span style={{ fontSize: 10, color: 'var(--taupe)' }}>({t.grado})</span>}
        </label>
      ))}
    </div>
  </div>
))}
```

- [ ] **Step 8: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: admin product form adds fabric assignment via producto_textiles"
```

---

## Task 11: AdminProducts — orientations (producto_orientaciones)

**Files:**
- Modify: `src/admin/AdminProducts.jsx`

- [ ] **Step 1: Add orientaciones state**

```js
const [orientaciones, setOrientaciones] = useState([])
```

- [ ] **Step 2: Load in `edit`**

```js
const [imgs, cfgs, sps, precioRes, gradoRes, textilesRes, orientRes] = await Promise.all([
  // ... existing queries ...
  supabase.from('producto_orientaciones').select('*').eq('producto_id', p.id).order('orden'),
])
setOrientaciones((orientRes.data ?? []).map(o => ({ nombre: o.nombre ?? '' })))
```

- [ ] **Step 3: Save orientaciones**

```js
// 8. Orientations → producto_orientaciones
await supabase.from('producto_orientaciones').delete().eq('producto_id', productId)
if (orientaciones.length > 0) {
  await supabase.from('producto_orientaciones').insert(
    orientaciones.filter(o => o.nombre.trim()).map((o, i) => ({
      producto_id: productId, nombre: o.nombre, orden: i,
    }))
  )
}
```

- [ ] **Step 4: Reset**

```js
setOrientaciones([])
```

- [ ] **Step 5: Helpers**

```js
const addOrientacion = () => setOrientaciones(o => [...o, { nombre: '' }])
const setOrientacion = (i, v) => setOrientaciones(o => o.map((x, idx) => idx === i ? { nombre: v } : x))
const removeOrientacion = (i) => setOrientaciones(o => o.filter((_, idx) => idx !== i))
```

- [ ] **Step 6: Add UI section (after Telas disponibles)**

```jsx
<SectionHeader>Orientaciones</SectionHeader>
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  {orientaciones.map((o, i) => (
    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8 }}>
      <input className="so" style={{ padding: '9px 12px', fontSize: 13 }}
        placeholder="ej: Isla derecha"
        value={o.nombre} onChange={e => setOrientacion(i, e.target.value)} />
      <button onClick={() => removeOrientacion(i)}
        style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  ))}
  <button onClick={addOrientacion}
    style={{ alignSelf: 'flex-start', marginTop: 4, padding: '8px 18px', background: 'none', border: '1px dashed var(--sand)', cursor: 'pointer', fontSize: 11, letterSpacing: '.15em', color: 'var(--taupe)' }}>
    + AÑADIR ORIENTACIÓN
  </button>
</div>
```

- [ ] **Step 7: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: admin product form adds orientations section"
```

---

## Task 12: AdminProducts — isometric uploads

**Files:**
- Modify: `src/admin/AdminProducts.jsx`

- [ ] **Step 1: Add product-level isometric upload state**

```js
const [isoFile, setIsoFile] = useState(null)
const isoRef = useRef()
```

- [ ] **Step 2: Handle upload in `save` (product-level)**

After the product upsert (step 1 in save), upload the isometric if a new file was selected:

```js
// 2. Upload product-level isometric if new file staged
if (isoFile) {
  const ext = isoFile.name.split('.').pop().toLowerCase()
  const path = `productos/${productId}/iso-${Date.now()}.${ext}`
  const { error: isoErr } = await supabase.storage.from('maison').upload(path, isoFile, { upsert: true })
  if (!isoErr) {
    const { data: isoData } = supabase.storage.from('maison').getPublicUrl(path)
    await supabase.from('productos').update({ isometrico_url: isoData.publicUrl }).eq('id', productId)
    set('isometrico_url', isoData.publicUrl)
  }
  setIsoFile(null)
}
```

- [ ] **Step 3: Handle per-config isometric upload in save**

When inserting configs (step 5), upload any staged isometric files first:

```js
// Before inserting configs, upload any staged isometric files
const configsWithUrls = await Promise.all(
  validConfigs.map(async (c, i) => {
    let isometrico_url = c.isometrico_url || null
    if (c.isometrico_file) {
      const ext = c.isometrico_file.name.split('.').pop().toLowerCase()
      const path = `productos/${productId}/cfg-iso-${i}-${Date.now()}.${ext}`
      const { error: isoErr } = await supabase.storage.from('maison').upload(path, c.isometrico_file, { upsert: true })
      if (!isoErr) {
        const { data: isoData } = supabase.storage.from('maison').getPublicUrl(path)
        isometrico_url = isoData.publicUrl
      }
    }
    return { ...c, isometrico_url }
  })
)
// Replace validConfigs with configsWithUrls in the insert below
```

Update the `producto_configuraciones` insert to use `configsWithUrls` instead of `validConfigs`.

- [ ] **Step 4: Reset isometric state in `reset`**

```js
setIsoFile(null)
```

- [ ] **Step 5: Add isometric UI to the form — product level**

After the images section, before specs:

```jsx
<SectionHeader>Dibujo Isométrico General</SectionHeader>
<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
  {form.isometrico_url && (
    <img src={form.isometrico_url} alt="isométrico" style={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid var(--sand)', background: '#faf9f7' }} />
  )}
  <div>
    <button className="la" type="button" onClick={() => isoRef.current.click()}>
      {form.isometrico_url ? 'Cambiar dibujo' : 'Subir dibujo isométrico'}
    </button>
    <input ref={isoRef} type="file" accept="image/*" style={{ display: 'none' }}
      onChange={e => { setIsoFile(e.target.files[0] ?? null); e.target.value = '' }} />
    {isoFile && <p style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 6 }}>{isoFile.name} — se subirá al guardar</p>}
  </div>
</div>
```

- [ ] **Step 6: Add isometric upload to each config row**

In the configs map, add an isometric upload after the `precio_extra` input:

```jsx
{/* Inside each config row div, after precio_extra input */}
<label style={{ fontSize: 10, color: 'var(--taupe)', letterSpacing: '.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
  <span>ISO</span>
  <input type="file" accept="image/*" style={{ display: 'none' }}
    onChange={e => {
      const file = e.target.files[0] ?? null
      setConfig(i, 'isometrico_file', file)
      e.target.value = ''
    }} />
  {c.isometrico_file
    ? <span style={{ color: 'var(--charcoal)' }}>✓ {c.isometrico_file.name}</span>
    : c.isometrico_url
      ? <img src={c.isometrico_url} alt="iso" style={{ width: 28, height: 28, objectFit: 'contain' }} />
      : <span style={{ borderBottom: '1px dashed var(--sand)' }}>Subir</span>
  }
</label>
```

Update the grid for config rows to accommodate this: `gridTemplateColumns: '1fr 160px auto 32px'`.

- [ ] **Step 7: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: admin adds isometric upload per product + per configuration"
```

---

## Task 13: Colecciones — dynamic categories + price gating

**Files:**
- Modify: `src/pages/Colecciones.jsx`

- [ ] **Step 1: Replace hardcoded CATEGORIES with dynamic DB fetch**

Replace the entire file:

```jsx
// src/pages/Colecciones.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function Colecciones() {
  const [products, setProducts] = useState([])
  const [categorias, setCategorias] = useState([])
  const [precios, setPrecios] = useState({}) // { [producto_id]: precio }
  const [loading, setLoading] = useState(true)
  const { distribuidor } = useDistribuidor() ?? {}
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('productos')
          .select(`*, categoria:categorias(id, nombre, slug, orden), imagenes:producto_imagenes(id, url, alt, orden, es_principal)`)
          .eq('activo', true)
          .order('orden'),
        supabase.from('categorias').select('*').order('orden'),
      ])
      const prods = (prodRes.data ?? []).map(p => ({
        ...p,
        imagen_principal: p.imagenes?.find(i => i.es_principal) ?? p.imagenes?.[0] ?? null,
      }))
      setProducts(prods)
      setCategorias(catRes.data ?? [])

      // Fetch prices only if distribuidor is active
      if (distribuidor) {
        const { data: pData } = await supabase.from('producto_precios').select('producto_id, precio')
        const map = {}
        ;(pData ?? []).forEach(r => { map[r.producto_id] = r.precio })
        setPrecios(map)
      }

      setLoading(false)
    }
    load()
  }, [distribuidor])

  const handleClick = (product) => {
    const key = product?.slug ?? product?.id
    if (key) navigate(`/producto/${key}`)
  }

  return (
    <div id="mp">
      <Nav />
      <div className="cat-pg">
        <div className="cat-hd">
          <p className="sl">Catálogo</p>
          <h1 className="cat-h1">Nuestro <em>catálogo</em> completo</h1>
        </div>

        {loading ? (
          <div className="cat-loading">CARGANDO…</div>
        ) : (
          categorias.map(cat => {
            const matched = products.filter(p => p.categoria?.id === cat.id)
            if (matched.length === 0) return null
            return (
              <div key={cat.id} className="cat-sec">
                <div className="cat-sec-hd">
                  <h2 className="cat-sec-title">{cat.nombre}</h2>
                  <span className="cat-sec-count">{matched.length}</span>
                </div>
                <div className="pg5">
                  {matched.map(product => (
                    <div key={product.id} className="pc" onClick={() => handleClick(product)}>
                      <div className="pci">
                        <div className="pci-bg">
                          {product.imagen_principal
                            ? <img src={product.imagen_principal.url} alt={product.imagen_principal.alt || product.nombre} />
                            : <div className="pc-init"><span>{product.nombre?.[0]}</span></div>
                          }
                        </div>
                        {product.badge && <span className="pbg">{product.badge}</span>}
                        <div className="pov"><span className="pct">Ver Pieza</span></div>
                      </div>
                      <div className="ptg">{product.categoria?.nombre ?? ''}</div>
                      <div className="pnm">{product.nombre}</div>
                      <div className="pds">{product.subtitulo}</div>
                      <div className="ppr">
                        {distribuidor && precios[product.id] != null
                          ? <>{fmt(precios[product.id])}<small> · desde</small></>
                          : <span style={{ color: 'var(--taupe)', fontSize: 12 }}>Precio a consultar</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/Colecciones.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: Colecciones uses dynamic DB categories + price gating for distributors"
```

---

## Task 14: ProductDetail — price gating + live price calculation

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

This is the largest single-file change. Read the current file fully before starting.

- [ ] **Step 1: Add useDistribuidor import and price state**

At the top of `ProductDetail.jsx`:

```js
import { useDistribuidor } from '../contexts/DistribuidorContext'
```

Add inside the component:

```js
const { distribuidor } = useDistribuidor() ?? {}
const [precioBase, setPrecioBase] = useState(null)
const [configPrecios, setConfigPrecios] = useState([]) // [{ configuracion_id, precio_extra }]
const [gradoPrecios, setGradoPrecios] = useState([])   // [{ grado, precio_extra }]
```

- [ ] **Step 2: Fetch prices when product loads (distribuidor only)**

In the existing `loadDetail` async function, add these fetches conditionally:

```js
async function loadDetail() {
  const queries = [
    supabase.from('producto_imagenes').select('*').eq('producto_id', product.id).order('orden'),
    supabase.from('producto_specs').select('*').eq('producto_id', product.id).order('orden'),
    supabase.from('producto_configuraciones').select('*').eq('producto_id', product.id).order('orden'),
    supabase.from('textiles').select('*').eq('activo', true).order('orden'),
    supabase.from('producto_orientaciones').select('*').eq('producto_id', product.id).order('orden'),
  ]

  const [imgRes, specRes, configRes, texRes, orientRes] = await Promise.all(queries)

  setDetail({
    imagenes: imgRes.data ?? [],
    specs: specRes.data ?? [],
    configuraciones: configRes.data ?? [],
    textiles: texRes.data ?? [],
    orientaciones: orientRes.data ?? [],
  })

  if (distribuidor) {
    const [precioRes, cfgPrecioRes, gradoPrecioRes] = await Promise.all([
      supabase.from('producto_precios').select('precio').eq('producto_id', product.id).single(),
      supabase.from('producto_config_precios').select('configuracion_id, precio_extra'),
      supabase.from('producto_grado_precios').select('grado, precio_extra').eq('producto_id', product.id),
    ])
    setPrecioBase(precioRes.data?.precio ?? null)
    setConfigPrecios(cfgPrecioRes.data ?? [])
    setGradoPrecios(gradoPrecioRes.data ?? [])
  } else {
    setPrecioBase(null)
    setConfigPrecios([])
    setGradoPrecios([])
  }
}
```

Also reset these in the `useEffect` cleanup (at the start of the effect alongside existing resets):

```js
setPrecioBase(null)
setConfigPrecios([])
setGradoPrecios([])
```

- [ ] **Step 3: Replace totalPrice calculation**

Remove the existing:
```js
const totalPrice = product.precio_desde != null
  ? product.precio_desde + (selectedConfig?.precio_extra ?? 0)
  : null
```

Replace with:

```js
// Live price: only shown to logged-in distributors
const configExtra = selectedConfig
  ? (configPrecios.find(cp => cp.configuracion_id === selectedConfig.id)?.precio_extra ?? 0)
  : 0

const gradoKey = selectedTextile?.grado
const gradoExtra = gradoKey
  ? (gradoPrecios.find(gp => gp.grado === gradoKey)?.precio_extra ?? 0)
  : 0

const totalPrice = distribuidor && precioBase != null
  ? precioBase + configExtra + gradoExtra
  : null
```

- [ ] **Step 4: Update the price display block**

The existing JSX:
```jsx
<div className="p-pr">
  <span className="p-price">
    {totalPrice != null
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totalPrice)
      : 'Precio a consultar'}
  </span>
  {totalPrice != null && <span className="p-note">Precio base · IVA incluido</span>}
</div>
```

This already works correctly with the new `totalPrice` logic — no change needed here.

- [ ] **Step 5: Update configuration button labels (remove old precio_extra)**

Find the config buttons:
```jsx
{c.nombre}{c.precio_extra > 0 ? ` +$${c.precio_extra.toLocaleString('es-MX')} MXN` : ''}
```

Replace with:
```jsx
{c.nombre}{distribuidor && configPrecios.find(cp => cp.configuracion_id === c.id)?.precio_extra > 0
  ? ` +${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(configPrecios.find(cp => cp.configuracion_id === c.id).precio_extra)}`
  : ''}
```

- [ ] **Step 6: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/ProductDetail.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: ProductDetail price gating + live price calc (base + config + grado)"
```

---

## Task 15: ProductDetail — product-specific textiles + grouped swatches + enhanced modal

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Update loadDetail to fetch product-specific textiles**

In `loadDetail`, replace the generic textiles fetch with a product-specific one:

```js
// Replace:
supabase.from('textiles').select('*').eq('activo', true).order('orden'),
// With:
supabase.from('producto_textiles')
  .select('textil:textiles(*)')
  .eq('producto_id', product.id),
```

Then in the result handling:

```js
// texRes is now producto_textiles rows with joined textiles
let textilesList = (texRes.data ?? []).map(r => r.textil).filter(Boolean)
// If no product-specific textiles assigned, fall back to all active
if (textilesList.length === 0) {
  const { data: allTex } = await supabase.from('textiles').select('*').eq('activo', true).order('orden')
  textilesList = allTex ?? []
}

setDetail({
  imagenes: imgRes.data ?? [],
  specs: specRes.data ?? [],
  configuraciones: configRes.data ?? [],
  textiles: textilesList,
  orientaciones: orientRes.data ?? [],
})
```

- [ ] **Step 2: Group textiles by category for display**

Add inside the component body:

```js
const textilesGrouped = textiles.reduce((acc, t) => {
  const cat = t.categoria ?? 'Telas'
  if (!acc[cat]) acc[cat] = []
  acc[cat].push(t)
  return acc
}, {})
```

- [ ] **Step 3: Replace the fabric swatch section**

Find the existing swatch section (starts with `{textiles.length > 0 && (`). Replace the entire block with:

```jsx
{textiles.length > 0 && (
  <div className="cb">
    <div className="ct">
      Tela
      <span>
        {selectedTextile
          ? <>{selectedTextile.nombre}{selectedTextile.grado && <span className="grado-pill">{selectedTextile.grado}</span>}</>
          : 'Seleccionar'}
      </span>
    </div>
    {Object.entries(textilesGrouped).map(([cat, tels]) => (
      <div key={cat} style={{ marginBottom: 12 }}>
        {Object.keys(textilesGrouped).length > 1 && (
          <p style={{ fontFamily: 'var(--sans)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', margin: '0 0 8px' }}>{cat}</p>
        )}
        <div className="sws">
          {tels.map(t => (
            <button
              key={t.id}
              className={`sw ${selectedTextile?.id === t.id ? 'on' : ''}`}
              d={t.nombre}
              style={t.imagen_url
                ? { backgroundImage: `url(${t.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: t.color_hex ?? '#ccc' }
              }
              onClick={() => {
                setSelectedTextile(prev => prev?.id === t.id ? null : t)
                setTextileModal(t)
              }}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Update the textile detail modal to show grado + large image**

Find the `{textileModal && (` block. Replace the modal body content:

```jsx
{textileModal && (
  <div className="tl-ov" onClick={() => setTextileModal(null)}>
    <div className="tl-box" onClick={e => e.stopPropagation()}>
      <button className="tl-x" onClick={() => setTextileModal(null)}>×</button>
      <div className="tl-img">
        {textileModal.imagen_url
          ? <img src={textileModal.imagen_url} alt={textileModal.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: textileModal.color_hex ?? 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 80, background: textileModal.color_hex ?? 'var(--sand)', border: '4px solid rgba(255,255,255,.4)' }} />
            </div>
        }
      </div>
      <div className="tl-body">
        {textileModal.categoria && <div className="tl-cat">{textileModal.categoria}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="tl-nm">{textileModal.nombre}</div>
          {textileModal.grado && <span className="grado-pill">{textileModal.grado}</span>}
        </div>
        {textileModal.descripcion && <p className="tl-ds">{textileModal.descripcion}</p>}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/ProductDetail.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: ProductDetail grouped fabric swatches by category + enhanced modal with grado"
```

---

## Task 16: ProductDetail — orientations selector

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Add orientaciones state**

```js
const [selectedOrientacion, setSelectedOrientacion] = useState(null)
```

Reset it in the useEffect cleanup:
```js
setSelectedOrientacion(null)
```

- [ ] **Step 2: Read orientaciones from detail**

```js
const orientaciones = detail?.orientaciones ?? []
```

Add this near the existing destructuring:
```js
const orientaciones = detail?.orientaciones ?? []
```

- [ ] **Step 3: Add orientation selector UI**

After the configuraciones block (and before the quote button), add:

```jsx
{orientaciones.length > 0 && (
  <div className="cb">
    <div className="ct">
      Orientación
      <span>{selectedOrientacion?.nombre ?? 'Seleccionar'}</span>
    </div>
    <div className="szs">
      {orientaciones.map(o => (
        <button
          key={o.id}
          className={`so ${selectedOrientacion?.id === o.id ? 'on' : ''}`}
          onClick={() => setSelectedOrientacion(prev => prev?.id === o.id ? null : o)}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/ProductDetail.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: ProductDetail shows orientation selector when product has orientations"
```

---

## Task 17: ProductDetail — isometric display

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Compute which isometric to show**

Add inside the component body:

```js
const isometricoUrl = selectedConfig?.isometrico_url ?? product?.isometrico_url ?? null
```

- [ ] **Step 2: Add isometric display to the info panel**

After the specs accordion block, add:

```jsx
{isometricoUrl && (
  <div style={{ marginTop: 32, borderTop: '1px solid var(--sand)', paddingTop: 24 }}>
    <p style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 14 }}>
      Dibujo técnico
    </p>
    <img
      src={isometricoUrl}
      alt={`Dibujo isométrico ${product.nombre}`}
      style={{ width: '100%', maxWidth: 420, display: 'block', background: '#faf9f7', padding: 16, boxSizing: 'border-box' }}
    />
  </div>
)}
```

- [ ] **Step 3: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/ProductDetail.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: ProductDetail shows isometric technical drawing (per config or product fallback)"
```

---

## Task 18: CSS additions

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add new styles at the end of index.css**

```css
/* ── Grado pill ── */
.grado-pill{display:inline-block;font-family:var(--sans);font-size:9px;letter-spacing:.15em;text-transform:uppercase;background:var(--sand);color:var(--charcoal);padding:2px 8px;margin-left:6px;vertical-align:middle}

/* ── Distribuidor login page ── */
.dist-pg{min-height:100vh;background:var(--warm);display:flex;align-items:center;justify-content:center;padding:100px 24px 64px}
.dist-card{width:100%;max-width:420px}

/* ── Cat count (no slash for dynamic) ── */
.cat-sec-count{font-family:var(--sans);font-size:11px;color:var(--taupe);letter-spacing:.1em}

/* ── Admin grado rows ── */
.grado-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--sand)}
.grado-row:last-child{border-bottom:none}
.grado-label{font-family:var(--sans);font-size:11px;letter-spacing:.1em;color:var(--taupe);width:32px;flex-shrink:0}
```

- [ ] **Step 2: Verify build + commit**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
git -C "C:\Users\Usuario\Downloads\Maison" add src/index.css
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: CSS additions for grado pill, login page, admin sections"
```

---

## Task 19: Final integration verification

- [ ] **Step 1: Run dev server and test all flows**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run dev
```

Manual checks:
1. `/distribuidores` loads with light cream background, no black anywhere
2. Enter email NOT in distribuidores → "Cuenta no autorizada" on signup tab
3. Enter valid distribuidor email → signup succeeds, confirmation email sent
4. After login → Nav shows "Mi cuenta" + "Salir"
5. `/colecciones` shows real prices for logged-in distribuidor, "Precio a consultar" when logged out
6. Product detail → price updates live when selecting config or tela
7. `/admin/distribuidores` → CRUD works, activo toggle works
8. Admin product form → Precio base field present, grade prices section, telas checkboxes, orientaciones, isometric upload
9. Admin textiles form → grado select field present

- [ ] **Step 2: Build for production**

```bash
cd C:\Users\Usuario\Downloads\Maison && npm run build
```

Expected: no errors, `dist/` folder created.

- [ ] **Step 3: Deploy to Vercel**

```bash
cd C:\Users\Usuario\Downloads\Maison && npx vercel --prod
```

Or push to the connected Git branch if Vercel auto-deploys.

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Auth — login page at /distribuidores | Task 3 |
| Auth — "Crear contraseña" with distribuidor check | Task 1 + 3 |
| Auth — session persists, Nav shows Mi cuenta + logout | Task 1 + 6 |
| Price gating — distribuidor sees prices | Task 13 + 14 |
| Price gating — public sees "Precio a consultar" | Task 13 + 14 |
| Live price = base + config extra + grado extra | Task 14 |
| Fabric grades (grado on textiles) | Task 7 |
| Grade prices in admin product form | Task 9 |
| Fabric-per-product assignment | Task 10 |
| Grouped swatches + enhanced modal | Task 15 |
| Orientaciones selector (no price impact) | Task 11 + 16 |
| Isometric drawings per config + product | Task 12 + 17 |
| Admin Distribuidores CRUD | Task 4 + 5 |
| Admin price fields write to new tables | Task 8 |
| Dynamic categories in Colecciones | Task 13 |
| CSS — light backgrounds, editorial style | Tasks 3 + 18 |

All requirements covered. No TBDs or placeholders.

**Column name note:** If any Supabase query returns an error about an unknown column (e.g., `configuracion_id` vs `producto_configuracion_id`), open the Supabase Table Editor to verify the exact column name and update the relevant task's query.
