// src/pages/Configurador.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import Nav from '../components/Nav'
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
    if (!modeloSel) { setConfiguraciones([]); setTelas([]); setGradoSel('AA'); setTelaSel(null); setColorSel(null); return }
    let ignore = false
    async function load() {
      const [cfgRes, telasRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', modeloSel.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
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

  // Guardar en Mi Espacio / Crear Cotización — usa las tablas cotizaciones/cotizacion_items
  // y la función emitir_cotizacion() que ya existen en Supabase (backend construido de
  // antemano, ver ESTADO-DEL-PROYECTO.md). El distribuidor fija su propio margen y los
  // datos de su cliente final; ese documento es el que usa para venderle.
  const [cotizModo, setCotizModo] = useState(null) // null | 'borrador' | 'emitir'
  const [cotizForm, setCotizForm] = useState({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
  const [cotizSaving, setCotizSaving] = useState(false)
  const [cotizResultado, setCotizResultado] = useState(null)

  const puedeGuardar = !!(distribuidor && modeloSel && medidaSel && telaSel && colorSel && precioLookup != null)

  const abrirCotizModal = (modo) => {
    if (!puedeGuardar) return
    setCotizForm({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
    setCotizResultado(null)
    setCotizModo(modo)
  }

  const confirmarCotizacion = async () => {
    if (!cotizForm.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setCotizSaving(true)
    try {
      const markup = parseFloat(cotizForm.markup_pct) || 0
      const precioCliente = Math.round(precioLookup * (1 + markup / 100))

      const { data: cot, error: cotErr } = await supabase.from('cotizaciones').insert({
        distribuidor_email: distribuidor.email,
        nombre_proyecto: `${modeloSel.nombre} · ${medidaSel.nombre}`,
        status: 'borrador',
        total: precioCliente,
        markup_pct: markup,
        cliente_nombre: cotizForm.cliente_nombre.trim(),
        cliente_email: cotizForm.cliente_email.trim() || null,
        cliente_telefono: cotizForm.cliente_telefono.trim() || null,
      }).select().single()
      if (cotErr) throw cotErr

      const { error: itemErr } = await supabase.from('cotizacion_items').insert({
        cotizacion_id: cot.id,
        producto_id: modeloSel.id,
        producto_nombre: modeloSel.nombre,
        imagen_url: modeloSel.isometrico_url ?? null,
        configuracion_nombre: medidaSel.nombre,
        medidas: medidaSel.dimensiones ?? null,
        textil_nombre: `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`,
        precio_unitario: precioLookup,
        precio_cliente: precioCliente,
        cantidad: 1,
      })
      if (itemErr) throw itemErr

      // El folio (BR-xxxx) ya se asignó solo al insertar (columna con secuencia
      // automática). emitir_cotizacion() solo cambia el estado y fija la vigencia de 15 días.
      if (cotizModo === 'emitir') {
        const { error: emitErr } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
        if (emitErr) throw emitErr
      }

      setCotizResultado({ folio: cot.folio, modo: cotizModo })
    } catch (err) {
      alert(`Error al guardar la cotización: ${err.message}`)
    } finally {
      setCotizSaving(false)
    }
  }

  const [searchParams] = useSearchParams()
  const [tipoPreloaded, setTipoPreloaded] = useState(false)
  const [modeloPreloadDone, setModeloPreloadDone] = useState(false)

  const selectTipo = (cat) => {
    setTipoSel(cat)
    setModeloSel(null)
    setMedidaSel(null)
  }

  const selectModelo = (prod) => {
    setModeloSel(prod)
    setMedidaSel(null)
  }

  // Precarga de tipo: una sola vez, cuando categorias ya cargó
  useEffect(() => {
    if (tipoPreloaded || categorias.length === 0) return
    const tipoParam = searchParams.get('tipo')
    const cat = tipoParam ? categorias.find(c => c.slug === tipoParam) : null
    if (cat) selectTipo(cat)
    setTipoPreloaded(true)
  }, [categorias, tipoPreloaded, searchParams])

  // Precarga de modelo: una sola vez, cuando productos del tipo precargado ya cargaron
  useEffect(() => {
    if (!tipoPreloaded || modeloPreloadDone || productos.length === 0) return
    const modeloParam = searchParams.get('modelo')
    const prod = modeloParam ? productos.find(p => p.slug === modeloParam) : null
    if (prod) selectModelo(prod)
    setModeloPreloadDone(true)
  }, [tipoPreloaded, modeloPreloadDone, productos, searchParams])

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

  return (
    <div className="cfg-page">
      <Nav solid />

      <div className="cfg-container">
        <h1 className="cfg-h1">Configura tu Sofá</h1>
        <p className="cfg-subtitle">Personaliza seleccionando tipo, modelo, medida y tela que mejor se adapte a tu espacio.</p>

        <div className="cfg-grid-2col">
          {/* LEFT */}
          <div>
            <div className="cfg-carousel">
              {modeloSel?.isometrico_url && <img src={modeloSel.isometrico_url} alt={modeloSel.nombre} />}
            </div>
            <div className="cfg-thumbnails">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="cfg-thumbnail" />)}
            </div>
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
                    className={`cfg-option ${tipoSel?.id === cat.id ? 'cfg-active' : ''}`}
                    style={{ '--cfg-tipo-color': colorForIndex(i) }}
                    onClick={() => selectTipo(cat)}
                  >
                    <div className="cfg-option-icon" style={{ background: colorForIndex(i) }}>{cat.nombre?.[0]}</div>
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
                <button type="button" className="cfg-btn cfg-btn-primary" disabled={!puedeGuardar} onClick={() => abrirCotizModal('emitir')}>Crear Cotización</button>
                <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!puedeGuardar} onClick={() => abrirCotizModal('borrador')}>Guardar en mi espacio</button>
                <button type="button" className="cfg-btn cfg-btn-secondary" disabled>Enviar al carrito</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {cotizModo && (
        <div className="cfg-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !cotizSaving) setCotizModo(null) }}>
          <div className="cfg-modal-box">
            {cotizResultado ? (
              <>
                <h3 className="cfg-modal-title">
                  {cotizResultado.modo === 'emitir' ? '¡Cotización emitida!' : 'Guardada en Mi Espacio'}
                </h3>
                <p className="cfg-modal-text">
                  {cotizResultado.folio
                    ? <>Folio <b>BR-{cotizResultado.folio}</b>. Vigente 15 días. Puedes verla, descargarla y compartirla desde Mi Espacio.</>
                    : <>Quedó guardada como borrador. Termínala y emítela cuando quieras desde Mi Espacio.</>}
                </p>
                <div className="cfg-buttons">
                  <a href="/mi-espacio" className="cfg-btn cfg-btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>Ir a Mi Espacio</a>
                  <button type="button" className="cfg-btn cfg-btn-secondary" onClick={() => setCotizModo(null)}>Seguir configurando</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="cfg-modal-title">{cotizModo === 'emitir' ? 'Crear cotización' : 'Guardar borrador'}</h3>
                <p className="cfg-modal-text">Este documento es el que le compartes a tu cliente final.</p>
                <label className="cfg-dropdown-label">Nombre del cliente *</label>
                <input className="cfg-dropdown" value={cotizForm.cliente_nombre} onChange={e => setCotizForm(f => ({ ...f, cliente_nombre: e.target.value }))} />
                <label className="cfg-dropdown-label">Email del cliente</label>
                <input className="cfg-dropdown" value={cotizForm.cliente_email} onChange={e => setCotizForm(f => ({ ...f, cliente_email: e.target.value }))} />
                <label className="cfg-dropdown-label">Teléfono del cliente</label>
                <input className="cfg-dropdown" value={cotizForm.cliente_telefono} onChange={e => setCotizForm(f => ({ ...f, cliente_telefono: e.target.value }))} />
                <label className="cfg-dropdown-label">Tu margen (%)</label>
                <input className="cfg-dropdown" type="number" value={cotizForm.markup_pct} onChange={e => setCotizForm(f => ({ ...f, markup_pct: e.target.value }))} />
                <div className="cfg-summary-price-row" style={{ marginBottom: 16 }}>
                  <span>Precio para tu cliente</span>
                  <span>{fmt(Math.round(precioLookup * (1 + (parseFloat(cotizForm.markup_pct) || 0) / 100)))}</span>
                </div>
                <div className="cfg-buttons">
                  <button type="button" className="cfg-btn cfg-btn-primary" disabled={cotizSaving} onClick={confirmarCotizacion}>
                    {cotizSaving ? 'Guardando…' : cotizModo === 'emitir' ? 'Confirmar y emitir' : 'Guardar borrador'}
                  </button>
                  <button type="button" className="cfg-btn cfg-btn-secondary" disabled={cotizSaving} onClick={() => setCotizModo(null)}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
