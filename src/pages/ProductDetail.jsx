import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductDetail({ product, onBack }) {
  const [detail, setDetail] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [openAccordion, setOpenAccordion] = useState(null)
  const [quoteStatus, setQuoteStatus] = useState(null)

  useEffect(() => {
    if (!product?.id) return
    setActiveImg(0)
    setSelectedConfig(null)
    setOpenAccordion(null)
    setQuoteStatus(null)

    async function loadDetail() {
      const [imgRes, specRes, configRes] = await Promise.all([
        supabase.from('producto_imagenes').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_specs').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_configuraciones').select('*').eq('producto_id', product.id).order('orden'),
      ])
      setDetail({
        imagenes: imgRes.data ?? [],
        specs: specRes.data ?? [],
        configuraciones: configRes.data ?? [],
      })
    }
    loadDetail()
  }, [product?.id])

  if (!product) return null

  const imagenes = detail?.imagenes ?? (product.imagenes ?? [])
  const specs = detail?.specs ?? []
  const configuraciones = detail?.configuraciones ?? []
  const activeImage = imagenes[activeImg]

  const requestQuote = async () => {
    setQuoteStatus('loading')
    const { error } = await supabase.from('leads').insert({
      nombre: 'Consulta web',
      email: 'pendiente@maison.es',
      producto_interes: product.nombre,
      mensaje: `Interés en ${product.nombre}${selectedConfig ? ` · Configuración: ${selectedConfig.nombre}` : ''}`,
    })
    setQuoteStatus(error ? 'error' : 'ok')
  }

  const accordions = [
    { title: 'Descripción', content: product.descripcion },
    ...specs.map(s => ({ title: s.titulo, content: Array.isArray(s.contenido) ? s.contenido.join(' · ') : JSON.stringify(s.contenido) })),
    { title: 'Cuidados', content: 'Limpiar con paño seco. Evitar exposición directa al sol prolongada.' },
    { title: 'Entrega e instalación', content: 'Plazo de fabricación: 6–8 semanas. Entrega e instalación incluidas en toda España peninsular.' },
  ].filter(a => a.content)

  const totalPrice = product.precio_desde != null
    ? product.precio_desde + (selectedConfig?.precio_extra ?? 0)
    : null

  return (
    <div id="pp" className="on">
      <div className="pnav">
        <button className="bb" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5"/>
          </svg>
          Volver
        </button>
        <span className="bc">
          Colecciones{product.categoria ? ` / ${product.categoria.nombre}` : ''} / {product.nombre}
        </span>
      </div>

      <div className="pl">
        {/* Gallery */}
        <div className="pgal">
          <div className="gm">
            <div className="gm-bg">
              {activeImage
                ? <img src={activeImage.url} alt={activeImage.alt || product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="gm-lbl">{product.nombre?.[0]}</span>
              }
            </div>
          </div>
          {imagenes.length > 1 && (
            <div className="gths">
              {imagenes.map((img, i) => (
                <div key={img.id} className={`gt ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={img.url} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pd">
          <div className="p-tag">{product.categoria?.nombre ?? 'Colección'}</div>
          <h1 className="p-nm">{product.nombre}</h1>
          {product.subtitulo && <div className="p-sb">{product.subtitulo}</div>}

          <div className="p-pr">
            <span className="p-price">
              {totalPrice != null
                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrice)
                : 'Precio a consultar'}
            </span>
            {totalPrice != null && <span className="p-note">precio desde, fabricación a medida</span>}
          </div>

          {product.descripcion && <p className="p-desc">{product.descripcion}</p>}

          {configuraciones.length > 0 && (
            <div className="cb">
              <div className="ct">
                Configuración
                <span>{selectedConfig?.nombre ?? 'Seleccionar'}</span>
              </div>
              <div className="szs">
                {configuraciones.map(c => (
                  <button
                    key={c.id}
                    className={`so ${selectedConfig?.id === c.id ? 'on' : ''}`}
                    onClick={() => setSelectedConfig(selectedConfig?.id === c.id ? null : c)}
                  >
                    {c.nombre}{c.precio_extra > 0 ? ` +${c.precio_extra}€` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className="bcot"
            onClick={requestQuote}
            disabled={quoteStatus === 'loading' || quoteStatus === 'ok'}
          >
            {quoteStatus === 'loading' ? 'Enviando…'
              : quoteStatus === 'ok' ? '✓ Solicitud enviada'
              : 'Solicitar Presupuesto'}
          </button>
          <button className="bkit" onClick={onBack}>Seguir Explorando</button>

          {quoteStatus === 'error' && (
            <p style={{ color: '#c0392b', fontFamily: 'var(--sans)', fontSize: 12, marginBottom: 16 }}>
              Error al enviar. Por favor inténtalo de nuevo.
            </p>
          )}

          {accordions.length > 0 && (
            <div className="acc">
              {accordions.map(a => (
                <div key={a.title} className={`ai ${openAccordion === a.title ? 'op' : ''}`}>
                  <div className="ah" onClick={() => setOpenAccordion(openAccordion === a.title ? null : a.title)}>
                    {a.title}
                    <span className="aic">+</span>
                  </div>
                  <div className="ab" style={{ maxHeight: openAccordion === a.title ? 400 : 0 }}>
                    <div className="abin">{a.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
