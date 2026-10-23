// src/admin/cotizaciones/LineaCard.jsx
//
// Una línea de la cotización: un mueble del catálogo (modelo, medida, tela y
// color; precio tomado del catálogo pero editable) o un concepto libre. Cada
// línea lleva su foto, su isométrico con medidas, la tela en recuadro y un
// campo para requisitos especiales del cliente.
import { useEffect, useMemo, useRef, useState } from 'react'
import { precioDeLista, useDetalleProducto } from './useCatalogo'
import { uploadProductoImage } from '../catalogo/ProductoImageUpload'
import { fmtMx, medidasDeTexto, num, precioNeto, totalLinea } from './calc'

const Campo = ({ label, children, hint, style }) => (
  <div className="adm-field" style={{ marginBottom: 10, ...style }}>
    <label className="adm-label">{label}</label>
    {children}
    {hint ? <div className="adm-form-hint">{hint}</div> : null}
  </div>
)

function SubirImagen({ onUrl, disabled, texto = 'Subir otra imagen' }) {
  const ref = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const subir = async (file) => {
    if (!file) return
    setSubiendo(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      onUrl(await uploadProductoImage(file, `cotizaciones/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`))
    } catch (err) { alert(`No se pudo subir la imagen: ${err.message}`) } finally { setSubiendo(false); if (ref.current) ref.current.value = '' }
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={e => subir(e.target.files?.[0])} />
      <button type="button" className="adm-btn-sm" disabled={disabled || subiendo} onClick={() => ref.current?.click()}>{subiendo ? 'Subiendo…' : texto}</button>
    </>
  )
}

export default function LineaCard({ linea: l, index, total, cat, disabled, onChange, onDelete, onDuplicate, onMove }) {
  const det = useDetalleProducto(cat, l.es_libre ? null : l.producto_id)
  const producto = useMemo(() => cat.productos.find(p => p.id === l.producto_id), [cat.productos, l.producto_id])
  const [catFiltro, setCatFiltro] = useState(null)
  const categorias = useMemo(() => [...new Set(cat.productos.map(p => p.categoria?.nombre).filter(Boolean))].sort(), [cat.productos])
  const catActual = catFiltro ?? producto?.categoria?.nombre ?? ''
  const productosVisibles = cat.productos.filter(p => !catActual || p.categoria?.nombre === catActual)
  const tela = cat.telas.find(t => t.nombre === l.tela_catalogo && t.grado === l.tela_grado)
  const colorSel = tela?.colores.find(c => c.nombre === l.tela_color)

  // Con las medidas ya cargadas: recupera el id de la medida de una línea guardada (sin tocar sus precios ni fotos)
  // o, en una línea nueva, elige la primera medida.
  useEffect(() => {
    if (!det || l.es_libre || !l.producto_id || l.configuracion_id || det.configuraciones.length === 0) return
    const guardada = det.configuraciones.find(c => c.nombre === l.configuracion_nombre)
    if (guardada) onChange({ configuracion_id: guardada.id, precio_lista: precioDeLista(det, guardada.id, l.tela_grado) ?? l.precio_lista })
    else elegirMedida(det.configuraciones[0])
  }, [det]) // eslint-disable-line react-hooks/exhaustive-deps

  const conPrecio = (patch, cfgId = l.configuracion_id, grado = l.tela_grado) => {
    const lista = precioDeLista(det, cfgId, grado)
    patch.precio_lista = lista ?? ''
    // Cambiar medida o tela trae el precio de lista nuevo; si no hay precio en el catálogo se conserva el que está.
    if (lista != null) { patch.precio = lista; patch.precio_manual = false }
    return patch
  }

  const elegirProducto = (id) => {
    const p = cat.productos.find(x => x.id === id)
    if (!p) return
    // Como en el configurador: si aún no hay tela, arranca con la primera de la categoría más alta.
    const t0 = l.tela_catalogo ? null : ['AA', 'A', 'B', 'C'].map(g => cat.telas.find(t => t.grado === g && t.colores.length)).find(Boolean)
    onChange({
      ...(t0 ? { tela_catalogo: t0.nombre, tela_grado: t0.grado, tela_color: t0.colores[0].nombre } : {}),
      producto_id: p.id, producto_nombre: p.nombre, configuracion_id: null, configuracion_nombre: '',
      imagen_url: p.imagen_portada_url || p.isometrico_url || null, isometrico_url: p.isometrico_url || null,
      medidas_cm: { ancho: '', fondo: '', alto: '' }, precio_lista: '', precio: '', precio_manual: false,
    })
  }
  const elegirMedida = (cfg) => {
    const m = medidasDeTexto(cfg.dimensiones)
    onChange(conPrecio({
      configuracion_id: cfg.id, configuracion_nombre: cfg.nombre, isometrico_url: cfg.isometrico_url || producto?.isometrico_url || l.isometrico_url,
      medidas_cm: m.ancho || m.fondo || m.alto ? m : l.medidas_cm,
    }, cfg.id))
  }
  const elegirTela = (t, colorNombre) => {
    const c = t.colores.find(x => x.nombre === colorNombre) ?? t.colores[0]
    onChange(conPrecio({ tela_catalogo: t.nombre, tela_grado: t.grado, tela_color: c?.nombre ?? '' }, l.configuracion_id, t.grado))
  }
  const setMedida = (k, v) => onChange({ medidas_cm: { ...l.medidas_cm, [k]: v } })
  const galeria = (det?.imagenes ?? []).slice(0, 12)
  const fotoEstilo = { backgroundImage: l.imagen_url ? `url(${l.imagen_url})` : 'none' }

  return (
    <div className="cz-linea">
      <div className="cz-linea-head">
        <div className="cz-linea-num">{index + 1}</div>
        <div className="cz-linea-titulo">{l.es_libre ? 'Concepto libre' : (l.producto_nombre || 'Mueble sin elegir')}{!l.es_libre && l.configuracion_nombre ? ` · ${l.configuracion_nombre}` : ''}</div>
        <div className="cz-linea-total">{fmtMx(totalLinea(l))}</div>
        {!disabled && (
          <div className="cz-linea-acciones">
            <button type="button" className="adm-icon-btn" title="Subir" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
            <button type="button" className="adm-icon-btn" title="Bajar" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
            <button type="button" className="adm-icon-btn" title="Duplicar línea" onClick={onDuplicate}>⧉</button>
            <button type="button" className="adm-icon-btn" title="Quitar línea" onClick={onDelete}>✕</button>
          </div>
        )}
      </div>

      <fieldset disabled={disabled} className="cz-fieldset">
        {l.es_libre ? (
          <div className="adm-field-row">
            <Campo label="Concepto"><input className="adm-input" style={{ width: '100%' }} value={l.producto_nombre} onChange={e => onChange({ producto_nombre: e.target.value })} placeholder="Ej. Flete, instalación, mueble a la medida…" /></Campo>
            <Campo label="Descripción"><input className="adm-input" style={{ width: '100%' }} value={l.configuracion_nombre} onChange={e => onChange({ configuracion_nombre: e.target.value })} /></Campo>
          </div>
        ) : (
          <>
            <div className="adm-field-row">
              <Campo label="Categoría">
                <select className="adm-select" style={{ width: '100%', minWidth: 0 }} value={catActual} onChange={e => setCatFiltro(e.target.value)}>
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Producto">
                <select className="adm-select" style={{ width: '100%', minWidth: 0 }} value={l.producto_id ?? ''} onChange={e => elegirProducto(e.target.value)}>
                  <option value="">Elige un producto…</option>
                  {productosVisibles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Medida">
                <select className="adm-select" style={{ width: '100%', minWidth: 0 }} value={l.configuracion_id ?? ''} disabled={!det || det.configuraciones.length === 0}
                  onChange={e => { const c = det.configuraciones.find(x => x.id === e.target.value); if (c) elegirMedida(c) }}>
                  {!l.configuracion_id && <option value="">{l.configuracion_nombre || (det ? 'Sin medidas' : '—')}</option>}
                  {(det?.configuraciones ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}{c.dimensiones ? ` · ${c.dimensiones}` : ''}</option>)}
                </select>
              </Campo>
            </div>

            <div className="adm-field-row">
              <Campo label="Tela">
                <select className="adm-select" style={{ width: '100%', minWidth: 0 }} value={tela?.id ?? ''} onChange={e => {
                  const t = cat.telas.find(x => x.id === e.target.value)
                  if (t) elegirTela(t); else onChange({ tela_catalogo: '', tela_grado: '', tela_color: '', precio_lista: '' })
                }}>
                  <option value="">{!tela && l.tela_catalogo ? `${l.tela_catalogo} (${l.tela_grado})` : 'Sin tela'}</option>
                  {['AA', 'A', 'B', 'C'].map(g => cat.telas.some(t => t.grado === g) && (
                    <optgroup key={g} label={`Categoría ${g}`}>{cat.telas.filter(t => t.grado === g).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</optgroup>
                  ))}
                </select>
              </Campo>
              <Campo label="Color" style={{ flex: 2 }}>
                <div className="cz-colores">
                  {(tela?.colores ?? []).map(c => (
                    <button type="button" key={c.id} title={c.nombre} className={`cz-color ${c.nombre === l.tela_color ? 'cz-on' : ''}`}
                      style={c.imagen_url ? { backgroundImage: `url(${c.imagen_url})` } : { background: c.codigo_hex || '#eee' }} onClick={() => elegirTela(tela, c.nombre)} />
                  ))}
                  {!tela && <span className="adm-form-hint">Elige una tela para ver sus colores.</span>}
                </div>
                {l.tela_color ? <div className="adm-form-hint">{l.tela_catalogo} · {l.tela_color}</div> : null}
              </Campo>
            </div>
          </>
        )}

        <div className="adm-field-row">
          {!l.es_libre && <Campo label="Precio de lista" hint={l.precio_lista === '' ? 'Sin precio en el catálogo para esta combinación' : 'Del catálogo (medida y categoría de tela)'}><div className="cz-solo">{l.precio_lista === '' ? '—' : fmtMx(l.precio_lista)}</div></Campo>}
          <Campo label="Precio cotizado (MXN)">
            <input className="adm-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={l.precio} onChange={e => onChange({ precio: e.target.value, precio_manual: true })} />
            {!disabled && !l.es_libre && l.precio_manual && l.precio_lista !== '' && num(l.precio) !== num(l.precio_lista)
              ? <button type="button" className="cz-link" onClick={() => onChange({ precio: l.precio_lista, precio_manual: false })}>Volver al precio de lista</button> : null}
          </Campo>
          <Campo label="Cantidad"><input className="adm-input" style={{ width: '100%' }} type="number" min="1" step="1" value={l.cantidad} onChange={e => onChange({ cantidad: e.target.value })} /></Campo>
          <Campo label="Descuento %"><input className="adm-input" style={{ width: '100%' }} type="number" min="0" max="100" step="0.5" value={l.descuento_pct} onChange={e => onChange({ descuento_pct: e.target.value })} /></Campo>
          <Campo label="Precio unitario final"><div className="cz-solo">{fmtMx(precioNeto(l))}</div></Campo>
        </div>

        {!l.es_libre && (
          <div className="cz-visuales">
            <div className="cz-visual">
              <div className="adm-label">Foto del mueble</div>
              <div className="cz-caja cz-caja-foto" style={fotoEstilo}>{!l.imagen_url && <span>Sin imagen</span>}</div>
              {galeria.length > 0 && (
                <div className="cz-mini-galeria">
                  {galeria.map(g => <button type="button" key={g.url} className={g.url === l.imagen_url ? 'cz-on' : ''} style={{ backgroundImage: `url(${g.url})` }} title={g.alt || ''} onClick={() => onChange({ imagen_url: g.url })} />)}
                </div>
              )}
              <div className="cz-fila-botones">
                <SubirImagen disabled={disabled} onUrl={url => onChange({ imagen_url: url })} />
                {l.imagen_url && <button type="button" className="adm-btn-sm" onClick={() => onChange({ imagen_url: null })}>Quitar</button>}
              </div>
            </div>

            <div className="cz-visual">
              <div className="adm-label">Tela en recuadro</div>
              <div className="cz-caja cz-caja-tela" style={colorSel?.imagen_url ? { backgroundImage: `url(${colorSel.imagen_url})` } : { background: colorSel?.codigo_hex || '#F1F5F9' }}>
                {!l.tela_color && <span>Sin tela</span>}
              </div>
              <div className="adm-form-hint">{l.tela_color ? `${l.tela_catalogo} (${l.tela_grado}) · ${l.tela_color}` : ''}</div>
            </div>

            <div className="cz-visual">
              <div className="adm-label">Isométrico y medidas (cm)</div>
              <div className="cz-caja cz-caja-iso" style={{ backgroundImage: l.isometrico_url ? `url(${l.isometrico_url})` : 'none' }}>{!l.isometrico_url && <span>Sin isométrico</span>}</div>
              <div className="cz-medidas">
                {[['ancho', 'Ancho'], ['fondo', 'Fondo'], ['alto', 'Alto']].map(([k, t]) => (
                  <label key={k}><span>{t}</span><input className="adm-input" type="number" min="0" step="0.5" value={l.medidas_cm?.[k] ?? ''} onChange={e => setMedida(k, e.target.value)} /></label>
                ))}
              </div>
              <div className="adm-form-hint">Captura las medidas para que salgan acotadas en el PDF.</div>
              <div className="cz-fila-botones">
                <SubirImagen disabled={disabled} onUrl={url => onChange({ isometrico_url: url })} />
                {l.isometrico_url && <button type="button" className="adm-btn-sm" onClick={() => onChange({ isometrico_url: null })}>Quitar</button>}
              </div>
            </div>
          </div>
        )}

        <Campo label="Requisito especial del cliente" hint="Sale en el PDF, resaltado, debajo de este mueble." style={{ marginTop: 12 }}>
          <textarea className="adm-textarea" style={{ minHeight: 56 }} value={l.requisito_especial} onChange={e => onChange({ requisito_especial: e.target.value })}
            placeholder="Ej. Respaldo 10 cm más alto, patas en nogal, medida para pasar por puerta de 80 cm…" />
        </Campo>
      </fieldset>
    </div>
  )
}
