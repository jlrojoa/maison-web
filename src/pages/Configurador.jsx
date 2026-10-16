// src/pages/Configurador.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'
import { CategoryIcon, CategoryPhoto, hasCategoryPhoto } from './CategoryIcons'
import StickyConfigurador from './configurador/StickyConfigurador'
import ModularesConfigurador from './configurador/ModularesConfigurador'
import { useAgregarACotizacion } from './configurador/useAgregarACotizacion'
import './Configurador.css'

const GRADOS = ['AA', 'A', 'B', 'C']
const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

// Un color distinto por categoría, solo para diferenciar visualmente las tarjetas del
// selector — no es una decisión de producto, es puramente la paleta del picker. Se
// asigna por posición (orden), así que es estable mientras no se reordenen categorías.
const TIPO_COLORS = ['#C99A6B', '#8FA998', '#B08699', '#7C93AC', '#C4A15A', '#A08072', '#7FA6A0']
const colorForIndex = i => TIPO_COLORS[i % TIPO_COLORS.length]

export default function Configurador() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null

  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])

  const [tipoSel, setTipoSel] = useState(null)
  const [modeloSel, setModeloSel] = useState(null)
  const [productosLoading, setProductosLoading] = useState(false)

  const [configuraciones, setConfiguraciones] = useState([])
  const [medidaSel, setMedidaSel] = useState(null)

  const [telas, setTelas] = useState([])
  const [gradoSel, setGradoSel] = useState('AA')
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)

  // Fotos adicionales (galería) del modelo. "Imagen principal" (isometrico_url) es
  // la portada por defecto; las miniaturas de abajo permiten cambiar la foto grande
  // entre esa portada y el resto de la galería subida en el admin.
  const [galeria, setGaleria] = useState([])
  const [activeImgUrl, setActiveImgUrl] = useState(null)

  const [precios, setPrecios] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('categorias').select('*').eq('activo', true).order('orden')
      setCategorias(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!tipoSel) { setProductos([]); setProductosLoading(false); return }
    let ignore = false
    async function load() {
      setProductosLoading(true)
      const { data } = await supabase.from('productos').select('*')
        .eq('categoria_id', tipoSel.id).eq('activo', true).order('orden')
      if (!ignore) { setProductos(data ?? []); setProductosLoading(false) }
    }
    load()
    return () => { ignore = true }
  }, [tipoSel])

  useEffect(() => {
    if (!modeloSel) { setConfiguraciones([]); setTelas([]); setGradoSel('AA'); setTelaSel(null); setColorSel(null); setGaleria([]); setActiveImgUrl(null); return }
    let ignore = false
    async function load() {
      const [cfgRes, telasRes, imgRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', modeloSel.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
        supabase.from('producto_imagenes').select('*')
          .eq('producto_id', modeloSel.id).order('orden'),
      ])
      if (ignore) return
      setConfiguraciones(cfgRes.data ?? [])

      const telasConColores = (telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))
      setTelas(telasConColores)
      setGradoSel('AA')
      setTelaSel(telasConColores.find(t => t.grado === 'AA') ?? null)
      setColorSel(null)

      setGaleria(imgRes.data ?? [])
      setActiveImgUrl(modeloSel.isometrico_url ?? imgRes.data?.[0]?.url ?? null)
    }
    load()
    return () => { ignore = true }
  }, [modeloSel])

  useEffect(() => {
    if (!distribuidor || !modeloSel || !medidaSel) { setPrecios([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('producto_precios').select('grado, precio')
        .eq('producto_id', modeloSel.id).eq('configuracion_id', medidaSel.id)
      if (!ignore) setPrecios(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [distribuidor, modeloSel, medidaSel])

  const precioLookup = useMemo(() => {
    const row = precios.find(p => p.grado === telaSel?.grado)
    return row ? row.precio : null
  }, [precios, telaSel])

  // Mesas/Butacas: agregar el mueble a la "cotización en curso" (varios
  // muebles, ver lib/cotizacionCarrito.js y pages/CotizacionEnCurso.jsx).
  const cotiz = useAgregarACotizacion({
    distribuidor, categoriaSlug: tipoSel?.slug, producto: modeloSel,
    medidaSel, telaSel, colorSel, precioLookup,
  })

  const [searchParams] = useSearchParams()
  const params = useParams()
  const navigate = useNavigate()
  const [tipoPreloaded, setTipoPreloaded] = useState(false)

  // Cotización en curso → editar una línea (Mesas/Butacas): ?linea=ID trae la
  // medida/tela/color guardados, que se aplican una vez que cargan las
  // opciones del modelo.
  const aplicadoEdicionRef = useRef(false)
  useEffect(() => {
    if (aplicadoEdicionRef.current || !searchParams.get('linea')) return
    if (!modeloSel || configuraciones.length === 0 || telas.length === 0) return
    aplicadoEdicionRef.current = true
    const medida = configuraciones.find(c => c.nombre === searchParams.get('medida'))
    if (medida) setMedidaSel(medida)
    const tela = telas.find(t => t.nombre === searchParams.get('tela'))
    if (tela) {
      setGradoSel(tela.grado); setTelaSel(tela)
      setColorSel(tela.colores.find(c => c.nombre === searchParams.get('color')) ?? null)
    }
  }, [modeloSel, configuraciones, telas])
  const [modeloPreloadDone, setModeloPreloadDone] = useState(false)

  // Las 4 categorías con el layout nuevo (sticky + pasos colapsables) viven
  // en la URL (/configurador/:categoria/:productoSlug), no en useState local
  // — StickyConfigurador lee todo de useParams/useSearchParams. Modulares
  // tiene su propio layout (armado libre, piezas repetibles — no encaja en
  // el patrón de selección única de ninguna de las dos). Mesas/Butacas
  // siguen con el flujo legado de abajo, con su propio tipoSel/modeloSel en
  // memoria, sin tocar.
  const STICKY_CATEGORIA_SLUGS = ['camas', 'sofas', 'escuadras-l', 'chaise-lounge']
  const MODULARES_CATEGORIA_SLUGS = ['modulares']

  const selectTipo = (cat) => {
    if (STICKY_CATEGORIA_SLUGS.includes(cat.slug) || MODULARES_CATEGORIA_SLUGS.includes(cat.slug)) {
      navigate(`/configurador/${cat.slug}`); return
    }
    setTipoSel(cat)
    setModeloSel(null)
    setMedidaSel(null)
  }

  const selectModelo = (prod) => {
    setModeloSel(prod)
    setMedidaSel(null)
  }

  // tipoSel se resuelve del segmento de ruta /configurador/:categoria (o,
  // por compatibilidad con links viejos, de ?tipo=) y se resincroniza cada
  // vez que ese valor cambia — no solo una vez al montar. Esto es lo que
  // hace que, si el usuario entra a una categoría sticky y luego usa el
  // breadcrumb o el back del navegador para volver a /configurador (sin
  // segmento), el Paso 0 reaparezca solo, sin recargar la página.
  useEffect(() => {
    if (categorias.length === 0) return
    const slug = params.categoria ?? searchParams.get('tipo')
    const cat = slug ? categorias.find(c => c.slug === slug) ?? null : null
    setTipoSel(prev => (prev?.id === cat?.id ? prev : cat))
    if (!cat) setModeloSel(null)
    setTipoPreloaded(true)
  }, [categorias, params.categoria, searchParams])

  // Precarga de modelo (solo relevante para el flujo legado): una sola vez,
  // cuando productos del tipo precargado ya cargaron.
  useEffect(() => {
    if (!tipoPreloaded || modeloPreloadDone || productos.length === 0) return
    const modeloParam = searchParams.get('modelo')
    const prod = modeloParam ? productos.find(p => p.slug === modeloParam) : null
    if (prod) selectModelo(prod)
    setModeloPreloadDone(true)
  }, [tipoPreloaded, modeloPreloadDone, productos, searchParams])

  // Compatibilidad con links viejos (?tipo=camas&modelo=x, usados por
  // MiEspacio/ProductPage — fuera de alcance tocarlos en esta tarea):
  // si resolvieron a una categoría sticky por la querystring vieja, se
  // sube de categoría a la URL canónica por path una vez que ya sabemos
  // tipoSel/modeloSel.
  useEffect(() => {
    if (params.categoria) return // ya está en la forma canónica por path, nada que subir
    if (!searchParams.get('tipo')) return // /configurador sin querystring vieja (ej. "atrás" del navegador) — NO redirigir
    if (!modeloPreloadDone || !tipoSel) return
    if (!STICKY_CATEGORIA_SLUGS.includes(tipoSel.slug) && !MODULARES_CATEGORIA_SLUGS.includes(tipoSel.slug)) return
    navigate(`/configurador/${tipoSel.slug}${modeloSel ? '/' + modeloSel.slug : ''}`, { replace: true })
  }, [modeloPreloadDone, params.categoria, tipoSel, modeloSel, searchParams])

  const selectMedida = (cfg) => setMedidaSel(cfg)

  const selectGrado = (grado) => {
    setGradoSel(grado)
    setTelaSel(telas.find(t => t.grado === grado) ?? null)
    setColorSel(null)
  }

  const selectTela = (telaId) => {
    setTelaSel(telas.find(t => t.id === telaId) ?? null)
    setColorSel(null)
  }

  const selectColor = (color) => setColorSel(color)

  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

  const modeloActivo = !!tipoSel
  const medidaTelaActivo = !!modeloSel

  if (tipoSel && STICKY_CATEGORIA_SLUGS.includes(tipoSel.slug) && !productosLoading) {
    return (
      <div className="cfg-page">
        <Nav solid />
        <StickyConfigurador categoriaSlug={tipoSel.slug} categoriaNombre={tipoSel.nombre} productos={productos} distribuidor={distribuidor} />
      </div>
    )
  }

  if (tipoSel && MODULARES_CATEGORIA_SLUGS.includes(tipoSel.slug) && !productosLoading) {
    return (
      <div className="cfg-page">
        <Nav solid />
        <ModularesConfigurador categoriaNombre={tipoSel.nombre} productos={productos} distribuidor={distribuidor} />
      </div>
    )
  }

  return (
    <div className="cfg-page">
      <Nav solid />

      <div className="cfg-container">
        <h1 className="cfg-h1">Configura tu Sofá</h1>
        <p className="cfg-subtitle">Personaliza seleccionando tipo, modelo, medida y tela que mejor se adapte a tu espacio.</p>

        <div className="cfg-grid-2col">
          {/* LEFT */}
          <div>
            <div className={`cfg-carousel ${activeImgUrl ? 'cfg-has-img' : ''}`}>
              {activeImgUrl && <img src={activeImgUrl} alt={modeloSel?.nombre} />}
            </div>
            {(() => {
              const cover = modeloSel?.isometrico_url
                ? [{ id: 'cover', url: modeloSel.isometrico_url, alt: modeloSel.nombre }]
                : []
              const miniaturas = [...cover, ...galeria]
              if (miniaturas.length === 0) return null
              return (
                <div className="cfg-thumbnails">
                  {miniaturas.map(img => (
                    <button
                      key={img.id}
                      type="button"
                      className={`cfg-thumbnail ${activeImgUrl === img.url ? 'cfg-active' : ''}`}
                      onClick={() => setActiveImgUrl(img.url)}
                      style={{ padding: 0, cursor: 'pointer' }}
                    >
                      <img src={img.url} alt={img.alt || modeloSel?.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
                    </button>
                  ))}
                </div>
              )
            })()}
            {medidaSel && (
              <div>
                <div className="cfg-isometric-container">
                  <div className="cfg-isometric-image">
                    {medidaSel.isometrico_url
                      ? <img src={medidaSel.isometrico_url} alt={medidaSel.nombre} />
                      : 'Sin imagen isométrica'}
                  </div>
                </div>
                <p className="cfg-iso-caption">
                  {medidaSel.nombre}{medidaSel.dimensiones ? ` — ${medidaSel.dimensiones}` : ''}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* PASO 0 */}
            <div className="cfg-step">
              <div className="cfg-step-header">
                <div className="cfg-step-number">0.</div>
                <div className="cfg-step-title">¿Qué tipo buscas?</div>
              </div>
              <div className="cfg-options-grid">
                {categorias.map((cat, i) => (
                  <div
                    key={cat.id}
                    className={`cfg-option cfg-option-foto ${tipoSel?.id === cat.id ? 'cfg-active' : ''}`}
                    style={{ '--cfg-tipo-color': colorForIndex(i) }}
                    onClick={() => selectTipo(cat)}
                  >
                    {hasCategoryPhoto(cat.slug)
                      ? <div className="cfg-option-photo"><CategoryPhoto slug={cat.slug} /></div>
                      : <div className="cfg-option-photo"><div className="cfg-option-icon" style={{ marginBottom: 0 }}><CategoryIcon slug={cat.slug} /></div></div>}
                    <div className="cfg-option-label">{cat.nombre}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PASO 1 */}
            <div className={`cfg-step ${!modeloActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">1.</div>
                <div className="cfg-step-title">Selecciona el modelo</div>
              </div>
              {modeloActivo && !productosLoading && productos.length === 0 ? (
                <div className="cfg-message">
                  Aún no hay modelos cargados en «{tipoSel?.nombre}». Se agregan desde el panel de administración → Productos.
                </div>
              ) : (
                <div className="cfg-options-grid">
                  {productos.map(prod => (
                    <div
                      key={prod.id}
                      className={`cfg-option ${modeloSel?.id === prod.id ? 'cfg-active' : ''}`}
                      onClick={() => modeloActivo && selectModelo(prod)}
                    >
                      <div className="cfg-option-thumb">
                        {prod.isometrico_url && <img src={prod.isometrico_url} alt={prod.nombre} />}
                      </div>
                      <div className="cfg-option-label">{prod.nombre}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PASO 2 */}
            <div className={`cfg-step ${!medidaTelaActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">2.</div>
                <div className="cfg-step-title">Selecciona la medida</div>
              </div>
              <div
                className="cfg-options-grid"
                style={{ gridTemplateColumns: `repeat(${configuraciones.length || 1}, 1fr)` }}
              >
                {configuraciones.map(cfg => (
                  <div
                    key={cfg.id}
                    className={`cfg-option ${medidaSel?.id === cfg.id ? 'cfg-active' : ''}`}
                    onClick={() => medidaTelaActivo && selectMedida(cfg)}
                  >
                    <div className="cfg-option-dim">{cfg.nombre}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PASO 3 */}
            <div className={`cfg-step ${!medidaTelaActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">3.</div>
                <div className="cfg-step-title">Selecciona la tela</div>
              </div>

              <div className="cfg-tabs">
                {GRADOS.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`cfg-tab ${gradoSel === g ? 'cfg-active' : ''}`}
                    onClick={() => medidaTelaActivo && selectGrado(g)}
                  >
                    Categoría {g}
                  </button>
                ))}
              </div>

              <label className="cfg-dropdown-label">Seleccionar catálogo</label>
              <select
                className="cfg-dropdown"
                disabled={!medidaTelaActivo}
                value={telaSel?.id ?? ''}
                onChange={e => selectTela(e.target.value)}
              >
                <option value="">Elige un catálogo</option>
                {telasDelGrado.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>
                ))}
              </select>

              <div className="cfg-colors-grid">
                {(telaSel?.colores ?? []).map(color => (
                  <button
                    key={color.id}
                    type="button"
                    className={`cfg-color-swatch ${colorSel?.id === color.id ? 'cfg-active' : ''}`}
                    style={{ background: color.codigo_hex || '#E2E8F0' }}
                    title={color.nombre}
                    onClick={() => selectColor(color)}
                  />
                ))}
              </div>

              {colorSel && (
                <div className="cfg-specs">
                  <div className="cfg-specs-header">
                    <div className="cfg-specs-swatch" style={{ background: colorSel.codigo_hex || '#E2E8F0' }} />
                    <div>
                      <h4 className="cfg-specs-name">{telaSel?.nombre} · {colorSel.nombre}</h4>
                      <p className="cfg-specs-cat">Categoría {telaSel?.grado}</p>
                    </div>
                  </div>
                  <div className="cfg-specs-list">
                    {colorSel.composicion && (
                      <div className="cfg-specs-row"><span>Composición</span><span>{colorSel.composicion}</span></div>
                    )}
                    {colorSel.martindale != null && (
                      <div className="cfg-specs-row"><span>Martindale</span><span>{colorSel.martindale}</span></div>
                    )}
                    {colorSel.resistencia_luz && (
                      <div className="cfg-specs-row"><span>Resistencia a la luz</span><span>{colorSel.resistencia_luz}</span></div>
                    )}
                    {colorSel.pilling && (
                      <div className="cfg-specs-row"><span>Pilling</span><span>{colorSel.pilling}</span></div>
                    )}
                    <div className="cfg-specs-row"><span>Fácil limpieza</span><span>{colorSel.facil_limpieza ? 'Sí' : 'No'}</span></div>
                    <div className="cfg-specs-row"><span>Repelente a líquidos</span><span>{colorSel.repelente_liquidos ? 'Sí' : 'No'}</span></div>
                    {colorSel.pais_origen && (
                      <div className="cfg-specs-row"><span>País de origen</span><span>{colorSel.pais_origen}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PASO 4 */}
            <div className="cfg-step">
              <div className="cfg-step-header">
                <div className="cfg-step-number">4.</div>
                <div className="cfg-step-title">Resumen de tu selección</div>
              </div>
              <div className="cfg-summary">
                <div className="cfg-summary-label">Tu Configuración</div>
                <div className="cfg-summary-row"><span>Tipo</span><span>{tipoSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row"><span>Modelo</span><span>{modeloSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row"><span>Medida</span><span>{medidaSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row">
                  <span>Tela</span>
                  <span>
                    {telaSel && colorSel ? (
                      <>
                        {telaSel.nombre} ({telaSel.grado}) · {colorSel.nombre}
                        <span className="cfg-tela-swatch" style={{ background: colorSel.codigo_hex || '#E2E8F0' }} />
                      </>
                    ) : telaSel ? `${telaSel.nombre} (${telaSel.grado})` : '—'}
                  </span>
                </div>
                {distribuidor && (
                  <div className="cfg-summary-price-row">
                    <span>Precio</span>
                    <span>{precioLookup != null ? fmt(precioLookup) : 'No disponible'}</span>
                  </div>
                )}
              </div>

              {!distribuidor && (
                <div className="cfg-message">🔒 Inicia sesión para ver precios como distribuidor</div>
              )}

              <div className="cfg-buttons">
                {cotiz.aviso && <div className="cfg-message" role="status">✓ Agregado a tu cotización</div>}
                {cotiz.editandoLinea ? (
                  <button type="button" className="cfg-btn cfg-btn-primary" disabled={!cotiz.puede} onClick={cotiz.actualizar}>Actualizar en la cotización</button>
                ) : (
                  <button type="button" className="cfg-btn cfg-btn-primary" disabled={!cotiz.puede} onClick={cotiz.agregar}>Agregar a la cotización</button>
                )}
                <button type="button" className="cfg-btn cfg-btn-secondary" onClick={cotiz.verCotizacion}>Ver cotización{cotiz.n > 0 ? ` (${cotiz.n})` : ''}</button>
                {cotiz.n > 0 && !cotiz.editandoLinea && (
                  <button type="button" className="cfg-btn cfg-btn-secondary" onClick={cotiz.elegirOtro}>+ Elegir otro mueble</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
