import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_ICON = (
  <svg className="mico" viewBox="0 0 42 42">
    <path d="M4 14h34M4 21h34M4 28h34" strokeLinecap="round"/>
  </svg>
)

function TextileVisual({ textile }) {
  if (textile.imagen_url) {
    return (
      <img
        src={textile.imagen_url}
        alt={textile.nombre}
        style={{ width: 42, height: 42, objectFit: 'cover', marginBottom: 20, opacity: .8 }}
      />
    )
  }
  if (textile.color_hex) {
    return (
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: textile.color_hex,
        marginBottom: 20,
        border: '1px solid rgba(255,255,255,.15)'
      }} />
    )
  }
  return DEFAULT_ICON
}

export default function Materials() {
  const [textiles, setTextiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('textiles')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => {
        setTextiles(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <section className="mts" id="mt">
      <div className="mh">
        <p className="sl rv">Materiales</p>
        <h2 className="st rv d1">Selección <em>excepcional</em></h2>
        <p className="sb rv d2">Trabajamos exclusivamente con proveedores europeos certificados.</p>
      </div>
      {!loading && (
        <div className="mg">
          {textiles.length === 0 ? (
            // Fallback static tiles when DB is empty
            [
              { id: 1, nombre: 'Lino Belga', descripcion: 'Tejido natural de alta densidad con caída excepcional.', color_hex: '#C4B5A5' },
              { id: 2, nombre: 'Terciopelo Italiano', descripcion: 'Terciopelo de seda y algodón con lustre profundo.', color_hex: '#2C2825' },
              { id: 3, nombre: 'Bouclé Francés', descripcion: 'Tejido texturizado de lana merino con hilos rizados.', color_hex: '#E8DDD0' },
              { id: 4, nombre: 'Cuero Napa', descripcion: 'Cuero plena flor de curtido vegetal. Mejora con el uso.', color_hex: '#8C7B6B' },
            ].map(t => (
              <div key={t.id} className="mitem rv">
                <TextileVisual textile={t} />
                <div className="mnm">{t.nombre}</div>
                <div className="mds">{t.descripcion}</div>
              </div>
            ))
          ) : (
            textiles.map(t => (
              <div key={t.id} className="mitem rv">
                <TextileVisual textile={t} />
                <div className="mnm">{t.nombre}</div>
                <div className="mds">{t.descripcion}</div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
