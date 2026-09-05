// src/pages/configurador/cotizacionPdf/PlanoPagePdf.jsx
//
// Página 2 — plano técnico. Puerto de renderPlano()/renderTile() en
// ModularesConfigurador.jsx a react-pdf: MISMA función splitSofaLayout()
// (importada, no reimplementada) para que el doblez en L nunca se
// desalinee entre pantalla y PDF.
//
// Reescrito 2026-09-03. TODO el dibujo — piezas, líneas de cota,
// etiquetas — vive dentro de UN SOLO <Svg>, con coordenadas derivadas
// de la MISMA fuente (splitSofaLayout + tileSize) para piezas y cotas a
// la vez. Adentro de un <Svg>, react-pdf resuelve todo por el motor de
// SVG (resolveSvg), NUNCA por Yoga — así se evita el motor que venía
// desalineando cotas y piezas en los dos intentos anteriores (ver
// historial de commits).
//
// Espejo: el layout se calcula SIEMPRE en coordenadas normales — como
// si nunca hubiera espejo, igual que ModularesConfigurador.jsx/
// renderPlano() — y el espejo se aplica UNA sola vez, como transform de
// UN <G> que envuelve TODA la figura (piezas + cota vertical, si la
// hay): mismo truco que ".mod-plano-mirrored { transform: scaleX(-1) }"
// en ModularesConfigurador.css, que espeja mod-plano-figure completo
// (nunca la cota horizontal, que es hermana, no hija, de la figura).
// Cada etiqueta de texto de la cadena de cotas (1.00 m, Total: X m) se
// contra-espeja con su propio <G transform="scale(-1,1)"> anidado para
// que el texto no salga al revés. Las siluetas de las piezas SÍ heredan
// el espejo sin contra-espejarse, igual que en pantalla. Las piezas ya
// no llevan etiqueta de medida propia — ver comentario en Tile() más
// abajo (rediseño 2026-09-04, JL).
//
// NOTA DE RENDIMIENTO (2026-09-03/04, pendiente, ver PROJECT.md /
// conversación con JL): `pdf().toBlob()` con esta estructura tarda
// ~40-90s (antes del rewrite tardaba ~2-4s). Se probó aplanar el
// anidamiento (un <G> por pieza con el espejo resuelto a mano en JS en
// vez de un <G> envolvente + contra-espejo por etiqueta) esperando que
// fuera la causa — el resultado fue PEOR (nunca terminó, >4 minutos,
// tab sin responder). No se identificó la causa raíz todavía; queda
// pendiente como tarea aparte, priorizada después de cerrar la
// geometría. No repetir el aplanado sin antes entender por qué empeoró.
import { Page, View, Text, Svg, G, StyleSheet } from '@react-pdf/renderer'
import { splitSofaLayout } from '../ModularesConfigurador'
import PiezaSvgPdf from './PiezaSvgPdf'
import { DimChainH, DimChainV } from './DimLinePdf'
import { COLORS, BLUEPRINT_PIEZA_COLORS, PAGE_PADDING } from './pdfTheme'
import { fmtFecha } from './fmtPdf'

const TILE_PT = 64

// Cotas arquitectónicas de dos niveles (rediseño 2026-09-04, referencia
// Veka — ver comentario grande en DimLinePdf.jsx/DimChainH/DimChainV):
// fila/columna individual (una cota por pieza, offset fijo) + cota
// Total aparte, más alejada. Estos offsets son puerto directo de los
// constantes equivalentes en ModularesConfigurador.jsx (DIM_CHAIN_V_*).
const DIM_H_INNER_Y = -10 // línea de la fila individual (encima de las piezas)
const DIM_H_OUTER_Y = -26 // línea de la fila Total (más arriba, más alejada)
const TOP_PAD_PT = 36 // espacio arriba de las piezas para ambas filas de cota + sus etiquetas
const DIM_V_INNER_GAP_PT = 10 // separación entre las piezas y la columna individual
const DIM_V_COL_GAP_PT = 24 // separación entre la columna individual y la columna Total
const DIMV_LABEL_PT = 24 // espacio reservado a la derecha de la columna Total para su etiqueta rotada

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Poppins', fontSize: 9, color: COLORS.ink },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  brand: { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  brandSub: { fontSize: 7, color: COLORS.inkMuted, letterSpacing: 1, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  titulo: { fontSize: 9, fontWeight: 700, color: COLORS.copperText, letterSpacing: 0.5 },
  fecha: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2 },
  // Beige en vez de negro (pedido de JL, 2026-09-02) — SOLO este PDF, ver pdfTheme.js.
  hr: { borderBottomWidth: 3, borderBottomColor: COLORS.accentBg, marginTop: 8, marginBottom: 18 },
  panel: {
    backgroundColor: COLORS.panelBg, borderRadius: 8, padding: 20,
    minHeight: 300, alignItems: 'center', justifyContent: 'center',
  },
  cards: { flexDirection: 'row', gap: 10, marginTop: 18 },
  card: { flex: 1, backgroundColor: COLORS.fillNeutro, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  cardLabel: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.8, marginBottom: 3 },
  cardValue: { fontSize: 11, fontWeight: 600, color: COLORS.ink },
  footerHr: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 24, paddingTop: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { fontSize: 8 },
  footerBold: { fontWeight: 700 },
  footerMuted: { color: COLORS.inkMuted },
  footerRight: { fontSize: 8, color: COLORS.inkMuted, textAlign: 'right' },
})

const tieneAncho = (type) => type === 'center' || type === 'puff'
function tileSize(piece) {
  if (!tieneAncho(piece.type)) return TILE_PT
  return Math.round(TILE_PT * ((piece.ancho ?? 100) / 100))
}
function metrosLabelDe(piece) {
  const m = tieneAncho(piece.type) ? (piece.ancho ?? 100) / 100 : 1
  return `${m.toFixed(2)} m`
}

// Una pieza: solo su silueta (hereda el espejo del <G> padre, sin
// contra-espejarse) — SIN etiqueta de medida propia. Esa información
// ahora la da exclusivamente la cadena de cotas (DimChainH/DimChainV);
// mostrarla también aquí duplicaba la medida y obligaba a encoger el
// arte para reservarle una franja (reportado por JL, 2026-09-04). x/y/w/h
// ya vienen en coordenadas normales (pre-espejo) y son el tile COMPLETO
// — el arte ya no reserva nada, lo ocupa entero.
function Tile({ x, y, w, h, type }) {
  return (
    <G transform={`translate(${x},${y}) scale(${w / 120},${h / 120})`}>
      <PiezaSvgPdf type={type} colors={BLUEPRINT_PIEZA_COLORS} />
    </G>
  )
}

export default function PlanoPagePdf({ data, empresa }) {
  const { sofaPiezas, puffs, cornerIdx, hasCorner } = splitSofaLayout(data.sequence)
  const mirrored = !!data.mirrored

  // Todo lo de abajo se calcula en coordenadas NORMALES (como si nunca
  // hubiera espejo) — ver nota grande arriba del archivo.
  let tiles = [] // { key, x, y, w, h, type, label } — en coords normales
  let figureWidth, figureHeight
  let dimHWidth
  let dimHSegments = [] // { x, width, label } — cadena de cotas individuales horizontal
  let dimV = null // { individualSegments, individualOffset, totalHeight, totalLabel } o null si no aplica

  if (!hasCorner) {
    let cursor = 0
    sofaPiezas.forEach(p => {
      const w = tileSize(p)
      tiles.push({ key: p.id, x: cursor, y: 0, w, h: TILE_PT, type: p.type })
      dimHSegments.push({ x: cursor, width: w, label: metrosLabelDe(p) })
      cursor += w
    })
    const sofaRowWidth = cursor
    let puffRowWidth = 0
    let puffRowY = 0
    if (puffs.length > 0) {
      // A ras de la fila de sofá, sin hueco — igual que .mod-plano (flex
      // column sin gap) en pantalla (reportado por JL, 2026-09-04).
      puffRowY = TILE_PT
      let pCursor = 0
      puffs.forEach(p => {
        const w = tileSize(p)
        tiles.push({ key: p.id, x: pCursor, y: puffRowY, w, h: TILE_PT, type: p.type })
        pCursor += w
      })
      puffRowWidth = pCursor
    }
    dimHWidth = sofaRowWidth // la cota horizontal solo mide la fila de sofá, igual que anchoTotalPx en pantalla
    figureWidth = Math.max(sofaRowWidth, puffRowWidth)
    figureHeight = puffs.length > 0 ? puffRowY + TILE_PT : TILE_PT
  } else {
    const topRow = sofaPiezas.slice(0, cornerIdx)
    const corner = sofaPiezas[cornerIdx]
    const botRow = sofaPiezas.slice(cornerIdx + 1)

    let cursor = 0
    topRow.forEach(p => {
      const w = tileSize(p)
      tiles.push({ key: p.id, x: cursor, y: 0, w, h: TILE_PT, type: p.type })
      dimHSegments.push({ x: cursor, width: w, label: metrosLabelDe(p) })
      cursor += w
    })
    const topRowWidth = cursor
    tiles.push({ key: corner.id, x: topRowWidth, y: 0, w: TILE_PT, h: TILE_PT, type: 'corner' })
    dimHSegments.push({ x: topRowWidth, width: TILE_PT, label: '1.00 m' })

    // La columna vertical cuelga directo debajo del Esquinero (mismo x),
    // igual que marginLeft:topRowWidth en pantalla — quedan a ras. Los
    // Puffs siguen apilados en la MISMA columna, sin hueco (rowY sigue
    // corriendo sin saltos entre botRow y puffs).
    let rowY = TILE_PT
    const dimVSegments = [] // { y, height, label } — solo botRow+puffs, el Esquinero NO tiene cota individual propia (ya la cubre la cota horizontal)
    botRow.forEach(p => {
      const h = tileSize(p)
      const variant = p.type === 'right' ? 'right_v' : 'center_v'
      tiles.push({ key: p.id, x: topRowWidth, y: rowY, w: TILE_PT, h, type: variant })
      dimVSegments.push({ y: rowY, height: h, label: metrosLabelDe(p) })
      rowY += h
    })
    puffs.forEach(p => {
      const h = tileSize(p)
      tiles.push({ key: p.id, x: topRowWidth, y: rowY, w: TILE_PT, h, type: p.type })
      dimVSegments.push({ y: rowY, height: h, label: metrosLabelDe(p) })
      rowY += h
    })
    // Decisión de JL (2026-09-04): la cota vertical mide la columna
    // COMPLETA (Esquinero + botRow + Puffs) — antes excluía los Puffs
    // (igual que hacía botColHeight en pantalla), lo que contradecía la
    // tarjeta "Profundidad total" (que sí los suma). rowY ya incluye
    // todo en este punto, así que la cota es simplemente rowY.
    const columnaCompletaHeight = rowY

    figureWidth = topRowWidth + TILE_PT
    figureHeight = rowY
    dimHWidth = figureWidth

    if (columnaCompletaHeight > TILE_PT) {
      dimV = {
        individualSegments: dimVSegments,
        individualOffset: TILE_PT, // ancho del Esquinero — su tramo ya está cubierto por la cota horizontal
        totalHeight: columnaCompletaHeight,
        totalLabel: `Total: ${(data.huellaProfundidadCm / 100).toFixed(2)} m`,
      }
    }
  }

  const hasDimV = !!dimV
  const dimVWidth = DIM_V_INNER_GAP_PT + DIM_V_COL_GAP_PT + DIMV_LABEL_PT
  const sideMargin = hasDimV ? dimVWidth : 0
  const svgWidth = sideMargin + figureWidth + sideMargin
  const svgHeight = TOP_PAD_PT + figureHeight + 4
  const dimHLabel = `Total: ${(data.huellaAnchoCm / 100).toFixed(2)} m`

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.brand}>BRENDELL MODULAR</Text>
          <Text style={s.brandSub}>PRESENTADO POR {empresa.razonSocial.toUpperCase()}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.titulo}>PLANO TÉCNICO · {data.folio}</Text>
          <Text style={s.fecha}>{fmtFecha(data.fecha)}</Text>
        </View>
      </View>
      <View style={s.hr} />

      <View style={s.panel}>
        <Svg width={svgWidth} height={svgHeight}>
          <G transform={`translate(${sideMargin},${TOP_PAD_PT})`}>
            {/* Cota horizontal: SIEMPRE en coordenadas normales, nunca
                dentro del <G> espejado — igual que en pantalla, donde es
                hermana de mod-plano-figure, no hija. */}
            <DimChainH
              segments={dimHSegments}
              innerY={DIM_H_INNER_Y}
              outerY={DIM_H_OUTER_Y}
              pieceEdgeY={0}
              totalWidth={dimHWidth}
              totalLabel={dimHLabel}
            />

            <G transform={mirrored ? `translate(${figureWidth},0) scale(-1,1)` : undefined}>
              {tiles.map(t => (
                <Tile key={t.key} x={t.x} y={t.y} w={t.w} h={t.h} type={t.type} />
              ))}
              {dimV && (
                <DimChainV
                  segments={dimV.individualSegments}
                  innerX={figureWidth + DIM_V_INNER_GAP_PT}
                  outerX={figureWidth + DIM_V_INNER_GAP_PT + DIM_V_COL_GAP_PT}
                  pieceEdgeX={figureWidth}
                  totalHeight={dimV.totalHeight}
                  totalLabel={dimV.totalLabel}
                  individualOffset={dimV.individualOffset}
                  mirrored={mirrored}
                />
              )}
            </G>
          </G>
        </Svg>
      </View>

      <View style={s.cards}>
        <View style={s.card}>
          <Text style={s.cardLabel}>TONO</Text>
          <Text style={s.cardValue}>{data.colorNombre || '—'}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>PIEZAS</Text>
          <Text style={s.cardValue}>{data.totalPiezas} módulos</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>ANCHO TOTAL</Text>
          <Text style={s.cardValue}>{data.huellaAnchoCm} cm</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>PROFUNDIDAD TOTAL</Text>
          <Text style={s.cardValue}>{data.huellaProfundidadCm} cm</Text>
        </View>
      </View>

      <View style={s.footerHr}>
        <View style={s.footerRow}>
          <View style={{ maxWidth: 430 }}>
            <Text style={[s.footerLeft, s.footerBold]}>Brendell Modular · {empresa.razonSocial}</Text>
            <Text style={[s.footerLeft, s.footerMuted]}>RFC: {empresa.rfc}</Text>
            <Text style={[s.footerLeft, s.footerMuted]}>{empresa.direccion}</Text>
          </View>
          <View>
            <Text style={s.footerRight}>{empresa.telefono}</Text>
            <Text style={s.footerRight}>{empresa.email}</Text>
          </View>
        </View>
      </View>
    </Page>
  )
}
