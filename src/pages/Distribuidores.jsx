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
