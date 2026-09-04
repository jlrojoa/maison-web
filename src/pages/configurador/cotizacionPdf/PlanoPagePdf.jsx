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
// Cada etiqueta de texto (100cm, Total: X m) se contra-espeja con su
// propio <G transform="scale(-1,1)"> anidado para que el texto no
// salga al revés. Las siluetas de las piezas SÍ heredan el espejo sin
// contra-espejarse, igual que en pantalla.
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
import { DimLineH, DimLineV } from './DimLinePdf'
import { COLORS, BLUEPRINT_PIEZA_COLORS, PAGE_PADDING } from './pdfTheme'
import { fmtFecha } from './fmtPdf'

const TILE_PT = 64
const LABEL_BAND_PT = 10 // franja reservada abajo de cada pieza para su medida — mismo criterio que LABEL_H en pantalla
const TOP_PAD_PT = 22 // espacio arriba de las piezas para la cota horizontal
const DIMV_GAP_PT = 10 // mismo valor que margin-left:10px de .mod-dim-v-anchor en pantalla
const DIMV_LABEL_PT = 24 // espacio reservado para la línea + etiqueta rotada de la cota vertical

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
function labelDe(piece) {
  return `${tieneAncho(piece.type) ? (piece.ancho ?? 100) : 100}cm`
}

// Una pieza: su silueta (hereda el espejo del <G> padre, sin contra-
// espejarse) + su etiqueta de medida (SÍ se contra-espeja, ver nota de
// arriba). x/y/w/h ya vienen en coordenadas normales (pre-espejo).
function Tile({ x, y, w, h, type, label, mirrored }) {
  const artH = h - LABEL_BAND_PT
  return (
    <>
      <G transform={`translate(${x},${y}) scale(${w / 120},${artH / 120})`}>
        <PiezaSvgPdf type={type} colors={BLUEPRINT_PIEZA_COLORS} />
      </G>
      <G transform={`translate(${x + w / 2},${y + artH + LABEL_BAND_PT - 2})`}>
        <G transform={mirrored ? 'scale(-1,1)' : undefined}>
          <Text x={0} y={0} textAnchor="middle" style={{ fontSize: 7, fontWeight: 600, fontFamily: 'Poppins', color: COLORS.inkMuted }}>{label}</Text>
        </G>
      </G>
    </>
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
  let dimV = null // { x, y, height, label } o null si no aplica

  if (!hasCorner) {
    let cursor = 0
    sofaPiezas.forEach(p => {
      const w = tileSize(p)
      tiles.push({ key: p.id, x: cursor, y: 0, w, h: TILE_PT, type: p.type, label: labelDe(p) })
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
        tiles.push({ key: p.id, x: pCursor, y: puffRowY, w, h: TILE_PT, type: p.type, label: labelDe(p) })
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
      tiles.push({ key: p.id, x: cursor, y: 0, w, h: TILE_PT, type: p.type, label: labelDe(p) })
      cursor += w
    })
    const topRowWidth = cursor
    tiles.push({ key: corner.id, x: topRowWidth, y: 0, w: TILE_PT, h: TILE_PT, type: 'corner', label: '100cm' })

    // La columna vertical cuelga directo debajo del Esquinero (mismo x),
    // igual que marginLeft:topRowWidth en pantalla — quedan a ras. Los
    // Puffs siguen apilados en la MISMA columna, sin hueco (rowY sigue
    // corriendo sin saltos entre botRow y puffs).
    let rowY = TILE_PT
    botRow.forEach(p => {
      const h = tileSize(p)
      const variant = p.type === 'right' ? 'right_v' : 'center_v'
      tiles.push({ key: p.id, x: topRowWidth, y: rowY, w: TILE_PT, h, type: variant, label: labelDe(p) })
      rowY += h
    })
    puffs.forEach(p => {
      const h = tileSize(p)
      tiles.push({ key: p.id, x: topRowWidth, y: rowY, w: TILE_PT, h, type: p.type, label: labelDe(p) })
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
        x: figureWidth + DIMV_GAP_PT,
        y: 0,
        height: columnaCompletaHeight,
        label: `Total: ${(data.huellaProfundidadCm / 100).toFixed(2)} m`,
      }
    }
  }

  const hasDimV = !!dimV
  const sideMargin = hasDimV ? DIMV_GAP_PT + DIMV_LABEL_PT : 0
  const svgWidth = sideMargin + figureWidth + sideMargin
  const svgHeight = TOP_PAD_PT + figureHeight + 4
  const dimHLabel = `${(data.huellaAnchoCm / 100).toFixed(2)} m`

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
            <DimLineH x={0} y={-6} width={dimHWidth} label={dimHLabel} />

            <G transform={mirrored ? `translate(${figureWidth},0) scale(-1,1)` : undefined}>
              {tiles.map(t => (
                <Tile key={t.key} x={t.x} y={t.y} w={t.w} h={t.h} type={t.type} label={t.label} mirrored={mirrored} />
              ))}
              {dimV && <DimLineV x={dimV.x} y={dimV.y} height={dimV.height} label={dimV.label} mirrored={mirrored} />}
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
