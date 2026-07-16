import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Ruta vieja (/producto/:slug). Ya no se enlaza desde ningún lado en la app,
// pero se deja registrada en App.jsx por si queda algún marcador, pestaña
// vieja o link externo apuntando aquí. En vez de renderizar el ProductDetail
// antiguo (diseño serie/PASO 1-2, ya descartado), redirige de inmediato al
// Configurador real con el mismo producto preseleccionado. Así no hay forma
// de aterrizar en el diseño viejo, venga la visita de donde venga.
export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    async function load() {
      const { data } = await supabase
        .from('productos')
        .select('slug, categoria:categorias(slug)')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle()

      if (ignore) return

      if (!data) {
        navigate('/colecciones', { replace: true })
        return
      }
      const tipo = data.categoria?.slug
      const modelo = data.slug ?? slug
      navigate(tipo ? `/configurador?tipo=${tipo}&modelo=${modelo}` : `/configurador?modelo=${modelo}`, { replace: true })
    }
    load()
    return () => { ignore = true }
  }, [slug, navigate])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.2em' }}>
      CARGANDO…
    </div>
  )
}
