# Fusionar las 3 ramas en master

Ejecuta esto desde `C:\Users\Usuario\Downloads\Maison` (la raíz, NO un worktree).

## 1. Verifica que no haya cambios sin guardar

```bash
cd C:\Users\Usuario\Downloads\Maison
git status
```

Si hay algo pendiente, avísame antes de seguir.

## 2. Fusiona admin-catalogo primero

```bash
git checkout master
git merge feature/admin-catalogo
```

Es autocontenida (todo su código nuevo vive en `src/admin/catalogo/`), así que probablemente no truene. Si hay conflicto, resuélvelo a favor de la versión de `feature/admin-catalogo`.

## 3. Fusiona configurador-supabase

```bash
git merge feature/configurador-supabase
```

**Esta sí va a chocar en `src/App.jsx`**, porque ambas ramas lo reescribieron por separado. Cuando git marque el conflicto, reemplaza el contenido COMPLETO de `src/App.jsx` por esto (combina lo de las dos ramas correctamente — usa el admin nuevo y seguro de admin-catalogo, más las páginas nuevas de configurador-supabase):

```jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { DistribuidorProvider } from './contexts/DistribuidorContext'
import { AdminAuthProvider } from './admin/catalogo/AdminAuthContext'
import Home from './pages/Home'
import Colecciones from './pages/Colecciones'
import ProductPage from './pages/ProductPage'
import Distribuidores from './pages/Distribuidores'
import Configurador from './pages/Configurador'
import MiEspacio from './pages/MiEspacio'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

const AdminLayout = lazy(() => import('./admin/catalogo/AdminLayout'))
const AdminLogin = lazy(() => import('./admin/catalogo/AdminLogin'))
const Dashboard = lazy(() => import('./admin/catalogo/Dashboard'))
const AdminProducts = lazy(() => import('./admin/catalogo/AdminProducts'))
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
      <AdminAuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/colecciones" element={<Colecciones />} />
          <Route path="/producto/:slug" element={<ProductPage />} />
          <Route path="/distribuidores" element={<Distribuidores />} />
          <Route path="/configurador" element={<Configurador />} />
          <Route path="/mi-espacio" element={<MiEspacio />} />
          <Route path="/admin/login" element={<Suspense fallback={<AdminFallback />}><AdminLogin /></Suspense>} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
            <Route path="productos/*" element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
            <Route path="leads" element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
            <Route path="distribuidores" element={<Suspense fallback={<AdminFallback />}><AdminDistribuidores /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </DistribuidorProvider>
  )
}
```

Nota: esto deja fuera de ruta `src/admin/AdminLayout.jsx`, `AdminDashboard.jsx`, `AdminProducts.jsx`, `AdminTelas.jsx`, `AdminTextiles.jsx` (el admin viejo, sin login real) — quedan en el repo sin usarse, no hace falta borrarlos ahora.

Si también marca conflicto en `src/components/Nav.jsx`: debe quedar con AMBAS cosas — el link "Distribuidor" para visitantes sin sesión, y "Mi Espacio" + "Mi cuenta" + "Salir" para distribuidores con sesión. Si el conflicto es limpio (cada rama tocó una parte distinta del archivo), git normalmente lo resuelve solo.

## 4. Verifica y confirma

```bash
git status
npm install
npm run build
```

Si `npm run build` pasa sin errores, cierra la fusión:

```bash
git add .
git commit -m "merge: unifica admin-catalogo + configurador-supabase en master"
```

## 5. Prueba en local

```bash
npm run dev
```

Revisa: `/` (Home igual), `/colecciones` (categorías dinámicas), clic en un modelo (abre `/configurador` sin precios), `/distribuidores` (login), `/mi-espacio` (tras login), `/admin/login` (con el usuario de Supabase Auth que creaste).

## 6. Limpieza opcional

Una vez todo fusionado y probado, puedes borrar los worktrees si ya no los necesitas:

```bash
git worktree remove .worktrees/admin-catalogo
git worktree remove .worktrees/configurador-supabase
```
