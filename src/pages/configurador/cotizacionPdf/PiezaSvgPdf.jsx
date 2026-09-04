// src/pages/configurador/cotizacionPdf/PiezaSvgPdf.jsx
//
// Puerto 1:1 de PiezaSVG.jsx (mismos paths, mismo espacio local 0-120) a
// los primitivos de @react-pdf/renderer (Rect/Line/Polygon en vez de las
// etiquetas <svg> del DOM). Cualquier ajuste a una silueta en
// PiezaSVG.jsx debe replicarse aquí a mano para que el plano en pantalla
// y el del PDF no se desalineen.
//
// Solo devuelve las FORMAS, en su espacio local 0-120 — quien lo usa
// (PlanoPagePdf.jsx) las envuelve en un <G transform="translate(x,y)
// scale(w/120,h/120)"> para ubicarlas y escalarlas. No tiene lógica de
// espejo propia (igual que PiezaSVG.jsx en pantalla, que tampoco la
// tiene) — el espejo se aplica UNA sola vez, en el <G> que envuelve TODA
// la figura en PlanoPagePdf.jsx, y esta silueta lo hereda sin más, igual
// que en pantalla.
import { Rect, Line, Polygon, Circle } from '@react-pdf/renderer'

export default function PiezaSvgPdf({ type, colors }) {
  const { fill, seat, back, stroke } = colors
  const sw = { stroke, strokeWidth: 1.5 }
  const swThin = { stroke, strokeWidth: 0.5 }

  if (type === 'left') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={0} y={0} width={120} height={22} fill={back} {...sw} />
      <Rect x={0} y={0} width={22} height={120} fill={back} {...sw} />
      <Rect x={26} y={26} width={88} height={88} rx={1} fill={seat} {...swThin} />
      <Line x1={26} y1={73} x2={114} y2={73} stroke={stroke} strokeWidth={0.5} opacity={0.35} />
    </>)
  }
  if (type === 'center') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={0} y={0} width={120} height={22} fill={back} {...sw} />
      <Rect x={4} y={26} width={112} height={88} rx={1} fill={seat} {...swThin} />
      <Line x1={4} y1={73} x2={116} y2={73} stroke={stroke} strokeWidth={0.5} opacity={0.35} />
    </>)
  }
  if (type === 'right') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={0} y={0} width={120} height={22} fill={back} {...sw} />
      <Rect x={98} y={0} width={22} height={120} fill={back} {...sw} />
      <Rect x={6} y={26} width={88} height={88} rx={1} fill={seat} {...swThin} />
      <Line x1={6} y1={73} x2={94} y2={73} stroke={stroke} strokeWidth={0.5} opacity={0.35} />
    </>)
  }
  if (type === 'corner') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={0} y={0} width={120} height={22} fill={back} {...sw} />
      <Rect x={98} y={0} width={22} height={120} fill={back} {...sw} />
      <Polygon points="4,26 54,26 54,66 94,66 94,114 4,114" fill={seat} stroke={stroke} strokeWidth={0.5} />
    </>)
  }
  if (type === 'center_v') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={98} y={0} width={22} height={120} fill={back} {...sw} />
      <Rect x={4} y={4} width={90} height={112} rx={1} fill={seat} {...swThin} />
      <Line x1={50} y1={4} x2={50} y2={116} stroke={stroke} strokeWidth={0.5} opacity={0.35} />
    </>)
  }
  if (type === 'right_v') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={98} y={0} width={22} height={120} fill={back} {...sw} />
      <Rect x={0} y={98} width={120} height={22} fill={back} {...sw} />
      <Rect x={4} y={4} width={90} height={90} rx={1} fill={seat} {...swThin} />
      <Line x1={50} y1={4} x2={50} y2={94} stroke={stroke} strokeWidth={0.5} opacity={0.35} />
    </>)
  }
  if (type === 'puff') {
    return (<>
      <Rect x={0} y={0} width={120} height={120} fill={fill} {...sw} />
      <Rect x={10} y={10} width={100} height={100} rx={3} fill={seat} {...swThin} />
      <Line x1={60} y1={10} x2={60} y2={110} stroke={stroke} strokeWidth={0.5} opacity={0.3} />
      <Line x1={10} y1={60} x2={110} y2={60} stroke={stroke} strokeWidth={0.5} opacity={0.3} />
      <Circle cx={35} cy={35} r={2.5} fill={stroke} opacity={0.2} />
      <Circle cx={85} cy={35} r={2.5} fill={stroke} opacity={0.2} />
      <Circle cx={35} cy={85} r={2.5} fill={stroke} opacity={0.2} />
      <Circle cx={85} cy={85} r={2.5} fill={stroke} opacity={0.2} />
    </>)
  }
  return null
}
