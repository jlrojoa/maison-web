import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function ProductDetail({ product, onBack }) {
  const [detail, setDetail] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [selectedTextile, setSelectedTextile] = useState(null)
  const [selectedOrientacion, setSelectedOrientacion] = useState(null)
  const [textileModal, setTextileModal] = useState(null)
  const [openAccordion, setOpenAccordion] = useState(null)
  const [quoteStatus, setQuoteStatus] = useState(null)

  // Distribuidor price state
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null
  const [precioBase, setPrecioBase] = useState(null)
  const [configPrecios, setConfigPrecios] = useState([])
  const [gradoPrecios, setGradoPrecios] = useState([])

  useEffect(() => {
    if (!product?.id) return
    setActiveImg(0)
    setSelectedConfig(null)
    setSelectedTextile(null)
    setSelectedOrientacion(null)
    setTextileModal(null)
    setOpenAccordion(null)
    setQuoteStatus(null)
    setPrecioBase(null)
    setConfigPrecios([])
    setGradoPrecios([])

    async function loadDetail() {
      // Fetch product-specific textiles; fall back to all active if none assigned
      const [imgRes, specRes, configRes, orientRes, texAssigedRes] = await Promise.all([
        supabase.from('producto_imagenes').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_specs').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_configuraciones').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_orientaciones').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_textiles').select('textil:textiles(*)').eq('producto_id', product.id),
      ])

      let textilesList = (texAssigedRes.data ?? []).map(r => r.textil).filter(Boolean)
      if (textilesList.length === 0) {
        const { data: allTex } = await supabase.from('textiles').select('*').eq('activo', true).order('orden')
        textilesList = allTex ?? []
      }

      setDetail({
        imagenes: imgRes.data ?? [],
        specs: specRes.data ?? [],
        configuraciones: configRes.data ?? [],
        orientaciones: orientRes.data ?? [],
        textiles: textilesList,
      })

      if (distribuidor) {
        const [precioRes, cfgPrecioRes, gradoPrecioRes] = await Promise.all([
          supabase.from('producto_precios').select('precio').eq('producto_id', product.id).single(),
          supabase.from('producto_config_precios').select('configuracion_id, precio_extra'),
          supabase.from('producto_grado_precios').select('grado, precio_extra').eq('producto_id', product.id),
        ])
        setPrecioBase(precioRes.data?.precio ?? null)
        setConfigPrecios(cfgPrecioRes.data ?? [])
        setGradoPrecios(gradoPrecioRes.data ?? [])
      }
    }
    loadDetail()
  }, [product?.id, distribuidor])

  // Close textile modal on Escape
  useEffect(() => {
    if (!textileModal) return
    const onKey = e => { if (e.key === 'Escape') setTextileModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [textileModal])

  if (!product) return null

  const imagenes = detail?.imagenes ?? (product.imagenes ?? [])
  const specs = detail?.specs ?? []
  const configuraciones = detail?.configuraciones ?? []
  const orientaciones = detail?.orientaciones ?? []
  const textiles = detail?.textiles ?? []
  const activeImage = imagenes[activeImg]

  // Textiles grouped by category
  const textilesGrouped = textiles.reduce((acc, t) => {
    const cat = t.categoria ?? 'Telas'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  // Live price calculation (distribuidor only)
  const configExtra = selectedConfig
    ? (configPrecios.find(cp => cp.configuracion_id === selectedConfig.id)?.precio_extra ?? 0)
    : 0
  const gradoKey = selectedTextile?.grado
  const gradoExtra = gradoKey
    ? (gradoPrecios.find(gp => gp.grado === gradoKey)?.precio_extra ?? 0)
    : 0
  const totalPrice = distribuidor && precioBase != null
    ? precioBase + configExtra + gradoExtra
    : null

  // Isometric: prefer selected config's, fall back to product-level
  const isometricoUrl = selectedConfig?.isometrico_url ?? product?.isometrico_url ?? null

  const requestQuote = async () => {
    setQuoteStatus('loading')
    const { error } = await supabase.from('leads').insert({
      nombre: 'Consulta web',
      email: 'pendiente@maison.mx',
      producto_interes: product.nombre,
      mensaje: `Interés en ${product.nombre}${selectedConfig ? ` · Config: ${selectedConfig.nombre}` : ''}${selectedTextile ? ` · Tela: ${selectedTextile.nombre}` : ''}${selectedOrientacion ? ` · Orientación: ${selectedOrientacion.nombre}` : ''}`,
    })
    setQuoteStatus(error ? 'error' : 'ok')
  }

  const accordions = [
    { title: 'Descripción', content: product.descripcion },
    ...specs.map(s => ({ title: s.titulo, content: Array.isArray(s.contenido) ? s.contenido.join(' · ') : JSON.stringify(s.contenido) })),
    { title: 'Cuidados', content: 'Limpiar con paño seco. Evitar exposición directa al sol prolongada.' },
    { title: 'Entrega e instalación', content: 'Plazo de fabricación: 6–8 semanas. Entrega e instalación incluidas en Puebla y CDMX.' },
  ].filter(a => a.content)

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
                ? fmt(totalPrice)
                : 'Precio a consultar'}
            </span>
            {totalPrice != null && <span className="p-note">IVA incluido</span>}
          </div>

          {product.descripcion && <p className="p-desc">{product.descripcion}</p>}

          {/* Fabric swatches grouped by category */}
          {textiles.length > 0 && (
            <div className="cb">
              <div className="ct">
                Tela
                <span>
                  {selectedTextile
                    ? <>{selectedTextile.nombre}{selectedTextile.grado && <span className="grado-pill">{selectedTextile.grado}</span>}</>
                    : 'Seleccionar'}
                </span>
              </div>
              {Object.entries(textilesGrouped).map(([cat, tels]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  {Object.keys(textilesGrouped).length > 1 && (
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', margin: '0 0 8px' }}>{cat}</p>
                  )}
                  <div className="sws">
                    {tels.map(t => (
                      <button
                        key={t.id}
                        className={`sw ${selectedTextile?.id === t.id ? 'on' : ''}`}
                        d={t.nombre}
                        style={t.imagen_url
                          ? { backgroundImage: `url(${t.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: t.color_hex ?? '#ccc' }
                        }
                        onClick={() => {
                          setSelectedTextile(prev => prev?.id === t.id ? null : t)
                          setTextileModal(t)
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Configuration selector */}
          {configuraciones.length > 0 && (
            <div className="cb">
              <div className="ct">
                Configuración
                <span>{selectedConfig?.nombre ?? 'Seleccionar'}</span>
              </div>
              <div className="szs">
                {configuraciones.map(c => {
                  const extra = distribuidor ? (configPrecios.find(cp => cp.configuracion_id === c.id)?.precio_extra ?? 0) : 0
                  return (
                    <button
                      key={c.id}
                      className={`so ${selectedConfig?.id === c.id ? 'on' : ''}`}
                      onClick={() => setSelectedConfig(prev => prev?.id === c.id ? null : c)}
                    >
                      {c.nombre}{distribuidor && extra > 0 ? ` +${fmt(extra)}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Orientation selector */}
          {orientaciones.length > 0 && (
            <div className="cb">
              <div className="ct">
                Orientación
                <span>{selectedOrientacion?.nombre ?? 'Seleccionar'}</span>
              </div>
              <div className="szs">
                {orientaciones.map(o => (
                  <button
                    key={o.id}
                    className={`so ${selectedOrientacion?.id === o.id ? 'on' : ''}`}
                    onClick={() => setSelectedOrientacion(prev => prev?.id === o.id ? null : o)}
                  >
                    {o.nombre}
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
              : 'Cotizar esta Pieza'}
          </button>
          <button className="bkit" onClick={onBack}>✦ Solicitar Kit de Muestras</button>

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

          {/* Isometric technical drawing */}
          {isometricoUrl && (
            <div style={{ marginTop: 32, borderTop: '1px solid var(--sand)', paddingTop: 24 }}>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 14 }}>
                Dibujo técnico
              </p>
              <img
                src={isometricoUrl}
                alt={`Dibujo isométrico ${product.nombre}`}
                style={{ width: '100%', maxWidth: 420, display: 'block', background: '#faf9f7', padding: 16, boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Textile detail modal */}
      {textileModal && (
        <div className="tl-ov" onClick={() => setTextileModal(null)}>
          <div className="tl-box" onClick={e => e.stopPropagation()}>
            <button className="tl-x" onClick={() => setTextileModal(null)}>×</button>
            <div className="tl-img">
              {textileModal.imagen_url
                ? <img src={textileModal.imagen_url} alt={textileModal.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: textileModal.color_hex ?? 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 80, height: 80, background: textileModal.color_hex ?? 'var(--sand)', border: '4px solid rgba(255,255,255,.4)', borderRadius: '50%' }} />
                  </div>
              }
            </div>
            <div className="tl-body">
              {textileModal.categoria && <div className="tl-cat">{textileModal.categoria}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="tl-nm">{textileModal.nombre}</div>
                {textileModal.grado && <span className="grado-pill">{textileModal.grado}</span>}
              </div>
              {textileModal.descripcion && <p className="tl-ds">{textileModal.descripcion}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
