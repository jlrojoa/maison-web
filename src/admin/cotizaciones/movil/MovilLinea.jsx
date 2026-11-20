// src/admin/cotizaciones/movil/MovilLinea.jsx
//
// Una línea de la cotización, pensada para el celular: selectores nativos (en iPhone abren
// el selector de rueda), colores de tela grandes, cantidad con − / +, y foto desde cámara o galería.
import { useEffect, useMemo, useRef, useState } from 'react'
import { precioDeLista, useDetalleProducto } from '../useCatalogo'
import { uploadProductoImage } from '../../catalogo/ProductoImageUpload'
import { fmtMx, num, totalLinea } from '../calc'
import { debeEspejar, opcionesOrientacion, requiereOrientacion } from '../orientacion'
import { alElegirProducto, alElegirMedida, alElegirTela, GRADOS_ORDEN } from './lineaOps'

const Campo = ({ label, children, hint }) => (
  <label className="mv-campo"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>
)

// Medidas en centímetros, escritas a mano.
function MedidasCm({ l, onChange }) {
  const m = l.medidas_cm ?? { ancho: '', fondo: '', alto: '' }
  const set = (k, v) => onChange({ medidas_cm: { ...m, [k]: v } })
  return (
    <div className="mv-fila">
      {[['ancho', 'Ancho cm'], ['fondo', 'Fondo cm'], ['alto', 'Alto cm']].map(([k, et]) => (
        <Campo key={k} label={et}><input inputMode="decimal" value={m[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder="0" /></Campo>
      ))}
    </div>
  )
}

// Tela escrita a mano: nombre, color y (opcional) categoría para tomar el precio del catálogo.
function TelaAMano({ l, onChange, det }) {
  const cambiarGrado = (g) => {
    const patch = { tela_grado: g }
    const lista = det && l.configuracion_id ? precioDeLista(det, l.configuracion_id, g) : null
    if (lista != null) { patch.precio_lista = lista; patch.precio = lista; patch.precio_manual = false }
    onChange(patch)
  }
  return (
    <>
      <div className="mv-fila">
        <Campo label="Tela"><input value={l.tela_catalogo} onChange={e => onChange({ tela_catalogo: e.target.value })} placeholder="Ej. Lino importado" /></Campo>
        <Campo label="Color"><input value={l.tela_color} onChange={e => onChange({ tela_color: e.target.value })} placeholder="Ej. Arena" /></Campo>
      </div>
      <Campo label="Categoría de tela (opcional)">
        <select value={l.tela_grado} onChange={e => cambiarGrado(e.target.value)}>
          <option value="">Sin categoría</option>
          {GRADOS_ORDEN.map(g => <option key={g} value={g}>Categoría {g}</option>)}
        </select>
      </Campo>
    </>
  )
}

export default function MovilLinea({ linea: l, index, cat, onChange, onDelete }) {
  const det = useDetalleProducto(cat, l.es_libre ? null : l.producto_id)
  const producto = useMemo(() => cat.productos.find(p => p.id === l.producto_id), [cat.productos, l.producto_id])
  const tela = cat.telas.find(t => t.nombre === l.tela_catalogo && t.grado === l.tela_grado)
  const fotoRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [abierta, setAbierta] = useState(true)
  // "A mano": mueble que no está en el catálogo, o medida / tela que no están en la lista.
  const espejo = debeEspejar(l, cat.productos)
  const muebleAMano = !l.es_libre && (!!l.a_mano || (!l.producto_id && !!(l.producto_nombre ?? '').trim()))
  const medidaAMano = !!l.producto_id && !l.configuracion_id && !!(l.configuracion_nombre ?? '').trim() && !!det
  const [telaAMano, setTelaAMano] = useState(false)
  useEffect(() => { if (cat.listo && l.tela_catalogo && !tela && !muebleAMano) setTelaAMano(true) }, [cat.listo]) // eslint-disable-line react-hooks/exhaustive-deps

  const porCategoria = useMemo(() => {
    const m = new Map()
    for (const p of cat.productos) { const k = p.categoria?.nombre ?? 'Otros'; m.set(k, [...(m.get(k) ?? []), p]) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [cat.productos])
  const telasPorGrado = useMemo(() => GRADOS_ORDEN.map(g => [g, cat.telas.filter(t => t.grado === g && t.colores.length)]).filter(([, a]) => a.length), [cat.telas])

  // Con las medidas ya cargadas: recupera la medida de una línea guardada o elige la primera.
  useEffect(() => {
    if (!det || l.es_libre || !l.producto_id || l.configuracion_id || det.configuraciones.length === 0) return
    const guardada = det.configuraciones.find(c => c.nombre === l.configuracion_nombre)
    if (guardada) onChange({ configuracion_id: guardada.id, precio_lista: precioDeLista(det, guardada.id, l.tela_grado) ?? l.precio_lista })
    else if (!(l.configuracion_nombre ?? '').trim()) onChange(alElegirMedida(l, det.configuraciones[0], producto, det))
  }, [det]) // eslint-disable-line react-hooks/exhaustive-deps

  const subirFoto = async (file) => {
    if (!file) return
    setSubiendo(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      onChange({ imagen_url: await uploadProductoImage(file, `cotizaciones/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`) })
    } catch (err) { alert(`No se pudo subir la foto: ${err.message}`) } finally { setSubiendo(false); if (fotoRef.current) fotoRef.current.value = '' }
  }
  const titulo = l.es_libre ? (l.producto_nombre || 'Concepto libre') : (l.producto_nombre || 'Elige un mueble')
  const cant = Math.max(1, Math.round(num(l.cantidad)) || 1)

  return (
    <section className="mv-linea">
      <header onClick={() => setAbierta(a => !a)}>
        <span className="mv-num">{index + 1}</span>
        <div className="mv-linea-t"><b>{titulo}</b>{!l.es_libre && l.configuracion_nombre ? <small>{l.configuracion_nombre}{l.tela_color ? ` · ${l.tela_color}` : ''}</small> : null}</div>
        <b>{fmtMx(totalLinea(l))}</b>
        <span className="mv-flecha">{abierta ? '▾' : '▸'}</span>
      </header>

      {abierta && (
        <div className="mv-linea-cuerpo">
          {l.es_libre ? (
            <>
              <Campo label="Concepto"><input value={l.producto_nombre} onChange={e => onChange({ producto_nombre: e.target.value })} placeholder="Flete, instalación, a la medida…" /></Campo>
              <Campo label="Descripción"><input value={l.configuracion_nombre} onChange={e => onChange({ configuracion_nombre: e.target.value })} /></Campo>
            </>
          ) : muebleAMano ? (
            <>
              <Campo label="Mueble (nombre)"><input value={l.producto_nombre} onChange={e => onChange({ producto_nombre: e.target.value, a_mano: true })} placeholder="Ej. Sofá modular esquinero" /></Campo>
              <Campo label="Medida (nombre)"><input value={l.configuracion_nombre} onChange={e => onChange({ configuracion_nombre: e.target.value })} placeholder="Ej. 3 plazas · especial" /></Campo>
              <MedidasCm l={l} onChange={onChange} />
              <TelaAMano l={l} onChange={onChange} />
            </>
          ) : (
            <>
              <Campo label="Mueble">
                <select value={l.producto_id ?? ''} onChange={e => { const p = cat.productos.find(x => x.id === e.target.value); if (p) onChange(alElegirProducto(l, p, cat)) }}>
                  <option value="">Elige un mueble…</option>
                  {porCategoria.map(([c, ps]) => <optgroup key={c} label={c}>{ps.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</optgroup>)}
                </select>
              </Campo>
              {l.producto_id && (
                <>
                  <Campo label="Medida">
                    <select value={l.configuracion_id ?? (medidaAMano ? '__otra' : '')} disabled={!det} onChange={e => {
                      if (e.target.value === '__otra') { onChange({ configuracion_id: null, configuracion_nombre: l.configuracion_nombre && !det.configuraciones.some(c => c.nombre === l.configuracion_nombre) ? l.configuracion_nombre : 'Medida especial', precio_lista: '' }); return }
                      const c = det?.configuraciones.find(x => x.id === e.target.value); if (c) onChange(alElegirMedida(l, c, producto, det))
                    }}>
                      {!det && <option>Cargando…</option>}
                      {det?.configuraciones.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.dimensiones ? ` · ${c.dimensiones}` : ''}</option>)}
                      {det && <option value="__otra">Otra medida (escribirla)…</option>}
                    </select>
                  </Campo>
                  {requiereOrientacion(producto, det) && (
                    <Campo label="Orientación" hint={!l.orientacion ? 'Falta elegir: izquierda o derecha' : (espejo ? 'La imagen se voltea para mostrar esta orientación.' : null)}>
                      <select value={l.orientacion ?? ''} onChange={e => onChange({ orientacion: e.target.value })} style={l.orientacion ? undefined : { borderColor: '#F59E0B' }}>
                        <option value="">Elige…</option>
                        {opcionesOrientacion(det).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Campo>
                  )}
                  {medidaAMano && (
                    <>
                      <Campo label="Nombre de la medida"><input value={l.configuracion_nombre} onChange={e => onChange({ configuracion_nombre: e.target.value })} /></Campo>
                      <MedidasCm l={l} onChange={onChange} />
                    </>
                  )}
                  <Campo label="Tela">
                    <select value={telaAMano ? '__otra' : (tela ? `${tela.grado}|${tela.nombre}` : '')} onChange={e => {
                      if (e.target.value === '__otra') { setTelaAMano(true); return }
                      setTelaAMano(false)
                      if (!e.target.value) { onChange({ tela_catalogo: '', tela_grado: '', tela_color: '' }); return }
                      const [g, n] = e.target.value.split('|'); const t = cat.telas.find(x => x.grado === g && x.nombre === n); if (t) onChange(alElegirTela(l, t, null, det))
                    }}>
                      <option value="">Sin tela</option>
                      {telasPorGrado.map(([g, ts]) => <optgroup key={g} label={`Categoría ${g}`}>{ts.map(t => <option key={t.id} value={`${t.grado}|${t.nombre}`}>{t.nombre}</option>)}</optgroup>)}
                      <option value="__otra">Otra tela (escribirla)…</option>
                    </select>
                  </Campo>
                  {telaAMano && <TelaAMano l={l} onChange={onChange} det={det} />}
                  {tela && !telaAMano && (
                    <div className="mv-colores" role="radiogroup" aria-label="Color de la tela">
                      {tela.colores.map(c => (
                        <button type="button" key={c.id} role="radio" aria-checked={c.nombre === l.tela_color}
                          className={c.nombre === l.tela_color ? 'sel' : ''} onClick={() => onChange({ tela_color: c.nombre })} title={c.nombre}>
                          <i style={{ backgroundImage: c.imagen_url ? `url(${c.imagen_url})` : 'none', backgroundColor: c.codigo_hex || '#ddd' }} />
                          <span>{c.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="mv-fila">
            <Campo label="Cantidad">
              <div className="mv-stepper">
                <button type="button" onClick={() => onChange({ cantidad: Math.max(1, cant - 1) })} aria-label="Menos">−</button>
                <b>{cant}</b>
                <button type="button" onClick={() => onChange({ cantidad: cant + 1 })} aria-label="Más">+</button>
              </div>
            </Campo>
            <Campo label="Precio unitario" hint={!l.es_libre && !muebleAMano ? (l.precio_lista === '' ? 'Sin precio en catálogo: escríbelo' : `Lista ${fmtMx(l.precio_lista)}`) : null}>
              <input inputMode="decimal" value={l.precio} onChange={e => onChange({ precio: e.target.value, precio_manual: true })} placeholder="$0" />
            </Campo>
            <Campo label="Desc. %"><input inputMode="decimal" value={l.descuento_pct} onChange={e => onChange({ descuento_pct: e.target.value })} placeholder="0" /></Campo>
          </div>

          <Campo label="Requisito especial del cliente">
            <textarea rows={2} value={l.requisito_especial} onChange={e => onChange({ requisito_especial: e.target.value })} placeholder="Ej. respaldo 10 cm más alto, patas en nogal…" />
          </Campo>

          {(muebleAMano || l.es_libre || l.producto_id) && (
            <div className="mv-foto">
              {l.imagen_url ? <img src={l.imagen_url} alt="" style={espejo ? { transform: 'scaleX(-1)' } : undefined} /> : <div className="mv-foto-vacia">Sin foto</div>}
              <div>
                <input ref={fotoRef} type="file" accept="image/*" hidden onChange={e => subirFoto(e.target.files?.[0])} />
                <button type="button" className="mv-btn-sec" disabled={subiendo} onClick={() => fotoRef.current?.click()}>{subiendo ? 'Subiendo…' : '📷 Usar mi foto'}</button>
                {producto && !muebleAMano && l.imagen_url !== (producto.imagen_portada_url || producto.isometrico_url) && (
                  <button type="button" className="mv-btn-sec" onClick={() => onChange({ imagen_url: producto.imagen_portada_url || producto.isometrico_url || null })}>Volver a la del catálogo</button>
                )}
              </div>
            </div>
          )}

          <button type="button" className="mv-quitar" onClick={onDelete}>Quitar este renglón</button>
        </div>
      )}
    </section>
  )
}
