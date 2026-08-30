// src/pages/configurador/PiezaSVG.jsx
//
// Diagrama esquemático de cada pieza para el PLANO/armado — puerto de
// makeSVG() en bayside.html (prototipo de referencia de JL, no forma parte
// del repo, ver .gitignore). A propósito NO usa fotos reales: las fotos de
// Shopify tienen ángulos de cámara distintos entre piezas y, puestas una
// junto a otra en el armado, se ven descuadradas. El esquema se ve limpio
// sin importar la foto — las fotos reales SOLO van en las tarjetas de
// selección (grid "Selecciona Módulos"), no aquí.
//
// bayside.html trae colores fijos por colección inventada (fill/seat/back/
// stroke por swatch). Maison no tiene esos 4 tonos por color — solo un
// codigo_hex real por color de tela — así que se derivan por tinte/sombra
// del mismo hex real seleccionado, en vez de inventar una paleta nueva.
function clamp(n) { return Math.max(0, Math.min(255, n)) }

function mix(hex, target, amount) {
  const h = (hex || '#C4B49A').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  const [tr, tg, tb] = target
  const mixCh = (c, t) => clamp(Math.round(c + (t - c) * amount))
  const toHex = n => n.toString(16).padStart(2, '0')
  return `#${toHex(mixCh(r, tr))}${toHex(mixCh(g, tg))}${toHex(mixCh(b, tb))}`
}

// fill = color real de la tela; seat = más claro (cojín, luz); back = claro
// medio (respaldo); stroke = más oscuro (contorno) — mismo rol que en
// bayside.html, derivado del único hex real en vez de 4 tonos inventados.
export function colorsFromHex(hex) {
  const fill = hex || '#C4B49A'
  return {
    fill,
    seat: mix(fill, [255, 255, 255], 0.55),
    back: mix(fill, [255, 255, 255], 0.3),
    stroke: mix(fill, [0, 0, 0], 0.4),
  }
}

// Mismos paths que makeSVG() en bayside.html, viewBox 0 0 120 120. width/height
// pueden diferir (no solo `size`) para que el rectángulo refleje el ancho
// relativo elegido por pieza (100cm/80cm) — el viewBox fijo se estira sin
// uniformidad, aceptable para un esquema aproximado pendiente de confirmar.
export default function PiezaSVG({ type, size, width, height, colors }) {
  const w = width ?? size ?? 90
  const h = height ?? size ?? 90
  const { fill, seat, back, stroke } = colors
  const sw = { stroke, strokeWidth: 1.5 }
  const swThin = { stroke, strokeWidth: 0.5 }

  let content = null
  if (type === 'left') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="0" y="0" width="120" height="22" fill={back} {...sw} />
      <rect x="0" y="0" width="22" height="120" fill={back} {...sw} />
      <rect x="26" y="26" width="88" height="88" rx="1" fill={seat} {...swThin} />
      <line x1="26" y1="73" x2="114" y2="73" {...swThin} opacity="0.35" />
    </>)
  } else if (type === 'center') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="0" y="0" width="120" height="22" fill={back} {...sw} />
      <rect x="4" y="26" width="112" height="88" rx="1" fill={seat} {...swThin} />
      <line x1="4" y1="73" x2="116" y2="73" {...swThin} opacity="0.35" />
    </>)
  } else if (type === 'right') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="0" y="0" width="120" height="22" fill={back} {...sw} />
      <rect x="98" y="0" width="22" height="120" fill={back} {...sw} />
      <rect x="6" y="26" width="88" height="88" rx="1" fill={seat} {...swThin} />
      <line x1="6" y1="73" x2="94" y2="73" {...swThin} opacity="0.35" />
    </>)
  } else if (type === 'corner') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="0" y="0" width="120" height="22" fill={back} {...sw} />
      <rect x="98" y="0" width="22" height="120" fill={back} {...sw} />
      {/* Único tipo cuyo footprint completo (0,0 120,120 arriba) sigue
          siendo cuadrado — tiene que calzar a ras con el tile de arriba y
          el de abajo en el doblez en L (splitSofaLayout). Lo que lo
          distingue del resto es el asiento: un polígono en L, no un
          rectángulo — el corte hacia el interior donde se dobla el
          armado, en vez de una caja idéntica a 'right'. */}
      <polygon points="4,26 54,26 54,66 94,66 94,114 4,114" fill={seat} {...swThin} />
    </>)
  } else if (type === 'center_v') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="98" y="0" width="22" height="120" fill={back} {...sw} />
      <rect x="4" y="4" width="90" height="112" rx="1" fill={seat} {...swThin} />
      <line x1="50" y1="4" x2="50" y2="116" {...swThin} opacity="0.35" />
    </>)
  } else if (type === 'right_v') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="98" y="0" width="22" height="120" fill={back} {...sw} />
      <rect x="0" y="98" width="120" height="22" fill={back} {...sw} />
      <rect x="4" y="4" width="90" height="90" rx="1" fill={seat} {...swThin} />
      <line x1="50" y1="4" x2="50" y2="94" {...swThin} opacity="0.35" />
    </>)
  } else if (type === 'puff') {
    content = (<>
      <rect x="0" y="0" width="120" height="120" fill={fill} {...sw} />
      <rect x="10" y="10" width="100" height="100" rx="3" fill={seat} {...swThin} />
      <line x1="60" y1="10" x2="60" y2="110" {...swThin} opacity="0.3" />
      <line x1="10" y1="60" x2="110" y2="60" {...swThin} opacity="0.3" />
      <circle cx="35" cy="35" r="2.5" fill={stroke} opacity="0.2" />
      <circle cx="85" cy="35" r="2.5" fill={stroke} opacity="0.2" />
      <circle cx="35" cy="85" r="2.5" fill={stroke} opacity="0.2" />
      <circle cx="85" cy="85" r="2.5" fill={stroke} opacity="0.2" />
    </>)
  }

  return (
    <svg width={w} height={h} viewBox="0 0 120 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      {content}
    </svg>
  )
}
