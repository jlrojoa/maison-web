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
const AdminTelas = lazy(() => import('./admin/AdminTelas'))
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
          <Route path="telas" element={<Suspense fallback={<AdminFallback />}><AdminTelas /></Suspense>} />
          <Route path="textiles" element={<Suspense fallback={<AdminFallback />}><AdminTextiles /></Suspense>} />
          <Route path="leads" element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
          <Route path="distribuidores" element={<Suspense fallback={<AdminFallback />}><AdminDistribuidores /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DistribuidorProvider>
  )
}
