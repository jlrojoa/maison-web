// src/pages/configurador/cotizacionPdf/PlanoPagePdf.jsx
//
// Página 2 — plano técnico. Puerto de renderPlano()/renderTile() en
// ModularesConfigurador.jsx a react-pdf: MISMA función splitSofaLayout()
// (importada, no reimplementada) para que el doblez en L nunca se
// desalinee entre pantalla y PDF — solo cambian los primitivos de dibujo
// (View/Svg de react-pdf en vez de <div>/<svg> del DOM).
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { splitSofaLayout } from '../ModularesConfigurador'
import PiezaSvgPdf from './PiezaSvgPdf'
import { DimLineH, DimLineV } from './DimLinePdf'
import { COLORS, BLUEPRINT_PIEZA_COLORS, PAGE_PADDING } from './pdfTheme'
import { fmtFecha } from './fmtPdf'

const TILE_PT = 64
const LABEL_H_PT = 10

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
  tileWrap: { position: 'relative' },
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
// atributo SVG nativo `transform` — la etiqueta de texto ("100cm") no
// necesita contra-espejarse porque nunca se aplicó ningún transform al
// contenedor que la envuelve (ver nota en PlanoPagePdf más abajo).
function Tile({ piece, variant, widthPt, heightPt, label, mirrored }) {
  return (
    <View style={s.tileWrap}>
      <PiezaSvgPdf type={variant || piece.type} width={widthPt} height={heightPt - LABEL_H_PT} colors={BLUEPRINT_PIEZA_COLORS} mirrored={mirrored} />
      <Text style={[s.tileDim, { width: widthPt }]}>{label}</Text>
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
  const anchoTotalPt = (hasCorner ? sofaPiezas.slice(0, cornerIdx + 1) : sofaPiezas)
    .reduce((sum, p) => sum + tileSize(p), 0)
  const mirrored = !!data.mirrored

  // Espejo: NO hay transform CSS global sobre todo el plano — se intentó
  // (View { transform: 'scaleX(-1)' }) y no se aplicaba visualmente en
  // esta versión de react-pdf pese a que el pipeline de
  // @react-pdf/stylesheet se veía correcto revisando el código fuente
  // (bug/limitación no resuelta de esa ruta específica). En vez de eso:
  // 1) cada fila se reordena con flexDirection:'row-reverse' (la pieza
  //    que iba primera en el arreglo pasa a dibujarse última, visualmente
  //    a la derecha — mismo resultado que un espejo horizontal del orden)
  // 2) cada PiezaSvgPdf se espeja con el atributo SVG nativo `transform`
  //    (ruta de render de react-pdf distinta a la de View, sí funciona)
  // 3) lo que estaba alineado a la izquierda (columna vertical bajo el
  //    esquinero, fila de puffs) se realinea a la derecha a mano.
  // El espejo NUNCA cambia el orden VERTICAL (de arriba hacia abajo) — un
  // scaleX(-1) real tampoco lo haría, solo voltea horizontal.
  let planoContent
  if (!hasCorner) {
    planoContent = (
      <View style={{ alignItems: mirrored ? 'flex-end' : 'flex-start' }}>
        <DimLineH widthPt={anchoTotalPt} label={`${(data.huellaAnchoCm / 100).toFixed(2)} m`} />
        <View style={{ flexDirection: mirrored ? 'row-reverse' : 'row' }}>
          {sofaPiezas.map(p => <Tile key={p.id} piece={p} widthPt={tileSize(p)} heightPt={TILE_PT} label={`${p.ancho ?? 100}cm`} mirrored={mirrored} />)}
        </View>
        {puffs.length > 0 && (
          <View style={{ flexDirection: mirrored ? 'row-reverse' : 'row', marginTop: 2 }}>
            {puffs.map(p => <Tile key={p.id} piece={p} widthPt={tileSize(p)} heightPt={TILE_PT} label={`${p.ancho ?? 100}cm`} mirrored={mirrored} />)}
          </View>
        )}
      </View>
    )
  } else {
    const topRow = sofaPiezas.slice(0, cornerIdx)
    const corner = sofaPiezas[cornerIdx]
    const botRow = sofaPiezas.slice(cornerIdx + 1)
    const topRowWidthPt = topRow.reduce((sum, p) => sum + tileSize(p), 0)
    const cornerWidthPt = tileSize(corner)
    const botColHeightPt = botRow.reduce((sum, p) => sum + TILE_PT, 0) + puffs.reduce((sum, p) => sum + TILE_PT, 0)

    planoContent = (
      <View style={{ flexDirection: mirrored ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'flex-start' }}>
          <DimLineH widthPt={topRowWidthPt + cornerWidthPt} label={`${(data.huellaAnchoCm / 100).toFixed(2)} m`} />
          <View>
            <View style={{ flexDirection: mirrored ? 'row-reverse' : 'row' }}>
              {topRow.map(p => <Tile key={p.id} piece={p} widthPt={tileSize(p)} heightPt={TILE_PT} label={`${p.ancho ?? 100}cm`} mirrored={mirrored} />)}
              <Tile piece={corner} widthPt={cornerWidthPt} heightPt={TILE_PT} label="100cm" mirrored={mirrored} />
            </View>
            <View style={{ flexDirection: 'column', marginLeft: mirrored ? 0 : topRowWidthPt }}>
              {botRow.map(p => (
                <Tile key={p.id} piece={p} variant={p.type === 'right' ? 'right_v' : 'center_v'} widthPt={TILE_PT} heightPt={TILE_PT} label={`${p.ancho ?? 100}cm`} mirrored={mirrored} />
              ))}
              {puffs.map(p => <Tile key={p.id} piece={p} widthPt={TILE_PT} heightPt={TILE_PT} label={`${p.ancho ?? 100}cm`} mirrored={mirrored} />)}
            </View>
          </View>
        </View>
        <DimLineV heightPt={botColHeightPt + TILE_PT} label={`Total: ${(data.huellaProfundidadCm / 100).toFixed(2)} m`} />
      </View>
    )
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
        {planoContent}
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
