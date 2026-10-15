// src/components/AvisoCookies.jsx
//
// Aviso de uso de almacenamiento del navegador. Hoy el sitio solo guarda lo
// NECESARIO (sesión del distribuidor y su cotización en curso) y no usa
// cookies publicitarias ni de rastreo, así que el aviso es informativo. Si
// algún día se agrega un píxel o analítica, debe cargarse SOLO después de que
// la persona lo acepte (aquí) y actualizarse el Aviso de privacidad.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CLAVE = 'brendell_aviso_almacenamiento_v1'

function yaAceptado() {
  try { return localStorage.getItem(CLAVE) === 'ok' } catch { return false }
}

export default function AvisoCookies() {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(() => !yaAceptado())
  if (!visible) return null

  const aceptar = () => {
    try { localStorage.setItem(CLAVE, 'ok') } catch { /* sin storage: se vuelve a mostrar */ }
    setVisible(false)
  }

  return (
    <div role="region" aria-label="Aviso de privacidad y almacenamiento" style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 300, maxWidth: 720, margin: '0 auto',
      background: '#1D1A17', color: '#fff', borderRadius: 8, padding: '16px 20px',
      display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      fontFamily: 'var(--sans)', fontSize: 12.5, lineHeight: 1.6, boxShadow: '0 8px 32px rgba(0,0,0,.25)',
    }}>
      <p style={{ margin: 0, flex: '1 1 320px' }}>
        Este sitio guarda en tu navegador solo lo necesario para funcionar (tu sesión y tu cotización en curso).
        No usamos cookies publicitarias ni de rastreo.{' '}
        <a href="/aviso-de-privacidad" onClick={e => { e.preventDefault(); navigate('/aviso-de-privacidad') }} style={{ color: '#fff', textDecoration: 'underline' }}>
          Aviso de privacidad
        </a>
      </p>
      <button type="button" onClick={aceptar} style={{
        background: '#fff', color: '#1D1A17', border: 0, borderRadius: 4, padding: '10px 22px',
        fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.15em', textTransform: 'uppercase', cursor: 'pointer',
      }}>
        Entendido
      </button>
    </div>
  )
}
