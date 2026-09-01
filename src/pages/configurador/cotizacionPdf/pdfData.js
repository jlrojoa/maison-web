// src/pages/configurador/cotizacionPdf/pdfData.js
//
// Prepara datos planos (sin JSX) para las páginas del PDF a partir del
// estado que ya existe en ModularesConfigurador.jsx (lineas, sequence,
// mirrored, telaSel/colorSel/gradoSel) — mismos valores que ya se ven en
// pantalla, sin volver a derivarlos con otra lógica paralela.
import { ARMADOS_SUGERIDOS } from '../modularesPresets'
import { splitSofaLayout } from '../ModularesConfigurador'

const tieneAncho = (type) => type === 'center' || type === 'puff'
const metrosDePieza = (p) => (tieneAncho(p.type) ? (p.ancho ?? 100) / 100 : 1)

// Compara la secuencia actual (solo los tipos, en orden) contra cada preset
// de modularesPresets.js — si calza exacto usa ese nombre ("Chaise",
// "Escuadra dos brazos"...), si no "Personalizado". A propósito NO es
// detectNombreTipo() (esa da un nombre genérico tipo "Sofá 3 Plazas + Puff"
// para nombre_proyecto en Supabase) — la cotización pide el nombre del
// preset tal cual se ve en "Configuraciones predefinidas", o "Personalizado"
// si el distribuidor armó algo a mano (pedido explícito de JL).
function nombreDelArmado(sequence) {
  const tipos = sequence.map(p => p.type)
  const preset = ARMADOS_SUGERIDOS.find(p => p.tipos.length === tipos.length && p.tipos.every((t, i) => t === tipos[i]))
  return preset?.nombre ?? 'Personalizado'
}

// Huella aproximada (ancho x profundidad), en metros. Ancho: fila principal
// (+esquinero si hay). Profundidad: 1.00m por fila — la fila principal
// siempre cuenta, +lo que sumen las piezas después del esquinero (mismo
// cálculo que totalVerticalM en pantalla) y +1.00m si hay Puff.
//
// A propósito diverge de dimsPreset()/totalVerticalM en pantalla, que HOY
// no suman la fila del Puff al total vertical: el Puff siempre se dibuja en
// su propia fila (con o sin esquinero), así que sí ocupa piso. El PDF es el
// documento formal para el cliente y el ejemplo de Veka de referencia
// (VK-431831, Escuadra con puff) sí la cuenta — 300x300cm para un armado
// idéntico, no 300x200cm — así que aquí se corrige.
function huellaAproxM(sequence) {
  const { sofaPiezas, puffs, cornerIdx, hasCorner } = splitSofaLayout(sequence)
  const topRow = hasCorner ? sofaPiezas.slice(0, cornerIdx + 1) : sofaPiezas
  const anchoM = topRow.reduce((sum, p) => sum + metrosDePieza(p), 0)
  const botRow = hasCorner ? sofaPiezas.slice(cornerIdx + 1) : []
  let profundidadM = 1 + botRow.reduce((sum, p) => sum + metrosDePieza(p), 0)
  if (puffs.length > 0) profundidadM += 1
  return { anchoM, profundidadM }
}

// `lineas` es el mismo arreglo ya calculado por ModularesConfigurador.jsx
// (useMemo `lineas`): { piezaNombre, cantidad, ancho, precio, ... } con
// `precio` = precio distribuidor (sin margen). `markupPct` es el margen que
// el distribuidor le aplica a SU cliente (mismo campo que ya usa el modal
// de "Crear cotización" existente) — el PDF es "el documento que le
// compartes a tu cliente final", así que la tabla debe mostrar el precio
// CON margen, nunca el precio distribuidor crudo.
export function buildCotizacionPdfData({
  folio, fecha = new Date(), vigenciaDias = 15,
  productoNombre, sequence, mirrored,
  telaSel, colorSel, gradoSel,
  lineas, markupPct = 0,
  tiempoFabricacion,
}) {
  const markup = Number(markupPct) || 0
  const conMargen = (precio) => Math.round((precio ?? 0) * (1 + markup / 100))

  const filas = lineas.map(l => ({
    nombre: l.piezaNombre,
    cantidad: l.cantidad,
    anchoCm: l.ancho ?? 100,
    // Profundidad real confirmada por JL (2026-09-01): 1.00m fijo para
    // TODAS las piezas de Modulares — no hay variación por tipo, a
    // diferencia del ancho (100/80cm). El alto se omite a propósito: no
    // existe ese dato todavía en ningún lado del sistema.
    profundidadCm: 100,
    precioUnitario: conMargen(l.precio),
    subtotal: conMargen(l.precio) * l.cantidad,
  }))

  const total = filas.reduce((sum, f) => sum + f.subtotal, 0)
  const totalPiezas = lineas.reduce((sum, l) => sum + l.cantidad, 0)
  const { anchoM, profundidadM } = huellaAproxM(sequence)

  return {
    folio,
    fecha,
    vigenciaDias,
    productoNombre,
    nombreArmado: nombreDelArmado(sequence),
    filas,
    total,
    totalPiezas,
    huellaAnchoCm: Math.round(anchoM * 100),
    huellaProfundidadCm: Math.round(profundidadM * 100),
    telaNombre: telaSel?.nombre ?? '',
    colorNombre: colorSel?.nombre ?? '',
    gradoSel,
    tiempoFabricacion,
    orientacion: mirrored ? 'Espejo' : 'Normal',
    sequence,
    mirrored,
  }
}
