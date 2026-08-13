// src/pages/configurador/CamasConfigurador.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProductoConfig } from './useProductoConfig'
import { useCotizacion } from './useCotizacion'
import StepCard from './StepCard'
import StickyViewer from './StickyViewer'
import CotizacionModal from './CotizacionModal'
import { fmt } from './format'
import './ConfiguradorSticky.css'

const CABECERAS_ORDEN = ['Liso', 'Capitón', 'Líneas', 'Rayas']
const PATAS_ORDEN = ['Estándar', 'Pata Praga']

export default function CamasConfigurador({ productos, distribuidor, initialProducto }) {
  const familias = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (!seen.has(p.familia)) { seen.add(p.familia); list.push(p.familia) }
    }
    return list
  }, [productos])

  // Foto de portada por familia: el producto "Liso + Estándar" de cada
  // familia (si existe, si no el primero de esa familia), su imagen
  // es_principal (o la primera por orden si ninguna es_principal). Una sola
  // consulta batch para las 7, no una por tarjeta.
  const [familiaCovers, setFamiliaCovers] = useState({})

  useEffect(() => {
    if (familias.length === 0) return
    let ignore = false
    async function load() {
      const repByFamilia = {}
      for (const fam of familias) {
        repByFamilia[fam] = productos.find(p => p.familia === fam && p.cabecera === 'Liso' && p.pata === 'Estándar')
          ?? productos.find(p => p.familia === fam)
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
  }, [familias, productos])

  const [familiaSel, setFamiliaSel] = useState(initialProducto?.familia ?? familias[0] ?? null)

  const cabecerasDisponibles = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (p.familia === familiaSel && !seen.has(p.cabecera)) { seen.add(p.cabecera); list.push(p.cabecera) }
    }
    return list
  }, [productos, familiaSel])

  const patasDisponibles = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (p.familia === familiaSel && !seen.has(p.pata)) { seen.add(p.pata); list.push(p.pata) }
    }
    return list
  }, [productos, familiaSel])

  const [cabeceraSel, setCabeceraSel] = useState(
    (initialProducto?.familia === familiaSel && initialProducto?.cabecera) || cabecerasDisponibles[0] || null
  )
  const [pataSel, setPataSel] = useState(
    (initialProducto?.familia === familiaSel && initialProducto?.pata) || patasDisponibles[0] || null
  )

  // Al cambiar de familia, cabecera/pata se recalculan de una (no se puede
  // esperar al proximo render: si el valor actual ya no existe en la nueva
  // familia, hay que corregirlo ya mismo, no dejarlo en un estado invalido).
  const selectFamilia = (fam) => {
    setFamiliaSel(fam)
    const cabs = []
    const patas = []
    for (const p of productos) {
      if (p.familia !== fam) continue
      if (!cabs.includes(p.cabecera)) cabs.push(p.cabecera)
      if (!patas.includes(p.pata)) patas.push(p.pata)
    }
    setCabeceraSel(prev => (cabs.includes(prev) ? prev : cabs[0] ?? null))
    setPataSel(prev => (patas.includes(prev) ? prev : patas[0] ?? null))
  }

  const productoActivo = useMemo(() => {
    return productos.find(p => p.familia === familiaSel && p.cabecera === cabeceraSel && p.pata === pataSel)
      ?? productos.find(p => p.familia === familiaSel)
      ?? null
  }, [productos, familiaSel, cabeceraSel, pataSel])

  const cfg = useProductoConfig(productoActivo, distribuidor)
  const cotiz = useCotizacion({
    distribuidor, producto: productoActivo, medidaSel: cfg.medidaSel,
    telaSel: cfg.telaSel, colorSel: cfg.colorSel, precioLookup: cfg.precioLookup,
  })

  if (productos.length === 0) {
    return <div className="cfg-message">Aún no hay modelos cargados en Camas. Se agregan desde el panel de administración → Productos.</div>
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
        <StepCard number={1} title="Familia" value={familiaSel}>
          <div className="cfg2-fams">
            {familias.map(fam => (
              <div
                key={fam}
                className={`cfg2-fam ${familiaSel === fam ? 'cfg2-on' : ''}`}
                onClick={() => selectFamilia(fam)}
              >
                <div className="cfg2-fam-ph">
                  {familiaCovers[fam] && <img src={familiaCovers[fam]} alt={fam} />}
                </div>
                <span>{fam}</span>
              </div>
            ))}
          </div>
          <div className="cfg2-hint">Vista de diseño — colores disponibles al seleccionar.</div>
        </StepCard>

        <StepCard number={2} title="Cabecera" value={cabeceraSel}>
          <div className="cfg2-chips">
            {CABECERAS_ORDEN.map(c => (
              <div
                key={c}
                className={`cfg2-chip ${cabeceraSel === c ? 'cfg2-on' : ''} ${!cabecerasDisponibles.includes(c) ? 'cfg2-off' : ''}`}
                onClick={() => cabecerasDisponibles.includes(c) && setCabeceraSel(c)}
              >
                {c}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={3} title="Pata" value={pataSel}>
          <div className="cfg2-chips">
            {PATAS_ORDEN.map(p => (
              <div
                key={p}
                className={`cfg2-chip ${pataSel === p ? 'cfg2-on' : ''} ${!patasDisponibles.includes(p) ? 'cfg2-off' : ''}`}
                onClick={() => patasDisponibles.includes(p) && setPataSel(p)}
              >
                {p}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={4} title="Tamaño" value={cfg.medidaSel?.nombre}>
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

        <StepCard number={5} title="Tela" value={cfg.telaSel ? `Grado ${cfg.gradoSel} · ${cfg.colorSel?.nombre ?? ''}` : null}>
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
