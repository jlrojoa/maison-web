// src/pages/configurador/cotizacionPdf/DimLinePdf.jsx
//
// Puerto de .mod-dim/.mod-dim-h/.mod-dim-v (línea de cota con flechas en
// los extremos, ver ModularesConfigurador.css) a primitivos de react-pdf.
// El truco CSS de bordes-transparentes para las flechas no tiene
// equivalente directo en react-pdf, así que las flechas se dibujan como
// <Polygon> dentro de un <Svg> — mismo resultado visual, otra técnica.
import { View, Text, Svg, Line, Polygon } from '@react-pdf/renderer'
import { COLORS } from './pdfTheme'

const ARROW = 5 // mismo tamaño que los bordes de 5px en CSS

export function DimLineH({ widthPt, label }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 4 }}>
      <Text style={{ fontSize: 8, fontWeight: 700, color: COLORS.copperText, marginBottom: 2 }}>{label}</Text>
      <Svg width={widthPt} height={8}>
        <Line x1={0} y1={4} x2={widthPt} y2={4} stroke={COLORS.copperLine} strokeWidth={1} />
        <Polygon points={`0,4 ${ARROW},0.5 ${ARROW},7.5`} fill={COLORS.copperLine} />
        <Polygon points={`${widthPt},4 ${widthPt - ARROW},0.5 ${widthPt - ARROW},7.5`} fill={COLORS.copperLine} />
      </Svg>
    </View>
  )
}

export function DimLineV({ heightPt, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg width={8} height={heightPt}>
        <Line x1={4} y1={0} x2={4} y2={heightPt} stroke={COLORS.copperLine} strokeWidth={1} />
        <Polygon points={`4,0 0.5,${ARROW} 7.5,${ARROW}`} fill={COLORS.copperLine} />
        <Polygon points={`4,${heightPt} 0.5,${heightPt - ARROW} 7.5,${heightPt - ARROW}`} fill={COLORS.copperLine} />
      </Svg>
      <Text style={{
        fontSize: 8, fontWeight: 700, color: COLORS.copperText, marginLeft: 3,
        transform: 'rotate(-90deg)', transformOrigin: 'left top',
      }}>{label}</Text>
    </View>
  )
}
