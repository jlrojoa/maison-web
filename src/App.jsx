import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Home from './pages/Home'

// Admin will be implemented in Task 15 — lazy import so missing file doesn't break build
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./admin/AdminProducts'))
const AdminTextiles = lazy(() => import('./admin/AdminTextiles'))
const AdminLeads = lazy(() => import('./admin/AdminLeads'))

function AdminFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)', color: 'var(--taupe)', letterSpacing: '.2em', fontSize: 12 }}>
      CARGANDO PANEL…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminLayout />
          </Suspense>
        }
      >
        <Route index element={
          <Suspense fallback={<AdminFallback />}>
            <AdminDashboard />
          </Suspense>
        } />
        <Route path="productos" element={
          <Suspense fallback={<AdminFallback />}>
            <AdminProducts />
          </Suspense>
        } />
        <Route path="textiles" element={
          <Suspense fallback={<AdminFallback />}>
            <AdminTextiles />
          </Suspense>
        } />
        <Route path="leads" element={
          <Suspense fallback={<AdminFallback />}>
            <AdminLeads />
          </Suspense>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
