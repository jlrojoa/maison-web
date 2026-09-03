// src/pages/configurador/cotizacionPdf/PlanoPagePdf.jsx
//
// Página 2 — plano técnico. Puerto de renderPlano()/renderTile() en
// ModularesConfigurador.jsx a react-pdf: MISMA función splitSofaLayout()
// (importada, no reimplementada) para que el doblez en L nunca se
// desalinee entre pantalla y PDF — solo cambian los primitivos de dibujo
// (View/Svg de react-pdf en vez de <div>/<svg> del DOM).
//
// Espejo (mirrored): se probaron DOS técnicas basadas en flexbox/CSS que
// resultaron no confiables en esta versión de @react-pdf/renderer:
//   1) transform:'scaleX(-1)' en un View — no se aplicaba visualmente en
//      absoluto, pese a que el código fuente del paquete (parse ->
//      normalizeTransformOperation -> handlers) se veía correcto.
//   2) flexDirection:'row-reverse' — SÍ reordenaba las piezas (el
//      Esquinero cambiaba de lado), pero desalineaba las cotas y
//      etiquetas del resto del dibujo (reportado por JL, 2026-09-02;
//      confirmado comparando contra las coordenadas exactas medidas en
//      pantalla vía getBoundingClientRect()).
// En vez de depender de ninguna de las dos, cada pieza/cota se posiciona
// con coordenadas ABSOLUTAS calculadas a mano (mismo cálculo que ya usa
// ModularesConfigurador.jsx para tamaños de tile, solo que aquí en vez de
// dejar que Yoga/flexbox acomode las piezas, se calcula x/y explícito por
// pieza). Espejar es entonces solo aritmética: mirrorX(x, w) = W - x - w
// sobre el ancho total W — sin importar qué tan rara resulte la
// disposición (esquinero + repetidos), la cota y la etiqueta de cada
// pieza SIEMPRE quedan exactamente donde está su pieza porque comparten
// el mismo cálculo de coordenadas, nunca dos rutas de layout separadas
// que puedan desalinearse entre sí.
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { splitSofaLayout } from '../ModularesConfigurador'
import PiezaSvgPdf from './PiezaSvgPdf'
import { DimLineH, DimLineV } from './DimLinePdf'
import { COLORS, BLUEPRINT_PIEZA_COLORS, PAGE_PADDING } from './pdfTheme'
import { fmtFecha } from './fmtPdf'

const TILE_PT = 64
const LABEL_H_PT = 10
const TOP_PAD_PT = 22 // espacio reservado arriba para DimLineH (label + línea)
const DIMV_GAP_PT = 10 // mismo valor que margin-left:10px de .mod-dim-v-anchor en pantalla
const DIMV_WIDTH_PT = 24 // ancho aprox. de DimLineV (línea + texto rotado), mismo criterio que el anchor en pantalla

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
  tileWrap: { position: 'absolute' },
  tileDim: { textAlign: 'center', fontSize: 7, fontWeight: 600, color: COLORS.inkMuted, marginTop: 1 },
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

// `mirrored` pasa directo a PiezaSvgPdf, que espeja la silueta con el
// atributo SVG nativo `transform` (ruta de render distinta a la de View,
// sí funciona) — la etiqueta de texto ("100cm") no se contra-espeja
// porque nunca hay ningún transform en sus contenedores padres.
function Tile({ piece, variant, x, y, widthPt, heightPt, label, mirrored }) {
  const svgH = heightPt - LABEL_H_PT
  return (
    <View style={[s.tileWrap, { left: x, top: y, width: widthPt, height: heightPt }]}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: widthPt, height: svgH }}>
        <PiezaSvgPdf type={variant || piece.type} width={widthPt} height={svgH} colors={BLUEPRINT_PIEZA_COLORS} mirrored={mirrored} />
      </View>
      <Text style={[s.tileDim, { position: 'absolute', left: 0, top: svgH + 1, width: widthPt }]}>{label}</Text>
    </View>
  )
}

function tileSize(piece) {
  const anchoable = piece.type === 'center' || piece.type === 'puff'
  if (!anchoable) return TILE_PT
  const escala = (piece.ancho ?? 100) / 100
  return Math.round(TILE_PT * escala)
}

export default function PlanoPagePdf({ data, empresa }) {
  const { sofaPiezas, puffs, cornerIdx, hasCorner } = splitSofaLayout(data.sequence)
  const mirrored = !!data.mirrored
  // mx(x, w): posición espejada de una pieza que originalmente iba en x
  // (ancho w) dentro de un total W — misma pieza, lado contrario.
  const mx = (W) => (x, w) => (mirrored ? W - x - w : x)

  let tiles = [] // { key, piece, variant, x, y, w, h, label }
  let dimH, dimV
  let containerWidthPt, containerHeightPt

  if (!hasCorner) {
    const W = sofaPiezas.reduce((sum, p) => sum + tileSize(p), 0)
    const mirrorX = mx(W)
    let cursor = 0
    sofaPiezas.forEach(p => {
      const w = tileSize(p)
      tiles.push({ key: p.id, piece: p, x: mirrorX(cursor, w), y: TOP_PAD_PT, w, h: TILE_PT, label: `${p.ancho ?? 100}cm` })
      cursor += w
    })
    if (puffs.length > 0) {
      let pCursor = 0
      const puffsRowY = TOP_PAD_PT + TILE_PT + 2
      puffs.forEach(p => {
        const w = tileSize(p)
        tiles.push({ key: p.id, piece: p, x: mirrorX(pCursor, w), y: puffsRowY, w, h: TILE_PT, label: `${p.ancho ?? 100}cm` })
        pCursor += w
      })
    }
    // BUG CONOCIDO (2026-09-02, sin causa raíz identificada): con esta
    // secuencia de piezas (sin Esquinero: Chaise, Tres/Dos plazas) y
    // Espejo activado, esta línea de cota horizontal (DimLineH) se
    // renderiza desalineada del bloque de piezas — el ancho coincide
    // (dimH.width === W, la misma suma que ocupan las piezas) pero la
    // posición X no, pese a que la aritmética es idéntica a la del caso
    // CON Esquinero (que sí funciona, ver rama `else` abajo). Se probó:
    //   - x:0 vs x:0.01 (epsilon) → mismo resultado, no es un problema de
    //     "0 es falsy" en algún punto del pipeline de react-pdf.
    //   - dar más ancho de sobra al contenedor relativo (containerWidthPt
    //     = W + 50 en vez de exactamente W) → tampoco cambia nada.
    // La diferencia con el caso CON Esquinero es que ahí dimH.x siempre
    // usa un valor NO constante (xOffset + mirrorX(...), nunca 0 literal
    // ni igual al ancho total del contenedor) — mismo patrón de código
    // (View position:'absolute', left/width), así que no es obviamente
    // un bug de "layout de piezas" sino algo específico de este caso
    // particular que aún no se diagnosticó. Pendiente: diagnosticar con
    // calma (posiblemente aislar con un harness de Node/esbuild fuera
    // del navegador, más rápido que el ciclo Supabase->descarga->PDF).
    dimH = { x: 0, width: W, label: `${(data.huellaAnchoCm / 100).toFixed(2)} m` }
    dimV = null
    containerWidthPt = W
    containerHeightPt = TOP_PAD_PT + TILE_PT + (puffs.length > 0 ? 2 + TILE_PT : 0)
  } else {
    const topRow = sofaPiezas.slice(0, cornerIdx)
    const corner = sofaPiezas[cornerIdx]
    const botRow = sofaPiezas.slice(cornerIdx + 1)
    const topRowWidthPt = topRow.reduce((sum, p) => sum + tileSize(p), 0)
    const cornerWidthPt = tileSize(corner) // siempre TILE_PT — el esquinero no escala por ancho
    const W = topRowWidthPt + cornerWidthPt
    const mirrorX = mx(W)
    const xOffset = mirrored ? DIMV_WIDTH_PT + DIMV_GAP_PT : 0

    let cursor = 0
    topRow.forEach(p => {
      const w = tileSize(p)
      tiles.push({ key: p.id, piece: p, x: xOffset + mirrorX(cursor, w), y: TOP_PAD_PT, w, h: TILE_PT, label: `${p.ancho ?? 100}cm` })
      cursor += w
    })
    tiles.push({ key: corner.id, piece: corner, x: xOffset + mirrorX(topRowWidthPt, cornerWidthPt), y: TOP_PAD_PT, w: cornerWidthPt, h: TILE_PT, label: '100cm' })

    const botColX = xOffset + mirrorX(topRowWidthPt, TILE_PT) // esquinero y columna vertical comparten x — quedan a ras
    let rowY = TOP_PAD_PT + TILE_PT
    botRow.forEach(p => {
      tiles.push({ key: p.id, piece: p, variant: p.type === 'right' ? 'right_v' : 'center_v', x: botColX, y: rowY, w: TILE_PT, h: TILE_PT, label: `${p.ancho ?? 100}cm` })
      rowY += TILE_PT
    })
    puffs.forEach(p => {
      tiles.push({ key: p.id, piece: p, x: botColX, y: rowY, w: TILE_PT, h: TILE_PT, label: `${p.ancho ?? 100}cm` })
      rowY += TILE_PT
    })

    dimH = { x: xOffset, width: W, label: `${(data.huellaAnchoCm / 100).toFixed(2)} m` }
    // Altura de DimLineV = esquinero + SOLO botRow (sin puffs) — mismo
    // criterio que botColHeight en ModularesConfigurador.jsx (el Puff no
    // suma a la cota vertical ahí tampoco, aunque sí se dibuja debajo).
    const dimVHeightPt = TILE_PT + botRow.length * TILE_PT
    dimV = {
      x: mirrored ? 0 : xOffset + W + DIMV_GAP_PT,
      y: TOP_PAD_PT,
      height: dimVHeightPt,
      label: `Total: ${(data.huellaProfundidadCm / 100).toFixed(2)} m`,
    }
    containerWidthPt = W + DIMV_GAP_PT + DIMV_WIDTH_PT
    containerHeightPt = TOP_PAD_PT + TILE_PT * (1 + botRow.length + puffs.length)
  }

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
        <View style={{ width: containerWidthPt, height: containerHeightPt, position: 'relative' }}>
          <View style={{ position: 'absolute', left: dimH.x, top: 0, width: dimH.width }}>
            <DimLineH widthPt={dimH.width} label={dimH.label} />
          </View>
          {tiles.map(t => (
            <Tile key={t.key} piece={t.piece} variant={t.variant} x={t.x} y={t.y} widthPt={t.w} heightPt={t.h} label={t.label} mirrored={mirrored} />
          ))}
          {dimV && (
            <View style={{ position: 'absolute', left: dimV.x, top: dimV.y }}>
              <DimLineV heightPt={dimV.height} label={dimV.label} />
            </View>
          )}
        </View>
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
