import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'

const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function ProductDetail({ product, onBack }) {
  const [detail, setDetail] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [selectedGrado, setSelectedGrado] = useState(null)
  const [selectedFamilia, setSelectedFamilia] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [openAccordion, setOpenAccordion] = useState(null)
  const [quoteStatus, setQuoteStatus] = useState(null)

  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null

  useEffect(() => {
    if (!product?.id) return

    // Reset all state on product change
    setDetail(null)
    setActiveImg(0)
    setSelectedConfig(null)
    setSelectedGrado(null)
    setSelectedFamilia(null)
    setSelectedColor(null)
    setOpenAccordion(null)
    setQuoteStatus(null)

    async function loadDetail() {
      const [imgRes, cfgRes, texAsignadoRes] = await Promise.all([
        supabase.from('producto_imagenes').select('*').eq('producto_id', product.id).order('orden'),
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', product.id).eq('activo', true).order('orden'),
        supabase.from('producto_telas').select('tela_id').eq('producto_id', product.id),
      ])

      // Determine which telas apply
      let telaIds = (texAsignadoRes.data ?? []).map(r => r.tela_id)
      let telasQuery = supabase.from('telas').select('*, colores:tela_colores(*)')
        .eq('activo', true).order('grado').order('orden')
      if (telaIds.length > 0) telasQuery = telasQuery.in('id', telaIds)
      const { data: telasData } = await telasQuery

      // Filter colores to activo only
      const telas = (telasData ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))

      // For distribuidor: load price matrix
      let precioMatrix = {}
      if (distribuidor) {
        const { data: precios } = await supabase.from('producto_precios')
          .select('configuracion_id, grado, precio')
          .eq('producto_id', product.id)
        ;(precios ?? []).forEach(r => {
          if (!precioMatrix[r.configuracion_id]) precioMatrix[r.configuracion_id] = {}
          precioMatrix[r.configuracion_id][r.grado] = r.precio
        })
      }

      setDetail({
        imagenes: imgRes.data ?? [],
        configuraciones: cfgRes.data ?? [],
        telas,
        precioMatrix,
      })

      // Preselect first configuracion
      if (cfgRes.data?.length > 0) setSelectedConfig(cfgRes.data[0])
    }

    loadDetail()
  }, [product?.id, distribuidor])

  if (!product) return null

  const imagenes = detail?.imagenes ?? (product.imagenes ?? [])
  const activeImage = imagenes[activeImg]

  // Price logic (derived)
  const grado = selectedColor
    ? detail?.telas?.find(t => t.id === selectedColor.tela_id)?.grado ?? null
    : null
  const precioMatrix = detail?.precioMatrix ?? {}

  const livePrice = distribuidor && selectedConfig && grado
    ? precioMatrix[selectedConfig.id]?.[grado] ?? null
    : null

  const lowestPrice = distribuidor && selectedConfig
    ? Object.values(precioMatrix[selectedConfig.id] ?? {}).reduce(
        (min, v) => (min === null || v < min) ? v : min,
        null
      )
    : null

  const requestQuote = async () => {
    setQuoteStatus('loading')
    const telaFamilia = selectedColor
      ? detail?.telas?.find(t => t.id === selectedColor.tela_id)
      : null
    const { error } = await supabase.from('leads').insert({
      nombre: 'Consulta web',
      email: 'pendiente@maison.mx',
      producto_interes: product.nombre,
      mensaje: `Interés en ${product.nombre}${selectedConfig ? ` · Tamaño: ${selectedConfig.nombre}` : ''}${telaFamilia ? ` · Tela: ${telaFamilia.nombre}` : ''}${selectedColor ? ` · Color: ${selectedColor.nombre}` : ''}`,
    })
    setQuoteStatus(error ? 'error' : 'ok')
  }

  // Accordion items
  const accordions = [
    selectedConfig?.dimensiones
      ? { title: 'Dimensiones', content: selectedConfig.dimensiones }
      : null,
    product.descripcion
      ? { title: 'Materiales', content: product.descripcion }
      : null,
  ].filter(Boolean)

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
        {/* Gallery — Nordic vertical thumbnails layout */}
        <div className="pgal" style={{ flexDirection: 'row', gap: 0 }}>
          {/* Vertical thumbnail strip */}
          {imagenes.length > 1 && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '8px 8px 8px 0', width: 72, overflowY: 'auto', flexShrink: 0,
            }}>
              {imagenes.map((img, i) => (
                <div
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: 64, height: 64, flexShrink: 0,
                    border: `2px solid ${i === activeImg ? 'var(--charcoal)' : 'transparent'}`,
                    cursor: 'pointer', overflow: 'hidden',
                    opacity: i === activeImg ? 1 : 0.55,
                    transition: 'all .25s',
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="gm" style={{ flex: 1 }}>
            <div className="gm-bg">
              {activeImage
                ? <img src={activeImage.url} alt={activeImage.alt || product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="gm-lbl">{product.nombre?.[0]}</span>
              }
            </div>
          </div>
        </div>

        {/* Info column */}
        <div className="pd">
          <div className="p-tag">{product.categoria?.nombre ?? 'Colección'}</div>
          <h1 className="p-nm">{product.nombre}</h1>
          {product.subtitulo && <div className="p-sb">{product.subtitulo}</div>}

          {/* Price line */}
          <div className="p-pr">
            <span className="p-price">
              {distribuidor
                ? selectedColor
                  ? livePrice != null
                    ? fmt(livePrice)
                    : 'Combinación no disponible'
                  : lowestPrice != null
                    ? `desde ${fmt(lowestPrice)}`
                    : 'Precio a consultar'
                : 'Precio a consultar'}
            </span>
            {distribuidor && livePrice != null && (
              <span className="p-note">IVA incluido</span>
            )}
          </div>

          {product.descripcion && <p className="p-desc">{product.descripcion}</p>}

          {/* PASO 1 — TAMAÑO */}
          {detail && (detail.configuraciones ?? []).length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--charcoal)', marginBottom: 14 }}>
                Paso 1 — Tamaño
                {selectedConfig && (
                  <span style={{ marginLeft: 12, fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--stone)' }}>
                    {selectedConfig.nombre}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(detail.configuraciones ?? []).map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => setSelectedConfig(cfg)}
                    style={{
                      padding: '12px 18px',
                      border: `1px solid ${selectedConfig?.id === cfg.id ? 'var(--charcoal)' : 'var(--sand)'}`,
                      background: selectedConfig?.id === cfg.id ? 'var(--charcoal)' : 'transparent',
                      color: selectedConfig?.id === cfg.id ? '#fff' : 'var(--charcoal)',
                      fontFamily: 'var(--sans)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 400 }}>{cfg.nombre}</div>
                    {cfg.dimensiones && (
                      <div style={{ fontSize: 10, color: selectedConfig?.id === cfg.id ? 'rgba(255,255,255,.6)' : 'var(--taupe)', marginTop: 3 }}>
                        {cfg.dimensiones}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2 — TELA */}
          {detail && (detail.telas ?? []).length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--charcoal)', marginBottom: 14 }}>
                Paso 2 — Tela
              </div>

              {selectedColor ? (
                /* SELECTED SUMMARY */
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--charcoal)', background: 'var(--warm)' }}>
                  {selectedColor.imagen_url
                    ? <img src={selectedColor.imagen_url} alt={selectedColor.nombre} style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, background: 'var(--sand)', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>
                      {(detail.telas.find(t => t.id === selectedColor.tela_id)?.nombre ?? '')} · {selectedColor.nombre}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 3 }}>
                      Grado {detail.telas.find(t => t.id === selectedColor.tela_id)?.grado}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedColor(null); setSelectedFamilia(null) }}
                    style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.1em', textTransform: 'uppercase' }}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* GRADO TABS + CONTENT */
                (() => {
                  const gradosDisponibles = [...new Set((detail.telas ?? []).map(t => t.grado))].sort()
                  const activeGrado = selectedGrado ?? gradosDisponibles[0] ?? null
                  const telasDe = (detail.telas ?? []).filter(t => t.grado === activeGrado)

                  return (
                    <div>
                      {/* Grado tabs */}
                      <div style={{ display: 'flex', borderBottom: '1px solid var(--sand)', marginBottom: 16 }}>
                        {gradosDisponibles.map(g => (
                          <button
                            key={g}
                            onClick={() => { setSelectedGrado(g); setSelectedFamilia(null) }}
                            style={{
                              padding: '8px 18px',
                              background: 'none',
                              border: 'none',
                              borderBottom: activeGrado === g ? '2px solid var(--charcoal)' : '2px solid transparent',
                              marginBottom: -1,
                              cursor: 'pointer',
                              fontFamily: 'var(--sans)',
                              fontSize: 10,
                              letterSpacing: '.18em',
                              color: activeGrado === g ? 'var(--charcoal)' : 'var(--taupe)',
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      {/* Familia cards for active grado */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {telasDe.map(tela => (
                          <div key={tela.id}>
                            {/* Familia header — click to expand/collapse */}
                            <div
                              onClick={() => setSelectedFamilia(prev => prev?.id === tela.id ? null : tela)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 14px',
                                border: '1px solid var(--sand)',
                                cursor: 'pointer',
                                background: selectedFamilia?.id === tela.id ? 'var(--cream)' : '#fff',
                                transition: 'background .2s',
                              }}
                            >
                              {/* First color swatch as preview */}
                              {tela.colores[0]?.imagen_url
                                ? <img src={tela.colores[0].imagen_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', flexShrink: 0 }} />
                                : <div style={{ width: 32, height: 32, background: 'var(--sand)', flexShrink: 0 }} />
                              }
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>{tela.nombre}</div>
                                <div style={{ fontSize: 10, color: 'var(--taupe)', marginTop: 2 }}>{tela.colores.length} colores</div>
                              </div>
                              <span style={{ color: 'var(--taupe)', fontSize: 16 }}>
                                {selectedFamilia?.id === tela.id ? '−' : '+'}
                              </span>
                            </div>

                            {/* Color swatches — shown when familia is expanded */}
                            {selectedFamilia?.id === tela.id && (
                              <div style={{ padding: '16px 14px', border: '1px solid var(--sand)', borderTop: 'none', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {tela.colores.map(color => (
                                  <button
                                    key={color.id}
                                    title={color.nombre}
                                    onClick={() => setSelectedColor({ ...color, tela_id: tela.id })}
                                    style={{
                                      width: 44,
                                      height: 44,
                                      border: selectedColor?.id === color.id ? '2px solid var(--charcoal)' : '2px solid transparent',
                                      padding: 0,
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      background: 'var(--sand)',
                                    }}
                                  >
                                    {color.imagen_url && (
                                      <img src={color.imagen_url} alt={color.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          )}

          {/* CTAs */}
          {distribuidor ? (
            <>
              <button className="bcot" disabled style={{ opacity: 0.5, cursor: 'not-allowed', marginBottom: 11 }}>
                Agregar a Cotización
              </button>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--taupe)', textAlign: 'center', marginBottom: 34, letterSpacing: '.1em' }}>
                Función disponible próximamente
              </p>
            </>
          ) : (
            <>
              <button
                className="bcot"
                onClick={requestQuote}
                disabled={quoteStatus === 'loading' || quoteStatus === 'ok'}
                style={{ marginBottom: 11 }}
              >
                {quoteStatus === 'loading'
                  ? 'Enviando…'
                  : quoteStatus === 'ok'
                  ? '✓ Solicitud enviada'
                  : 'Solicitar cotización'}
              </button>
              <button className="bkit" onClick={onBack}>✦ Solicitar Kit de Muestras</button>
              {quoteStatus === 'error' && (
                <p style={{ color: '#c0392b', fontSize: 12, fontFamily: 'var(--sans)', marginBottom: 16 }}>
                  Error al enviar.
                </p>
              )}
            </>
          )}

          {/* Accordion */}
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
