// src/pages/configurador/StickyConfigurador.jsx
//
// Un solo componente para las 4 categorías con modelos reales (Camas, Sofás
// e Individuales, Escuadras, Chaise Lounge), manejado por STEPS_BY_CATEGORY
// en vez de un componente por categoría. Los "pasos resolver" (Familia/
// Cabecera/Pata en Camas; Modelo en las otras 3) pinchan un producto real;
// de ahí en adelante Tamaño/Tela son siempre iguales (useProductoConfig).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProductoConfig } from './useProductoConfig'
import { useCotizacion } from './useCotizacion'
import StepCard from './StepCard'
import StickyViewer from './StickyViewer'
import CotizacionModal from './CotizacionModal'
import { fmt } from './format'
import { STEPS_BY_CATEGORY } from './steps'
import './ConfiguradorSticky.css'

function distinctInOrder(items, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const k = keyFn(item)
    if (k != null && !seen.has(k)) { seen.add(k); out.push(k) }
  }
  return out
}

export default function StickyConfigurador({ categoriaSlug, productos, distribuidor, initialProducto }) {
  const resolverSteps = STEPS_BY_CATEGORY[categoriaSlug] ?? []
  const resolverFields = resolverSteps.map(s => s.id)
  const usaModelo = resolverFields.includes('modelo')

  // Valores disponibles para `field`, dado el estado de los campos ANTERIORES
  // a él en resolverFields (cascada: Cabecera depende de Familia, etc.).
  // 'modelo' no tiene cascada — el universo es todo `productos`.
  const availableFor = (field, state) => {
    if (field === 'modelo') return productos
    const idx = resolverFields.indexOf(field)
    const filtered = productos.filter(p => resolverFields.slice(0, idx).every(f => p[f] === state[f]))
    return distinctInOrder(filtered, p => p[field])
  }

  const [resolverState, setResolverState] = useState(() => {
    const state = {}
    for (const field of resolverFields) {
      if (field === 'modelo') { state.modelo = initialProducto?.id ?? productos[0]?.id ?? null; continue }
      const options = availableFor(field, state)
      const preferred = initialProducto?.[field]
      state[field] = (preferred && options.includes(preferred)) ? preferred : (options[0] ?? null)
    }
    return state
  })

  // Cambiar un paso resuelve en cascada los siguientes: si el valor que ya
  // tenían sigue siendo válido con la nueva selección, se conserva (no se
  // borra sin necesidad); solo se resetea al primero disponible lo que
  // quedó imposible.
  const updateField = (field, value) => {
    setResolverState(prev => {
      const next = { ...prev, [field]: value }
      const idx = resolverFields.indexOf(field)
      for (let i = idx + 1; i < resolverFields.length; i++) {
        const f = resolverFields[i]
        const options = availableFor(f, next)
        if (!options.includes(next[f])) next[f] = options[0] ?? null
      }
      return next
    })
  }

  const productoActivo = useMemo(() => {
    if (usaModelo) return productos.find(p => p.id === resolverState.modelo) ?? productos[0] ?? null
    return productos.find(p => resolverFields.every(f => p[f] === resolverState[f]))
      ?? productos.find(p => p[resolverFields[0]] === resolverState[resolverFields[0]])
      ?? null
  }, [productos, resolverFields, resolverState, usaModelo])

  // Portadas de Familia (solo si hay paso 'familia', hoy únicamente Camas):
  // foto real (es_principal) del representante Liso+Estándar de cada
  // familia, o el primer producto de esa familia si no existe esa
  // combinación. Una sola consulta batch, no una por tarjeta. Escala de
  // grises se aplica en CSS (.cfg2-fam-ph img) porque las familias no
  // comparten tela/color real (ver spec).
  const tieneFamilia = resolverFields.includes('familia')
  const familias = useMemo(() => (tieneFamilia ? distinctInOrder(productos, p => p.familia) : []), [productos, tieneFamilia])
  const [familiaCovers, setFamiliaCovers] = useState({})

  useEffect(() => {
    if (!tieneFamilia || familias.length === 0) return
    let ignore = false
    async function load() {
      const repByFamilia = {}
      for (const fam of familias) {
        const enFamilia = productos.filter(p => p.familia === fam)
        repByFamilia[fam] = enFamilia.find(p => p.cabecera === 'Liso' && p.pata === 'Estándar') ?? enFamilia[0]
      }
      const repIds = Object.values(repByFamilia).filter(Boolean).map(p => p.id)
      if (repIds.length === 0) return

      const { data } = await supabase.from('producto_imagenes').select('producto_id, url, es_principal, orden')
        .in('producto_id', repIds).order('orden')
      if (ignore) return

      const byProductoId = {}
      ;(data ?? []).forEach(row => {
        const current = byProductoId[row.producto_id]
        if (!current || (row.es_principal && !current.es_principal)) byProductoId[row.producto_id] = row
      })

      const covers = {}
      for (const fam of familias) {
        const rep = repByFamilia[fam]
        covers[fam] = rep ? (byProductoId[rep.id]?.url ?? null) : null
      }
      setFamiliaCovers(covers)
    }
    load()
    return () => { ignore = true }
  }, [tieneFamilia, familias, productos])

  const cfg = useProductoConfig(productoActivo, distribuidor)
  const cotiz = useCotizacion({
    distribuidor, producto: productoActivo, medidaSel: cfg.medidaSel,
    telaSel: cfg.telaSel, colorSel: cfg.colorSel, precioLookup: cfg.precioLookup,
  })

  if (productos.length === 0) {
    return <div className="cfg-message">Aún no hay modelos cargados en esta categoría. Se agregan desde el panel de administración → Productos.</div>
  }

  const cover = productoActivo?.isometrico_url
    ? [{ id: 'cover', url: productoActivo.isometrico_url, alt: productoActivo.nombre }]
    : []
  const thumbnails = [...cover, ...cfg.galeria]

  return (
    <div className="cfg2-wrap">
      <StickyViewer
        activeImgUrl={cfg.activeImgUrl}
        thumbnails={thumbnails}
        onSelectThumbnail={cfg.setActiveImgUrl}
        altText={productoActivo?.nombre}
      />

      <div className="cfg2-panel">
        {resolverSteps.map((step, i) => (
          <StepCard
            key={step.id}
            number={i + 1}
            title={step.label}
            value={step.id === 'modelo' ? productoActivo?.nombre : resolverState[step.id]}
          >
            {step.id === 'familia' && (
              <>
                <div className="cfg2-fams">
                  {familias.map(fam => (
                    <div
                      key={fam}
                      className={`cfg2-fam ${resolverState.familia === fam ? 'cfg2-on' : ''}`}
                      onClick={() => updateField('familia', fam)}
                    >
                      <div className="cfg2-fam-ph">{familiaCovers[fam] && <img src={familiaCovers[fam]} alt={fam} />}</div>
                      <span>{fam}</span>
                    </div>
                  ))}
                </div>
                <div className="cfg2-hint">Vista de diseño — colores disponibles al seleccionar.</div>
              </>
            )}

            {step.id === 'modelo' && (
              <div className="cfg2-models">
                {productos.map(prod => (
                  <div
                    key={prod.id}
                    className={`cfg2-model ${resolverState.modelo === prod.id ? 'cfg2-on' : ''}`}
                    onClick={() => updateField('modelo', prod.id)}
                  >
                    <div className="cfg2-model-ph">{prod.isometrico_url && <img src={prod.isometrico_url} alt={prod.nombre} />}</div>
                    <span>{prod.nombre}</span>
                  </div>
                ))}
              </div>
            )}

            {(step.id === 'cabecera' || step.id === 'pata') && (() => {
              const universo = distinctInOrder(productos, p => p[step.id])
              const disponibles = availableFor(step.id, resolverState)
              return (
                <div className="cfg2-chips">
                  {universo.map(val => (
                    <div
                      key={val}
                      className={`cfg2-chip ${resolverState[step.id] === val ? 'cfg2-on' : ''} ${!disponibles.includes(val) ? 'cfg2-off' : ''}`}
                      onClick={() => disponibles.includes(val) && updateField(step.id, val)}
                    >
                      {val}
                    </div>
                  ))}
                </div>
              )
            })()}
          </StepCard>
        ))}

        <StepCard number={resolverSteps.length + 1} title="Tamaño" value={cfg.medidaSel?.nombre}>
          <div className="cfg2-chips">
            {cfg.configuraciones.map(c => (
              <div
                key={c.id}
                className={`cfg2-chip ${cfg.medidaSel?.id === c.id ? 'cfg2-on' : ''}`}
                onClick={() => cfg.setMedidaSel(c)}
              >
                {c.nombre}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={resolverSteps.length + 2} title="Tela" value={cfg.telaSel ? `Grado ${cfg.gradoSel} · ${cfg.colorSel?.nombre ?? ''}` : null}>
          <div className="cfg2-lbl">Grado</div>
          <div className="cfg2-chips">
            {['AA', 'A', 'B', 'C'].map(g => (
              <div key={g} className={`cfg2-chip ${cfg.gradoSel === g ? 'cfg2-on' : ''}`} onClick={() => cfg.selectGrado(g)}>{g}</div>
            ))}
          </div>
          <div className="cfg2-lbl">Catálogo</div>
          <select className="cfg-dropdown" value={cfg.telaSel?.id ?? ''} onChange={e => cfg.selectTela(e.target.value)}>
            {cfg.telasDelGrado.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>)}
          </select>
          <div className="cfg2-swatches">
            {(cfg.telaSel?.colores ?? []).map(color => (
              <button
                key={color.id} type="button"
                className={`cfg2-sw ${cfg.colorSel?.id === color.id ? 'cfg2-on' : ''}`}
                style={{ background: color.codigo_hex || '#E2E8F0' }}
                title={color.nombre}
                onClick={() => cfg.setColorSel(color)}
              />
            ))}
          </div>
        </StepCard>
      </div>

      <div className="cfg2-bar">
        {!distribuidor ? (
          <div className="cfg2-bar-msg">🔒 Inicia sesión para ver precios como distribuidor</div>
        ) : (
          <>
            <div className="cfg2-bar-price">
              <small>Precio distribuidor</small>
              <strong>{cfg.precioLookup != null ? fmt(cfg.precioLookup) : 'No disponible'}</strong>
            </div>
            <div className="cfg2-bar-actions">
              <button type="button" className="cfg-btn cfg-btn-primary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('emitir')}>Crear cotización</button>
              <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('borrador')}>Guardar en mi espacio</button>
            </div>
          </>
        )}
      </div>

      <CotizacionModal
        cotizModo={cotiz.cotizModo}
        cotizResultado={cotiz.cotizResultado}
        cotizForm={cotiz.cotizForm}
        setCotizForm={cotiz.setCotizForm}
        cotizSaving={cotiz.cotizSaving}
        precioLookup={cfg.precioLookup}
        onConfirm={cotiz.confirmarCotizacion}
        onClose={cotiz.cerrarCotizModal}
      />
    </div>
  )
}
