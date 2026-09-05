// src/pages/configurador/cotizacionPdf/DimLinePdf.jsx
//
// Línea de cota (con flechas en los extremos) + etiqueta de medida —
// puerto de .mod-dim/.mod-dim-h/.mod-dim-v (ver ModularesConfigurador.css).
// Devuelve primitivos SVG puros (Line/Polygon/Text) en las coordenadas
// exactas que le pasa PlanoPagePdf.jsx, para insertarlos directo dentro
// de SU <Svg> — nunca un <View>/<Svg> propio, para que cota y piezas
// vivan siempre en el mismo sistema de coordenadas y no puedan
// desalinearse entre sí (ver nota grande en PlanoPagePdf.jsx).
import { Line, Polygon, Text, G } from '@react-pdf/renderer'
import { COLORS } from './pdfTheme'

const ARROW = 5

// DimLineH SIEMPRE vive en coordenadas normales (nunca dentro del <G>
// espejado) — igual que en pantalla, donde la cota horizontal es
// hermana de mod-plano-figure, no hija, así que el espejo (que solo
// voltea el contenido DENTRO de la figura) nunca la toca.
export function DimLineH({ x, y, width, label }) {
  const midX = x + width / 2
  return (
    <>
      <Text x={midX} y={y - 5} textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fontFamily: 'Poppins', color: COLORS.copperText }}>{label}</Text>
      <Line x1={x} y1={y} x2={x + width} y2={y} stroke={COLORS.copperLine} strokeWidth={1} />
      <Polygon points={`${x},${y} ${x + ARROW},${y - 3.5} ${x + ARROW},${y + 3.5}`} fill={COLORS.copperLine} />
      <Polygon points={`${x + width},${y} ${x + width - ARROW},${y - 3.5} ${x + width - ARROW},${y + 3.5}`} fill={COLORS.copperLine} />
    </>
  )
}

// DimLineV SÍ vive dentro del <G> espejado (es hija de la figura, igual
// que en pantalla: .mod-dim-v-anchor cuelga de .mod-plano-figure, así
// que el espejo la mueve de lado con el resto). Su línea/flechas son
// simétricas por diseño así que heredar el espejo no las distorsiona;
// solo la ETIQUETA (el texto) se contra-espeja con su propio <G
// transform="scale(-1,1)"> para que no salga al revés — mismo truco que
// ".mod-plano-mirrored .mod-dim-label { transform: scaleX(-1) }" en
// ModularesConfigurador.css.
export function DimLineV({ x, y, height, label, mirrored }) {
  const midY = y + height / 2
  // labelX se aleja de la línea hacia x+ (nunca hacia las piezas, que
  // quedan del lado x- de esta línea tanto espejado como no — el
  // espejo se aplica DESPUÉS, como transform del <G> padre). Antes
  // (x-3) el "grueso" del texto tras rotate(-90) caía del lado x- del
  // pivote y llegaba a encimarse con las piezas — bug real, reportado
  // 2026-09-03, independiente de qué lado termina la cota completa.
  const labelX = x + 8
  return (
    <>
      <Line x1={x} y1={y} x2={x} y2={y + height} stroke={COLORS.copperLine} strokeWidth={1} />
      <Polygon points={`${x},${y} ${x - 3.5},${y + ARROW} ${x + 3.5},${y + ARROW}`} fill={COLORS.copperLine} />
      <Polygon points={`${x},${y + height} ${x - 3.5},${y + height - ARROW} ${x + 3.5},${y + height - ARROW}`} fill={COLORS.copperLine} />
      <G transform={`translate(${labelX},${midY})`}>
        <G transform={mirrored ? 'scale(-1,1)' : undefined}>
          <G transform="rotate(-90)">
            <Text x={0} y={0} textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fontFamily: 'Poppins', color: COLORS.copperText }}>{label}</Text>
          </G>
        </G>
      </G>
    </>
  )
}

// Cotas arquitectónicas de dos niveles (rediseño 2026-09-04, referencia
// Veka) — puerto exacto de DimChainH/DimChainV en ModularesConfigurador.jsx
// a primitivos SVG: una cota Total (más alejada) + una fila/columna de
// cotas individuales (una por pieza, mismo offset, formando una cadena
// contigua reutilizando DimLineH/DimLineV para cada segmento) + líneas
// de extensión finas que conectan cada borde de pieza con ambas cotas.
// Debe verse IDÉNTICO a su contraparte de pantalla — mismo criterio de
// paridad screen/PDF que el resto de este archivo.
export function DimChainH({ segments, innerY, outerY, pieceEdgeY, totalWidth, totalLabel }) {
  const boundaries = [0, ...segments.map(s => s.x + s.width)]
  return (
    <>
      <DimLineH x={0} y={outerY} width={totalWidth} label={totalLabel} />
      {segments.map((s, i) => <DimLineH key={i} x={s.x} y={innerY} width={s.width} label={s.label} />)}
      {boundaries.map((x, i) => (
        <Line key={i} x1={x} y1={outerY} x2={x} y2={pieceEdgeY} stroke={COLORS.copperLine} strokeWidth={0.5} strokeOpacity={0.4} />
      ))}
    </>
  )
}

export function DimChainV({ segments, innerX, outerX, pieceEdgeX, totalHeight, totalLabel, individualOffset = 0, mirrored }) {
  const boundaries = individualOffset > 0 ? [0, individualOffset] : [0]
  let cursor = individualOffset
  segments.forEach(s => { cursor += s.height; boundaries.push(cursor) })
  return (
    <>
      {segments.map((s, i) => <DimLineV key={i} x={innerX} y={s.y} height={s.height} label={s.label} mirrored={mirrored} />)}
      <DimLineV x={outerX} y={0} height={totalHeight} label={totalLabel} mirrored={mirrored} />
      {boundaries.map((y, i) => (
        <Line key={i} x1={pieceEdgeX} y1={y} x2={outerX} y2={y} stroke={COLORS.copperLine} strokeWidth={0.5} strokeOpacity={0.4} />
      ))}
    </>
  )
}
