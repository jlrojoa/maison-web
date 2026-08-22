import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { DistribuidorProvider } from './contexts/DistribuidorContext'
import { AdminAuthProvider } from './admin/catalogo/AdminAuthContext'
import Home from './pages/Home'
import Colecciones from './pages/Colecciones'
import Materiales from './pages/Materiales'
import MaterialDetalle from './pages/MaterialDetalle'
import ProductPage from './pages/ProductPage'
import Distribuidores from './pages/Distribuidores'
import Configurador from './pages/Configurador'
import MiEspacio from './pages/MiEspacio'
import MiEspacioDescargas from './pages/MiEspacioDescargas'

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
const AdminCatalogos = lazy(() => import('./admin/AdminCatalogos'))

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
          <Route path="/materiales" element={<Materiales />} />
          <Route path="/materiales/:idOrSlug" element={<MaterialDetalle />} />
          <Route path="/producto/:slug" element={<ProductPage />} />
          <Route path="/distribuidores" element={<Distribuidores />} />
          <Route path="/configurador" element={<Configurador />} />
          <Route path="/configurador/:categoria" element={<Configurador />} />
          <Route path="/configurador/:categoria/:productoSlug" element={<Configurador />} />
          <Route path="/mi-espacio" element={<MiEspacio />} />
          <Route path="/mi-espacio/descargas" element={<MiEspacioDescargas />} />
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
            <Route path="catalogos" element={<Suspense fallback={<AdminFallback />}><AdminCatalogos /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </DistribuidorProvider>
  )
}
