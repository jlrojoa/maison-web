// src/pages/configurador/ModularesConfigurador.jsx
//
// Modulares (Cubo, Milan) no encaja en el patrón de selección única que usan
// las otras 4 categorías (StickyConfigurador/useProductoConfig: un producto,
// un tamaño, una tela, un precio). Aquí el distribuidor arma su propio
// mueble agregando piezas en SECUENCIA — no es un conteo libre: un brazo o
// un esquinero solo tienen sentido en una posición concreta del mueble
// físico. El motor de reglas de posición, el nombre/tipo automático y el
// cálculo de precio están portados de bayside.html (prototipo de
// referencia de JL, ver .gitignore — no es parte del repo). Lo que NO se
// portó: WhatsApp, colecciones inventadas, branding Bayside.
//
// Piezas = producto_configuraciones (mismo mecanismo que "tamaño" en
// Camas). La tela/grado aplica a TODO el armado, no por pieza.
//
// Medidas: no existen dimensiones reales por pieza en Shopify (los tags
// "medidas_..." no resuelven a ningún metaobject ni metafield — se verificó
// por API). Por indicación de JL (2026-08-27) se usan las proporciones
// aproximadas de bayside.html (módulo estándar ~1.00m, variante angosta
// 0.80m) mientras se confirman las reales — de ahí el aviso "pendientes de
// confirmar" junto al plano. El doblez en L, el ancho por pieza y el
// espejo son lógica de layout y no dependen de que esa medida sea exacta.
//
// Acotaciones: el plano muestra líneas de medida (cotaH/cotaV, total por
// tramo) sobre la fila horizontal y la columna vertical del armado en L —
// mismas medidas aproximadas de arriba, mismo aviso "pendientes de
// confirmar".
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fmt } from './format'
import { ARMADOS_SUGERIDOS } from './modularesPresets'
import { TIPOS, NOMBRE_POR_TIPO, getAllowedTypes, addToSequence, removeFromSequence, getHintSegments, detectNombreTipo, getDisabledReason } from './modularesSequence'
import PiezaSVG, { colorsFromHex } from './PiezaSVG'
import './ModularesConfigurador.css'

const GRADOS = ['AA', 'A', 'B', 'C']

// El plano técnico es un dibujo de ingeniería, no una vista previa de tela —
// JL pidió explícitamente que NO cambie de color según la tela/color
// seleccionados (a diferencia de las tarjetas de "Selecciona Módulos", que sí
// muestran foto/color real). Paleta fija tono neutro oscuro sobre panel claro
// — el acento cobre queda reservado para cotas/title-block/leyenda (ver CSS),
// nunca para el dibujo de las piezas en sí.
const BLUEPRINT_COLORS = { fill: '#EFEDE9', seat: '#F8F7F4', back: '#DAD7D0', stroke: '#2A2620' }

// Placeholder de "sin foto" — silueta neutra fija, nunca derivada de la tela
// (a propósito, para no insinuar un color de tela que no es real).
const PLACEHOLDER_COLORS = { fill: '#EDECE9', seat: '#F6F5F3', back: '#E1DFDB', stroke: '#B7B4AE' }

// Textura placeholder de tela — patrón de tejido simple (SVG, no imagen
// generada) tintado con los mismos tonos que ya deriva colorsFromHex() del
// hex real de la tela. Se reemplaza por foto real del proveedor el día que
// exista (color.imagen_url), sin tocar el layout de la tarjeta.
function TelaTextura({ hex }) {
  const { fill, seat, stroke } = colorsFromHex(hex)
  const patternId = `tela-tex-${(hex || 'default').replace('#', '')}`
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill={fill} />
          <path d="M0 3.5 H7" stroke={stroke} strokeWidth="1" opacity="0.22" />
          <path d="M3.5 0 V7" stroke={seat} strokeWidth="1" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${patternId})`} />
    </svg>
  )
}

// Regla de layout del armado — la misma que usa el plano técnico principal
// (renderPlano más abajo) y ahora también el mini plano de las tarjetas de
// preset (PresetPlano): si hay Esquinero, la fila horizontal llega hasta él
// inclusive y el resto de las piezas (+ los Puffs) bajan en columna debajo,
// alineados con el borde izquierdo del Esquinero. Sin Esquinero, todo es
// una sola fila (Puffs en su propia fila abajo). UNA sola función para las
// dos vistas — así un ajuste al doblez en L no se puede desalinear entre el
// plano real y el preview de la tarjeta (motivo por el que el diagrama
// isométrico anterior, con su propio cálculo de doblez, se veía roto).
// Recibe cualquier arreglo de objetos con `.type` (piezas reales de
// `sequence`, o el preview sintético que arma PresetPlano).
function splitSofaLayout(piezas) {
  const sofaPiezas = piezas.filter(p => p.type !== 'puff')
  const puffs = piezas.filter(p => p.type === 'puff')
  const cornerIdx = sofaPiezas.findIndex(p => p.type === 'corner')
  const hasCorner = cornerIdx !== -1
  return { sofaPiezas, puffs, cornerIdx, hasCorner }
}

// Paleta neutra gris-azulada para el mini plano de las tarjetas de preset —
// ni el grafito/cobre del plano técnico (BLUEPRINT_COLORS, reservado para
// el plano real) ni el tono cálido de "sin foto" (PLACEHOLDER_COLORS):
// blanco + gris claro azulado, mismo lenguaje que el resto de la tarjeta
// estilo Veka (borde ~#64748B ya usado en el resto del componente).
const PRESET_TILE_COLORS = { fill: '#FFFFFF', seat: '#F8FAFC', back: '#E2E8F0', stroke: '#64748B' }

// Mini plano de vista superior para las tarjetas de "Configuraciones
// predefinidas" — MISMO PiezaSVG que dibuja el plano técnico principal
// (antes esto eran rectángulos idénticos sin importar el tipo; ahora la
// silueta de Brazo Izq/Der/Central/Esquinero/Puff es literalmente el mismo
// componente, solo con una paleta neutra en vez de BLUEPRINT_COLORS —
// así un ajuste a una silueta nunca se puede desalinear entre las dos
// vistas). El posicionamiento sigue siendo splitSofaLayout(), sin cambios.
const PRESET_TILE_PX = 32
function PresetPlano({ tipos }) {
  const { sofaPiezas, puffs, cornerIdx, hasCorner } = splitSofaLayout(tipos.map((type, i) => ({ type, id: i })))
  const tile = (p, variant) => {
    // Corrección: el Puff usa el MISMO PRESET_TILE_PX que el resto — un
    // tamaño distinto rompía el calce a ras contra la pieza contigua (solo
    // tocaban en una esquina, el resto del borde quedaba suelto/flotando).
    return (
      <div className="mod-preset-plano-tile" key={p.id}>
        <PiezaSVG type={variant || p.type} width={PRESET_TILE_PX} height={PRESET_TILE_PX} colors={PRESET_TILE_COLORS} />
      </div>
    )
  }

  if (!hasCorner) {
    return (
      <div className="mod-preset-plano" aria-hidden="true">
        <div className="mod-preset-plano-row">{sofaPiezas.map(p => tile(p))}</div>
        {puffs.length > 0 && (
          <div className="mod-preset-plano-row mod-preset-plano-row-puffs">{puffs.map(p => tile(p))}</div>
        )}
      </div>
    )
  }

  const topRow = sofaPiezas.slice(0, cornerIdx)
  const corner = sofaPiezas[cornerIdx]
  const botRow = sofaPiezas.slice(cornerIdx + 1)
  return (
    <div className="mod-preset-plano" aria-hidden="true">
      <div className="mod-preset-plano-row">
        {topRow.map(p => tile(p))}
        {tile(corner)}
      </div>
      <div className="mod-preset-plano-botcol" style={{ marginLeft: topRow.length * PRESET_TILE_PX }}>
        {botRow.map(p => tile(p, p.type === 'right' ? 'right_v' : 'center_v'))}
        {puffs.map(p => tile(p))}
      </div>
    </div>
  )
}

// Mismo default de 1.00m por pieza (sin Corner/Puff) que usa el plano
// técnico (ver metrosDePieza más abajo) — aproximado, pendiente de
// confirmar contra medidas reales, igual que el resto del archivo. El Puff
// no suma al largo del asiento (va en su propia fila, como en el plano).
const dimsPreset = (tipos) => {
  const sofaT = tipos.filter(t => t !== 'puff')
  const cIdx = sofaT.indexOf('corner')
  if (cIdx === -1) return `${sofaT.length.toFixed(2)} m`
  const horizontal = cIdx + 1
  const vertical = 1 + (sofaT.length - cIdx - 1)
  return `${horizontal.toFixed(2)} × ${vertical.toFixed(2)} m`
}

// Tiempo de fabricación mostrado en la barra de precio — SOLO texto plano,
// sin ícono (pedido explícito de JL). Sin regla automática: JL cambia este
// valor a mano cuando un armado requiere negociar el tiempo en vez del
// default de 6 semanas — no hay lógica que lo detecte sola todavía.
const TIEMPO_FABRICACION = '6 semanas'
// const TIEMPO_FABRICACION = 'Tiempo a negociar'

export default function ModularesConfigurador({ productos, distribuidor, categoriaNombre }) {
  const productoIds = useMemo(() => productos.map(p => p.id), [productos])

  // Pestaña de modelo activa — Cubo/Milan/Nube ya no se apilan, se muestra
  // uno a la vez. Si cambia la lista de productos (o la activa deja de
  // existir) cae de vuelta al primero.
  const [modeloActivoId, setModeloActivoId] = useState(productos[0]?.id ?? null)
  useEffect(() => {
    if (!productos.some(p => p.id === modeloActivoId)) setModeloActivoId(productos[0]?.id ?? null)
  }, [productos])

  const [configuraciones, setConfiguraciones] = useState([])
  const [imagenes, setImagenes] = useState([])
  const [telas, setTelas] = useState([])
  const [precios, setPrecios] = useState([])

  const [gradoSel, setGradoSel] = useState('B')
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)

  const [sequence, setSequence] = useState([]) // [{ id, type, configuracionId, modeloId, ancho? }]
  const pidRef = useRef(0)
  const [mirrored, setMirrored] = useState(false)

  // Ancho "pendiente" — el que se le va a dar a la PRÓXIMA pieza que se
  // agregue desde la tarjeta de selección de arriba (Central/Puff). Vive
  // aparte de `sequence`: elegir 100/80 aquí no toca las piezas que ya están
  // en el armado (esas se ajustan una por una en "Ancho de piezas", más
  // abajo — ver setAncho). Clave por producto+tipo porque Cubo y Milan
  // pueden tener un pendiente distinto a la vez.
  const [anchoPendiente, setAnchoPendiente] = useState({})
  const anchoPendienteKey = (productoId, type) => `${productoId}:${type}`
  const getAnchoPendiente = (productoId, type) => anchoPendiente[anchoPendienteKey(productoId, type)] ?? 100
  const setAnchoPendienteFor = (productoId, type, ancho) =>
    setAnchoPendiente(prev => ({ ...prev, [anchoPendienteKey(productoId, type)]: ancho }))

  useEffect(() => {
    if (productoIds.length === 0) { setConfiguraciones([]); setImagenes([]); return }
    let ignore = false
    async function load() {
      const [cfgRes, imgRes, telasRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .in('producto_id', productoIds).eq('activo', true).order('orden'),
        supabase.from('producto_imagenes').select('*').in('producto_id', productoIds),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
      ])
      if (ignore) return
      setConfiguraciones(cfgRes.data ?? [])
      setImagenes(imgRes.data ?? [])
      setTelas((telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      })))
    }
    load()
    return () => { ignore = true }
  }, [productoIds.join(',')])

  useEffect(() => {
    if (telaSel) return
    // Default a Grado B — es el único grado con precios realmente
    // capturados hoy (JL, 2026-08-31); antes esto tomaba el primer grado
    // de GRADOS que tuviera CUALQUIER tela (AA sí tiene telas cargadas,
    // solo que sin precio), así que el configurador siempre abría en AA
    // mostrando "No disponible"/$0 en todo. AA/A/C se quedan seleccionables
    // igual que antes — esto solo cambia cuál viene preseleccionado, y
    // sigue cayendo al primero-con-telas si algún día B se queda sin telas.
    const gradoConTelas = (telas.some(t => t.grado === 'B') ? 'B' : GRADOS.find(g => telas.some(t => t.grado === g))) ?? 'B'
    setGradoSel(gradoConTelas)
    const t = telas.find(t => t.grado === gradoConTelas) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }, [telas])

  useEffect(() => {
    if (!distribuidor || productoIds.length === 0) { setPrecios([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('producto_precios').select('*').in('producto_id', productoIds)
      if (!ignore) setPrecios(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [distribuidor, productoIds.join(',')])

  const piezasPorProducto = useMemo(() => {
    const map = {}
    for (const p of productos) {
      map[p.id] = configuraciones.filter(c => c.producto_id === p.id).sort((a, b) => a.orden - b.orden)
    }
    return map
  }, [productos, configuraciones])

  const getPiezaConfig = (productoId, type) =>
    (piezasPorProducto[productoId] ?? []).find(c => c.nombre === NOMBRE_POR_TIPO[type]) ?? null

  const getImagen = (productoId, piezaNombre) =>
    imagenes.find(i => i.producto_id === productoId && i.alt === piezaNombre)?.url ?? null

  const getPrecio = (configuracionId, grado) =>
    precios.find(p => p.configuracion_id === configuracionId && p.grado === grado)?.precio ?? null

  const selectGrado = (g) => {
    setGradoSel(g)
    const t = telas.find(x => x.grado === g) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }
  const selectTela = (telaId) => {
    const t = telas.find(x => x.id === telaId) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }
  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

  // El armado pertenece a UN modelo a la vez — las posiciones (brazo/
  // esquinero) son geometría de un mueble físico concreto, no tiene sentido
  // mezclar piezas de Cubo con piezas de Milan en la misma secuencia.
  // Mientras la secuencia esté vacía, cualquiera de las dos filas puede
  // arrancarla.
  const sequenceModeloId = sequence[0]?.modeloId ?? null
  const allowedTypes = getAllowedTypes(sequence)

  // Ancho por instancia (100/80cm) — solo aplica a Central y Puff, y es
  // libre por pieza (el mismo armado puede tener un Central de 100 y otro
  // de 80). Medida aproximada, pendiente de confirmar contra dimensiones
  // reales — ver nota al inicio del archivo.
  const tieneAncho = (type) => type === 'center' || type === 'puff'

  const agregarPieza = (producto, type) => {
    if (sequenceModeloId && sequenceModeloId !== producto.id) return
    const pieza = getPiezaConfig(producto.id, type)
    if (!pieza) return
    const ancho = tieneAncho(type) ? getAnchoPendiente(producto.id, type) : undefined
    const piece = { id: pidRef.current++, type, configuracionId: pieza.id, modeloId: producto.id, ancho }
    setSequence(prev => addToSequence(prev, type, piece))
  }

  const quitarDesde = (id) => setSequence(prev => removeFromSequence(prev, id))

  const setAncho = (id, ancho) => setSequence(prev => prev.map(p => (p.id === id ? { ...p, ancho } : p)))

  const aplicarPreset = (producto, preset) => {
    const next = []
    for (const type of preset.tipos) {
      const pieza = getPiezaConfig(producto.id, type)
      if (!pieza) return // este modelo no tiene todas las piezas del preset todavía
      const ancho = tieneAncho(type) ? getAnchoPendiente(producto.id, type) : undefined
      next.push({ id: pidRef.current++, type, configuracionId: pieza.id, modeloId: producto.id, ancho })
    }
    setSequence(next)
    setMirrored(false)
  }

  const limpiarArmado = () => { setSequence([]); setMirrored(false) }

  // Líneas agregadas (misma pieza puede repetirse en la secuencia, p.ej. 2
  // Módulo Central) — para el resumen y la cotización se agrupan por
  // configuracion_id, igual que antes, pero un Central/Puff de 100cm y uno
  // de 80cm son visualmente distintos así que NO se agrupan juntos (mismo
  // precio de todas formas — el ancho no lo cambia).
  const lineas = useMemo(() => {
    const porConfig = new Map()
    for (const p of sequence) {
      const key = `${p.configuracionId}::${p.ancho ?? ''}`
      if (!porConfig.has(key)) porConfig.set(key, { key, configuracionId: p.configuracionId, modeloId: p.modeloId, type: p.type, ancho: p.ancho, cantidad: 0 })
      porConfig.get(key).cantidad++
    }
    return Array.from(porConfig.values()).map(l => {
      const producto = productos.find(pr => pr.id === l.modeloId)
      const base = NOMBRE_POR_TIPO[l.type]
      const piezaNombre = l.ancho != null ? `${base} (${l.ancho}cm)` : base
      return {
        ...l,
        productoNombre: producto?.nombre ?? '',
        piezaNombre,
        precio: getPrecio(l.configuracionId, gradoSel),
        imagenUrl: getImagen(l.modeloId, base),
      }
    })
  }, [sequence, productos, precios, gradoSel])

  // Plano del armado: si hay Esquinero, dobla en L — fila superior (piezas
  // antes del esquinero + el esquinero) y columna inferior (piezas después,
  // dibujadas con las variantes verticales) alineada bajo el esquinero.
  // Puerto de la separación topRow/corner/botRow de renderStage() en
  // bayside.html. TILE_PX es una aproximación uniforme para brazo/esquinero
  // (pendiente de confirmar contra medidas reales); Central y Puff escalan
  // ese tamaño según su ancho elegido (100/80cm) para que el rectángulo
  // refleje el ancho relativo, también aproximado.
  const TILE_PX = 84
  // Franja reservada para la medida al pie de cada pieza — JL pidió que el
  // plano deje de ser interactivo y solo muestre la medida ya elegida, sin
  // encimarse con las líneas del dibujo. En vez de superponer el texto sobre
  // el SVG, se resta esta franja de la altura real del dibujo (que se
  // escala un poco más angosto) y el texto vive debajo, en espacio propio.
  const LABEL_H = 14
  const { sofaPiezas, puffs: puffsSeq, cornerIdx, hasCorner } = splitSofaLayout(sequence)

  const getTileSize = (piece, variant) => {
    if (!tieneAncho(piece.type)) return { width: TILE_PX, height: TILE_PX }
    const escala = (piece.ancho ?? 100) / 100
    const lado = Math.round(TILE_PX * escala)
    const esVertical = variant === 'center_v' || variant === 'right_v'
    return esVertical ? { width: TILE_PX, height: lado } : { width: lado, height: TILE_PX }
  }

  // Acotaciones (cotaH/cotaV) — la línea de medida con el valor en metros que
  // el comentario del archivo marcaba como pendiente de portar. Solo el total
  // por tramo (no por pieza individual) para mantener el plano legible;
  // medidas aproximadas, mismo caveat que el resto del plano.
  const metrosDePieza = (p) => (tieneAncho(p.type) ? (p.ancho ?? 100) / 100 : 1)
  const totalHorizontalM = (hasCorner ? sofaPiezas.slice(0, cornerIdx + 1) : sofaPiezas)
    .reduce((sum, p) => sum + metrosDePieza(p), 0)
  const botRowSeq = hasCorner ? sofaPiezas.slice(cornerIdx + 1) : []
  const totalVerticalM = hasCorner ? 1 + botRowSeq.reduce((sum, p) => sum + metrosDePieza(p), 0) : 0

  const DimLine = ({ sizePx, label, vertical }) => (
    <div className={`mod-dim ${vertical ? 'mod-dim-v' : 'mod-dim-h'}`} style={vertical ? { height: sizePx } : { width: sizePx }}>
      <span className="mod-dim-label">{label}</span>
      <span className="mod-dim-line" />
    </div>
  )

  const renderTile = (piece, variant) => {
    const { width, height } = getTileSize(piece, variant)
    const artHeight = height - LABEL_H
    const label = tieneAncho(piece.type) ? `${piece.ancho ?? 100}cm` : '100cm'
    return (
      <div className="mod-plano-tile" key={piece.id} style={{ width, height }}>
        <button
          type="button"
          className="mod-plano-tile-btn"
          title={`Quitar ${NOMBRE_POR_TIPO[piece.type]}${piece.type !== 'puff' ? ' (y todo lo que sigue)' : ''}`}
          onClick={() => quitarDesde(piece.id)}
        >
          <PiezaSVG type={variant || piece.type} width={width} height={artHeight} colors={BLUEPRINT_COLORS} />
          {/* El plano ya no controla el ancho — solo lo muestra. Elegir
              100cm/80cm vive en la tarjeta de selección de arriba (mod-pieza-
              anchos, define el ancho de la PRÓXIMA pieza) y, para ajustar una
              instancia ya colocada, en "Ancho de piezas" dentro de "Tu
              armado" (mod-anchos). Así el plano queda puramente de lectura y
              sin el hit-target chico que antes competía con el botón de
              quitar. */}
          <span className="mod-plano-tile-dim" style={{ height: LABEL_H }}>{label}</span>
          <span className="mod-preview-remove">×</span>
        </button>
      </div>
    )
  }

  const renderPlano = () => {
    if (!hasCorner) {
      const anchoTotalPx = sofaPiezas.reduce((sum, p) => sum + getTileSize(p).width, 0)
      return (
        <>
          {anchoTotalPx > 0 && <DimLine sizePx={anchoTotalPx} label={`${totalHorizontalM.toFixed(2)} m`} />}
          <div className="mod-plano">
            <div className="mod-plano-row">{sofaPiezas.map(p => renderTile(p))}</div>
            {puffsSeq.length > 0 && <div className="mod-plano-row mod-plano-row-puffs">{puffsSeq.map(p => renderTile(p))}</div>}
          </div>
        </>
      )
    }

    const topRow = sofaPiezas.slice(0, cornerIdx)
    const corner = sofaPiezas[cornerIdx]
    const botRow = sofaPiezas.slice(cornerIdx + 1)
    const topRowWidth = topRow.reduce((sum, p) => sum + getTileSize(p).width, 0)
    const cornerWidth = getTileSize(corner).width
    const botColHeight = botRow.reduce((sum, p) => sum + getTileSize(p, p.type === 'right' ? 'right_v' : 'center_v').height, 0)

    // La cota vertical se ancla con left:100% del propio contenedor de la
    // figura (no con un cálculo de ancho aparte) para quedar SIEMPRE flush
    // contra el borde derecho real dibujado, sin depender de que el ancho
    // que calculamos en JS coincida a el px con el que el navegador termina
    // renderizando. El wrapper entero (figura + cota vertical) es lo que se
    // espeja — no solo la figura — para que la cota se quede pegada al
    // esquinero también en modo Espejo; el texto se contra-espeja aparte
    // (si no, saldría al revés).
    return (
      <div className="mod-plano-with-dims">
        <DimLine sizePx={topRowWidth + cornerWidth} label={`${totalHorizontalM.toFixed(2)} m`} />
        <div className={`mod-plano-figure ${mirrored ? 'mod-plano-mirrored' : ''}`}>
          <div className="mod-plano">
            <div className="mod-plano-row">
              {topRow.map(p => renderTile(p))}
              {renderTile(corner)}
            </div>
            <div className="mod-plano-botcol" style={{ marginLeft: topRowWidth }}>
              {botRow.map(p => renderTile(p, p.type === 'right' ? 'right_v' : 'center_v'))}
              {puffsSeq.map(p => renderTile(p))}
            </div>
          </div>
          {botColHeight > 0 && (
            <div className="mod-dim-v-anchor" style={{ height: cornerWidth + botColHeight }}>
              <DimLine sizePx={cornerWidth + botColHeight} label={`${totalVerticalM.toFixed(2)} m`} vertical />
            </div>
          )}
        </div>
      </div>
    )
  }

  const hayIncompletas = lineas.some(l => l.precio == null)
  const total = lineas.reduce((sum, l) => sum + (l.precio ?? 0) * l.cantidad, 0)
  const { nombre: nombreArmado, tipo: tipoArmado } = detectNombreTipo(sequence)
  const hintSegments = getHintSegments(sequence)

  // ── Cotización ────────────────────────────────────────────────────────
  const [cotizModo, setCotizModo] = useState(null) // null | 'borrador' | 'emitir'
  const [cotizForm, setCotizForm] = useState({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
  const [cotizSaving, setCotizSaving] = useState(false)
  const [cotizResultado, setCotizResultado] = useState(null)

  const puedeGuardar = !!(distribuidor && telaSel && colorSel && lineas.length > 0 && !hayIncompletas)

  const abrirCotizModal = (modo) => {
    if (!puedeGuardar) return
    setCotizForm({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
    setCotizResultado(null)
    setCotizModo(modo)
  }
  const cerrarCotizModal = () => { if (!cotizSaving) setCotizModo(null) }

  const markup = parseFloat(cotizForm.markup_pct) || 0
  const totalCliente = Math.round(total * (1 + markup / 100))

  const confirmarCotizacion = async () => {
    if (!cotizForm.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setCotizSaving(true)
    try {
      const textilNombre = `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`

      const { data: cot, error: cotErr } = await supabase.from('cotizaciones').insert({
        distribuidor_email: distribuidor.email,
        nombre_proyecto: `Modulares · ${nombreArmado}`,
        status: 'borrador',
        total: totalCliente,
        markup_pct: markup,
        cliente_nombre: cotizForm.cliente_nombre.trim(),
        cliente_email: cotizForm.cliente_email.trim() || null,
        cliente_telefono: cotizForm.cliente_telefono.trim() || null,
      }).select().single()
      if (cotErr) throw cotErr

      const items = lineas.map(l => ({
        cotizacion_id: cot.id,
        producto_id: l.modeloId,
        producto_nombre: l.productoNombre,
        imagen_url: l.imagenUrl,
        configuracion_nombre: l.piezaNombre,
        medidas: l.ancho != null ? `${l.ancho}cm (aprox.)` : null,
        textil_nombre: textilNombre,
        precio_unitario: l.precio,
        precio_cliente: Math.round(l.precio * (1 + markup / 100)),
        cantidad: l.cantidad,
      }))
      const { error: itemErr } = await supabase.from('cotizacion_items').insert(items)
      if (itemErr) throw itemErr

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

  if (productos.length === 0) {
    return <div className="cfg-message">Aún no hay modelos cargados en «{categoriaNombre}». Se agregan desde el panel de administración → Productos.</div>
  }

  const producto = productos.find(p => p.id === modeloActivoId) ?? productos[0]
  const otroModeloEnCurso = sequenceModeloId && sequenceModeloId !== producto.id

  return (
    <div className="mod-wrap">
      <div className="mod-header">
        <h1 className="mod-h1">{categoriaNombre}</h1>
        <p className="mod-subtitle">Arma tu sofá pieza por pieza, en orden. El precio y el nombre se actualizan según lo que vayas agregando.</p>
      </div>

      {/* Pestañas de modelo — Cubo/Milan/Nube ya no se apilan: solo se
          muestra el contenido de la activa. El "armado" (sequence) sigue
          bloqueado a un solo modelo a la vez (agregarPieza/aplicarPreset ya
          lo validaban antes de esto), pero con pestañas no hace falta
          explicarlo con un banner — las tarjetas de la pestaña "bloqueada"
          simplemente se ven deshabilitadas (mod-disabled), igual que
          siempre. */}
      <div className="mod-modelo-tabs">
        {productos.map(p => (
          <button
            key={p.id}
            type="button"
            className={`mod-modelo-tab ${producto.id === p.id ? 'mod-on' : ''}`}
            onClick={() => setModeloActivoId(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div className="mod-layout">
        <div className="mod-layout-left">
          <section className={`mod-modelo ${otroModeloEnCurso ? 'mod-modelo-inactiva' : ''}`}>
            <div className="mod-presets-section">
              <div className="mod-lbl">Configuraciones predefinidas</div>
              <div className="mod-presets-grid">
                {ARMADOS_SUGERIDOS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className="mod-preset-card"
                    disabled={otroModeloEnCurso}
                    onClick={() => aplicarPreset(producto, preset)}
                  >
                    <div className="mod-preset-plano-wrap">
                      <PresetPlano tipos={preset.tipos} />
                    </div>
                    <span className="mod-preset-nombre">{preset.nombre}</span>
                    {/* Línea de descripción corta — pendiente el copy de las 5
                        (JL). El slot ya está listo con su estilo: en cuanto
                        modularesPresets.js tenga preset.descripcion esto se
                        muestra solo, sin tocar nada más aquí. */}
                    {preset.descripcion && <span className="mod-preset-desc">{preset.descripcion}</span>}
                    <span className="mod-preset-badge">{preset.tipos.length} pzas</span>
                    <span className="mod-preset-dims">Dimensiones aprox.: {dimsPreset(preset.tipos)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mod-piezas">
              {TIPOS.map(type => {
                const pieza = getPiezaConfig(producto.id, type)
                if (!pieza) return null
                const cantidad = sequence.filter(p => p.configuracionId === pieza.id).length
                const img = getImagen(producto.id, pieza.nombre)
                const precio = getPrecio(pieza.id, gradoSel)
                const disabled = otroModeloEnCurso || !allowedTypes.has(type)
                const reason = !otroModeloEnCurso && disabled ? getDisabledReason(sequence, type) : null
                const pendiente = tieneAncho(type) ? getAnchoPendiente(producto.id, type) : null
                return (
                  <div
                    className={`mod-pieza ${cantidad > 0 ? 'mod-on' : ''} ${disabled ? 'mod-disabled' : ''}`}
                    key={pieza.id}
                  >
                    <button
                      type="button"
                      className="mod-pieza-add"
                      disabled={disabled}
                      onClick={() => agregarPieza(producto, type)}
                    >
                      <div className="mod-pieza-ph">
                        {img
                          ? <img
                              src={img}
                              alt={`${producto.nombre} · ${pieza.nombre}`}
                              // Las fotos de "Brazo Izquierdo"/"Brazo Derecho" en Shopify están
                              // invertidas (el fotógrafo las etiquetó al revés) — se corrige con
                              // flip horizontal en vez de cambiar qué URL usa cada pieza, para no
                              // tener que rehacer el mapeo si algún día llegan las fotos correctas.
                              style={(type === 'left' || type === 'right') ? { transform: 'scaleX(-1)' } : undefined}
                            />
                          : (
                            <div className="mod-pieza-ph-empty">
                              <PiezaSVG type={type} size={40} colors={PLACEHOLDER_COLORS} />
                              <span className="mod-sin-imagen">Foto próximamente</span>
                            </div>
                          )}
                        {cantidad > 0 && <div className="mod-pieza-badge">{cantidad}</div>}
                      </div>
                      <div className="mod-pieza-info">
                        <span className="mod-pieza-nombre">{pieza.nombre}</span>
                        {reason && <span className="mod-pieza-reason">{reason}</span>}
                        <span className="mod-pieza-precio">
                          {!distribuidor ? '' : precio != null ? fmt(precio) : 'No disponible'}
                        </span>
                      </div>
                    </button>
                    {/* Ancho de la PRÓXIMA pieza de este tipo que se agregue — no
                        toca las que ya están en el armado (esas viven en "Ancho de
                        piezas", más abajo, con su propio control por instancia). */}
                    {pendiente != null && (
                      <div className="mod-pieza-anchos">
                        <span className="mod-ancho-pills-label">Ancho:</span>
                        <button
                          type="button"
                          className={`mod-ancho-pill ${pendiente === 100 ? 'mod-on' : ''}`}
                          disabled={disabled}
                          onClick={() => setAnchoPendienteFor(producto.id, type, 100)}
                        >100 cm</button>
                        <button
                          type="button"
                          className={`mod-ancho-pill ${pendiente === 80 ? 'mod-on' : ''}`}
                          disabled={disabled}
                          onClick={() => setAnchoPendienteFor(producto.id, type, 80)}
                        >80 cm</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <div className="mod-tela-section">
            <div className="mod-lbl">Tela (aplica a todo el armado)</div>
            <div className="mod-chips">
              {GRADOS.map(g => (
                <button key={g} type="button" className={`mod-chip ${gradoSel === g ? 'mod-on' : ''}`} onClick={() => selectGrado(g)}>{g}</button>
              ))}
            </div>
            <select className="mod-dropdown" value={telaSel?.id ?? ''} onChange={e => selectTela(e.target.value)} disabled={telasDelGrado.length === 0}>
              {telasDelGrado.length === 0 && <option value="">No disponible</option>}
              {telasDelGrado.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>)}
            </select>
            <div className="mod-tela-grid-scroll">
              <div className="mod-tela-grid">
                {(telaSel?.colores ?? []).map(color => (
                  <button
                    key={color.id} type="button"
                    className={`mod-tela-card ${colorSel?.id === color.id ? 'mod-on' : ''}`}
                    onClick={() => setColorSel(color)}
                  >
                    <span className="mod-tela-swatch">
                      {color.imagen_url
                        ? <img src={color.imagen_url} alt="" />
                        : <TelaTextura hex={color.codigo_hex} />}
                    </span>
                    <span className="mod-tela-nombre">{color.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            {distribuidor && hayIncompletas && (
              <div className="mod-warning">Alguna pieza seleccionada no tiene precio capturado en Grado {gradoSel} todavía — no se puede cotizar hasta que se complete.</div>
            )}
          </div>
        </div>

        {/* ===== Columna sticky: el armado (plano + piezas + precio) — se
            queda fijo en pantalla mientras la columna de la izquierda se
            desplaza, mismo patrón que .cfg2-viewer usa en Camas/Sofás/
            Escuadras/Chaise Lounge (ver ConfiguradorSticky.css). La barra de
            precio (mod-bar) NO va aquí adentro a propósito: si quedara
            dentro de este contenedor con overflow-y:auto, su "sticky bottom"
            se pegaría al fondo de ESTE panel en vez de al fondo del
            viewport — se queda donde estaba, fuera de mod-layout. */}
        <div className="mod-layout-right">
        <h2 className="mod-armado-title">Tu armado</h2>

        <div className="mod-hint-box">
          {hintSegments.map((seg, i) => seg.b ? <strong key={i}>{seg.b}</strong> : <span key={i}>{seg.t}</span>)}
        </div>

            <div className="mod-lbl-row">
              <div className="mod-lbl">Secuencia armada</div>
              {/* Antes este bloque se desmontaba por completo cuando
                  !hasCorner (sofá lineal, sin esquinero — el espejo no
                  aplica). Reportado 3 veces como "el toggle desapareció":
                  no era un refactor borrándolo, era este unmount, y como
                  nada distingue "no aplica" de "se rompió" cada vez se leía
                  como bug. Ahora el bloque SIEMPRE se monta si hay
                  secuencia; solo se deshabilita cuando no hay esquinero, así
                  se ve gris en vez de ausente. */}
              {sequence.length > 0 && (
                <div className={`mod-orientacion ${!hasCorner ? 'mod-orientacion-disabled' : ''}`} title={!hasCorner ? 'Espejo solo aplica a configuraciones con esquinero' : undefined}>
                  <button type="button" disabled={!hasCorner} className={!mirrored ? 'mod-on' : ''} onClick={() => setMirrored(false)}>Normal</button>
                  <button type="button" disabled={!hasCorner} className={mirrored ? 'mod-on' : ''} onClick={() => setMirrored(true)}>Espejo</button>
                </div>
              )}
            </div>
            {sequence.length === 0 ? (
              <div className="mod-plano-panel mod-plano-panel-empty">
                Selecciona módulos arriba para ver el plano técnico.
              </div>
            ) : (
              <>
                <div className="mod-plano-panel">
                  <div className="mod-plano-titleblock">
                    <div>
                      <div className="mod-plano-titleblock-main">PLANO TÉCNICO — VISTA SUPERIOR</div>
                      <div className="mod-plano-titleblock-sub">{sequence.length} módulo{sequence.length === 1 ? '' : 's'} · escala aprox. · medidas en metros</div>
                    </div>
                    <div className="mod-plano-titleblock-brand">
                      <div>BRENDELL</div>
                      <div className="mod-plano-titleblock-rev">REV. A</div>
                    </div>
                  </div>
                  <div className="mod-plano-canvas">
                    {renderPlano()}
                  </div>
                  <div className="mod-plano-legend">
                    {Array.from(new Set(sequence.map(p => p.type))).map(type => {
                      const count = sequence.filter(p => p.type === type).length
                      return (
                        <span className="mod-plano-legend-item" key={type}>
                          {NOMBRE_POR_TIPO[type]}{count > 1 ? ` ×${count}` : ''}
                        </span>
                      )
                    })}
                    {telaSel?.nombre && <span className="mod-plano-legend-tela">Tela: {telaSel.nombre}</span>}
                  </div>
                </div>
                <div className="mod-hint">Toca una pieza del plano para quitarla (y lo que venga después de ella). Medidas aproximadas — pendientes de confirmar.</div>

                {sequence.some(p => tieneAncho(p.type)) && (
                  <div className="mod-anchos">
                    <div className="mod-lbl">Ancho de piezas</div>
                    {sequence.filter(p => tieneAncho(p.type)).map((p, idx, arr) => {
                      const posicion = arr.slice(0, idx).filter(x => x.type === p.type).length + 1
                      const totalDeTipo = arr.filter(x => x.type === p.type).length
                      const nombre = totalDeTipo > 1 ? `${NOMBRE_POR_TIPO[p.type]} #${posicion}` : NOMBRE_POR_TIPO[p.type]
                      return (
                        <div className="mod-ancho-card" key={p.id}>
                          <span className="mod-ancho-card-nombre">{nombre}</span>
                          <div className="mod-ancho-pills">
                            <span className="mod-ancho-pills-label">Ancho:</span>
                            <button type="button" className={`mod-ancho-pill ${(p.ancho ?? 100) === 100 ? 'mod-on' : ''}`} onClick={() => setAncho(p.id, 100)}>100 cm</button>
                            <button type="button" className={`mod-ancho-pill ${(p.ancho ?? 100) === 80 ? 'mod-on' : ''}`} onClick={() => setAncho(p.id, 80)}>80 cm</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mod-lbl">{nombreArmado} · {tipoArmado}</div>
                <div className="mod-resumen">
                  {lineas.map(l => (
                    <div className="mod-resumen-row" key={l.key}>
                      <span>{l.productoNombre} · {l.piezaNombre} × {l.cantidad}</span>
                      <span>{!distribuidor ? '' : l.precio != null ? fmt(l.precio * l.cantidad) : 'No disponible'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {sequence.length > 0 && (
              <button type="button" className="mod-limpiar" onClick={limpiarArmado}>Limpiar armado</button>
            )}
        </div>
      </div>

      <div className="mod-bar">
          {!distribuidor ? (
            <div className="mod-bar-msg">🔒 Inicia sesión para ver precios como distribuidor</div>
          ) : (
            <>
              <div className="mod-bar-price">
                <small>{sequence.length} pieza{sequence.length === 1 ? '' : 's'} · Precio distribuidor</small>
                <strong>{lineas.length === 0 ? '—' : fmt(total)}</strong>
              </div>
              {lineas.length > 0 && (
                <div className="mod-bar-fabricacion">Tiempo estimado de fabricación: {TIEMPO_FABRICACION}</div>
              )}
              <div className="mod-bar-actions">
                <button type="button" className="cfg-btn cfg-btn-primary" disabled={!puedeGuardar} onClick={() => abrirCotizModal('emitir')}>Crear cotización</button>
                <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!puedeGuardar} onClick={() => abrirCotizModal('borrador')}>Guardar en mi espacio</button>
              </div>
            </>
          )}
        </div>

      {cotizModo && (
        <div className="cfg-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !cotizSaving) cerrarCotizModal() }}>
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
                  <button type="button" className="cfg-btn cfg-btn-secondary" onClick={cerrarCotizModal}>Seguir configurando</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="cfg-modal-title">{cotizModo === 'emitir' ? 'Crear cotización' : 'Guardar borrador'}</h3>
                <p className="cfg-modal-text">Este documento es el que le compartes a tu cliente final.</p>
                <div className="mod-resumen mod-resumen-modal">
                  {lineas.map(l => (
                    <div className="mod-resumen-row" key={l.key}>
                      <span>{l.productoNombre} · {l.piezaNombre} × {l.cantidad}</span>
                      <span>{fmt((l.precio ?? 0) * l.cantidad)}</span>
                    </div>
                  ))}
                </div>
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
                  <span>{fmt(totalCliente)}</span>
                </div>
                <div className="cfg-buttons">
                  <button type="button" className="cfg-btn cfg-btn-primary" disabled={cotizSaving} onClick={confirmarCotizacion}>
                    {cotizSaving ? 'Guardando…' : cotizModo === 'emitir' ? 'Confirmar y emitir' : 'Guardar borrador'}
                  </button>
                  <button type="button" className="cfg-btn cfg-btn-secondary" disabled={cotizSaving} onClick={cerrarCotizModal}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
