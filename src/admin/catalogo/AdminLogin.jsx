import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import './AdminLayout.css'

export default function AdminLogin() {
  const { email: sessionEmail, signIn } = useAdminAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (sessionEmail) {
    const dest = location.state?.from ?? '/admin'
    return <Navigate to={dest} replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div className="adm-login-screen">
      <form className="adm-login-box" onSubmit={submit}>
        <div className="adm-login-logo">Brendell</div>
        <div className="adm-login-sub">Admin — inicia sesión para continuar</div>

        {error && <div className="adm-login-error">{error}</div>}

        <div className="adm-field">
          <label className="adm-label">Correo</label>
          <input
            className="adm-input"
            style={{ width: '100%' }}
            type="email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="adm-field">
          <label className="adm-label">Contraseña</label>
          <input
            className="adm-input"
            style={{ width: '100%' }}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="adm-btn adm-btn-dark" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
