import { useNavigate } from 'react-router-dom'
import { useScrollNav } from '../hooks/useScrollNav'
import { useDistribuidor } from '../contexts/DistribuidorContext'

export default function Nav() {
  const scrolled = useScrollNav(60)
  const navigate = useNavigate()
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null
  const signOut = ctx?.signOut ?? null

  const handleLogout = async () => {
    if (signOut) await signOut()
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
            <a
              href="/distribuidores"
              onClick={e => { e.preventDefault(); navigate('/distribuidores') }}
              className="nbtn"
              style={{ background: 'transparent', borderColor: 'currentColor' }}
            >
              Mi cuenta
            </a>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'inherit', cursor: 'pointer', opacity: .7 }}
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <a
              href="/distribuidores"
              onClick={e => { e.preventDefault(); navigate('/distribuidores') }}
              style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'inherit', textDecoration: 'none', opacity: .75 }}
            >
              Distribuidor
            </a>
            <a href="#kt" className="nbtn">Kit de Muestras</a>
          </>
        )}
      </div>
    </nav>
  )
}
