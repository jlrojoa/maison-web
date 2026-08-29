// src/pages/configurador/modularesSequence.js
//
// Motor de reglas de posición y detección de nombre/tipo — puerto de
// getAllowed() y del bloque de nombre automático de bayside.html (prototipo
// de referencia de JL, no forma parte del repo — ver .gitignore). El resto
// de bayside.html (branding, WhatsApp, colecciones inventadas) NO se porta.
//
// Un "armado" es una SECUENCIA ordenada de piezas (no un conteo libre): los
// brazos y el esquinero solo tienen sentido en una posición concreta dentro
// del mueble físico, así que el modelo de datos tiene que ser una lista, no
// un mapa de cantidades. sequence: Array<{ id, type, configuracionId }>,
// type es siempre uno de TIPOS.
export const TIPOS = ['left', 'center', 'right', 'corner', 'puff']

export const NOMBRE_POR_TIPO = {
  left: 'Brazo Izquierdo',
  center: 'Módulo Central',
  right: 'Brazo Derecho',
  corner: 'Esquinero',
  puff: 'Puff',
}

// Reglas confirmadas por JL: Brazo Izq/Der máximo 1 cada uno y solo al
// inicio/final; Central y Esquinero libres en medio (Esquinero máximo 1);
// Puff es un extra que no ocupa posición en la secuencia (no bloquea ni se
// bloquea por hasRight). Puerto literal de getAllowed() en bayside.html.
export function getAllowedTypes(sequence) {
  const nonPuff = sequence.filter(p => p.type !== 'puff')
  const hasPuff = sequence.some(p => p.type === 'puff')
  const cornerIdx = nonPuff.findIndex(p => p.type === 'corner')
  const hasCorner = cornerIdx !== -1
  const hasRight = nonPuff.some(p => p.type === 'right')
  const last = nonPuff.length > 0 ? nonPuff[nonPuff.length - 1].type : null

  const allowed = new Set()
  if (nonPuff.length === 0) {
    allowed.add('left'); allowed.add('center')
  } else if (hasRight) {
    // cerrado: nada más puede agregarse salvo el puff, abajo
  } else if (!hasCorner) {
    if (last === 'left' || last === 'center') { allowed.add('center'); allowed.add('corner'); allowed.add('right') }
  } else {
    if (last === 'corner' || last === 'center') { allowed.add('center'); allowed.add('right') }
  }
  if (nonPuff.length > 0 && !hasPuff) allowed.add('puff')
  return allowed
}

// Inserta `type` en la secuencia respetando las reglas; no hace nada si no
// está permitido. Las piezas normales se insertan ANTES del puff si ya hay
// uno (para que el puff siempre quede visualmente al final); el puff mismo
// simplemente se agrega.
export function addToSequence(sequence, type, piece) {
  if (!getAllowedTypes(sequence).has(type)) return sequence
  if (type === 'puff') return [...sequence, piece]
  const puffIdx = sequence.findIndex(p => p.type === 'puff')
  if (puffIdx === -1) return [...sequence, piece]
  const next = [...sequence]
  next.splice(puffIdx, 0, piece)
  return next
}

// Quitar un puff solo lo quita a él (es un extra suelto). Quitar cualquier
// otra pieza corta la secuencia ahí — todo lo que venía después pierde su
// razón de ser geométrica (dependía de esa pieza para su posición), así que
// se recorta también. Puerto literal de removeModule().
export function removeFromSequence(sequence, id) {
  const idx = sequence.findIndex(p => p.id === id)
  if (idx === -1) return sequence
  if (sequence[idx].type === 'puff') return sequence.filter(p => p.id !== id)
  return sequence.slice(0, idx)
}

// Mensaje guía para el paso actual — puerto literal de los textos de
// renderSidebar() en bayside.html (JL pidió estos exactos). Devuelve una
// lista de segmentos { t: texto } | { b: texto en negrita } en orden, para
// que el componente los pueda mapear directo a JSX sin dangerouslySetHTML.
export function getHintSegments(sequence) {
  const nonPuff = sequence.filter(p => p.type !== 'puff')
  const hasRight = nonPuff.some(p => p.type === 'right')
  const hasCorner = nonPuff.some(p => p.type === 'corner')
  const hasPuff = sequence.some(p => p.type === 'puff')

  if (sequence.length === 0) {
    return [{ t: 'Comienza con el ' }, { b: 'Brazo Izquierdo' }, { t: ' o un ' }, { b: 'Central' }, { t: '.' }]
  }
  if (hasRight && hasPuff) return [{ t: '✓ Configuración completa.' }]
  if (hasRight) return [{ t: '✓ Sofá cerrado. Puedes añadir un ' }, { b: 'Puff' }, { t: '.' }]
  if (hasCorner) return [{ t: 'Continúa con ' }, { b: 'Central' }, { t: ' o cierra con ' }, { b: 'Brazo Derecho' }, { t: '.' }]
  return [{ t: 'Agrega ' }, { b: 'Central' }, { t: ', ' }, { b: 'Esquinero' }, { t: ' o cierra con ' }, { b: 'Brazo Derecho' }, { t: '.' }]
}

// Por qué una pieza concreta está deshabilitada ahora mismo — mismas reglas
// que getAllowedTypes() pero explicadas para UNA pieza, en vez de solo
// devolver el set de permitidas. JL pidió (referencia: configurador de Veka)
// que un botón deshabilitado explique la razón en texto, no solo se vea gris.
// null si `type` sí está permitido (no hay nada que explicar).
export function getDisabledReason(sequence, type) {
  if (getAllowedTypes(sequence).has(type)) return null

  const nonPuff = sequence.filter(p => p.type !== 'puff')
  const hasPuff = sequence.some(p => p.type === 'puff')
  const hasCorner = nonPuff.some(p => p.type === 'corner')
  const hasRight = nonPuff.some(p => p.type === 'right')

  if (type === 'puff') {
    if (nonPuff.length === 0) return 'Agrega al menos una pieza antes de sumar un Puff.'
    if (hasPuff) return 'Ya agregaste un Puff — solo puede haber uno por armado.'
    return null
  }
  if (hasRight) return 'El armado ya está cerrado con el Brazo Derecho. Quita piezas para seguir editando.'
  if (nonPuff.length === 0) return 'Agrega primero un Brazo Izquierdo o un Módulo Central.'
  if (type === 'left') return 'El Brazo Izquierdo solo puede ir al inicio del armado.'
  if (type === 'corner') return hasCorner ? 'Ya hay un Esquinero en este armado — solo puede haber uno.' : null
  return null
}

// Nombre y tipo automáticos según las piezas presentes — puerto literal del
// bloque final de renderStage() en bayside.html.
export function detectNombreTipo(sequence) {
  const nonPuff = sequence.filter(p => p.type !== 'puff')
  const hasPuff = sequence.some(p => p.type === 'puff')
  const hasCorner = nonPuff.some(p => p.type === 'corner')
  const hasRight = nonPuff.some(p => p.type === 'right')
  const hasLeft = nonPuff.some(p => p.type === 'left')
  const seats = nonPuff.length

  let nombre = 'Sofá'
  let tipo = 'Lineal'
  if (hasCorner) { nombre = 'Sofá en L'; tipo = 'Escuadra' }
  else if (seats === 1) { nombre = 'Módulo Individual'; tipo = 'Individual' }
  else if (seats === 2 && hasLeft && hasRight) { nombre = 'Sofá 2 Plazas'; tipo = 'Lineal' }
  else if (seats >= 3 && hasLeft && hasRight) { nombre = `Sofá ${seats} Plazas`; tipo = 'Lineal' }
  else if (!hasRight && !hasCorner) { nombre = 'Chaise Lounge'; tipo = 'Chaise' }
  if (hasPuff) nombre += ' + Puff'

  return { nombre, tipo }
}
