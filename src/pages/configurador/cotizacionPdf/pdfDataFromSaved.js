// src/pages/configurador/cotizacionPdf/pdfDataFromSaved.js
//
// Reconstruye el mismo objeto que consumen las páginas del PDF (mismo
// shape que buildCotizacionPdfData en pdfData.js) pero a partir de una
// cotización YA GUARDADA en Supabase (fila de `cotizaciones` + sus
// `cotizacion_items`), no del estado en vivo del configurador — para el
// botón "Descargar"/folio clickeable en Mi Espacio (pedido de JL,
// 2026-09-02): debe regenerar EXACTAMENTE el mismo PDF, no la
// configuración actual en pantalla.
//
// Usa los precios YA CONGELADOS en cotizacion_items (precio_cliente) en
// vez de recalcular contra `precios`/`telas` actuales — una cotización
// emitida no debe cambiar si el precio base o el margen del distribuidor
// cambian después. El total se suma desde esos mismos precios congelados
// (no se usa cotizaciones.total, que se redondea en otro orden — sum(item
// redondeado) puede diferir en unos pesos de round(sum(item)) — así el
// número siempre coincide con el que mostró el PDF original).
import { ARMADOS_SUGERIDOS } from '../modularesPresets'
import { splitSofaLayout } from '../ModularesConfigurador'

const tieneAncho = (type) => type === 'center' || type === 'puff'
const metrosDePieza = (p) => (tieneAncho(p.type) ? (p.ancho ?? 100) / 100 : 1)

function nombreDelArmado(sequence) {
  const tipos = sequence.map(p => p.type)
  const preset = ARMADOS_SUGERIDOS.find(p => p.tipos.length === tipos.length && p.tipos.every((t, i) => t === tipos[i]))
  return preset?.nombre ?? 'Personalizado'
}

function huellaAproxM(sequence) {
  const { sofaPiezas, puffs, cornerIdx, hasCorner } = splitSofaLayout(sequence)
  const topRow = hasCorner ? sofaPiezas.slice(0, cornerIdx + 1) : sofaPiezas
  const anchoM = topRow.reduce((sum, p) => sum + metrosDePieza(p), 0)
  const botRow = hasCorner ? sofaPiezas.slice(cornerIdx + 1) : []
  let profundidadM = 1 + botRow.reduce((sum, p) => sum + metrosDePieza(p), 0)
  if (puffs.length > 0) profundidadM += 1
  return { anchoM, profundidadM }
}

// "Cancún (B) · Azul Cielo" -> { catalogo: 'Cancún', grado: 'B', color:
// 'Azul Cielo' } — mismo formato que arma confirmarCotizacion() en
// ModularesConfigurador.jsx (textilNombre), único lugar donde se guarda
// catálogo/color/categoría de una cotización ya emitida.
function parseTextilNombre(textilNombre) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(textilNombre ?? '')
  if (!m) return { catalogo: textilNombre ?? '', grado: '', color: '' }
  return { catalogo: m[1], grado: m[2], color: m[3] }
}

// `cot` = fila de `cotizaciones` con `.items` (cotizacion_items) ya
// cargados, mismo shape que arma la query de MiEspacio.jsx.
export function buildCotizacionPdfDataFromCotizacion(cot, tiempoFabricacion) {
  const secuencia = cot.secuencia_pdf
  if (!secuencia?.sequence?.length) {
    throw new Error('Esta cotización no tiene la secuencia de piezas guardada (se emitió antes de que existiera esta función) — no se puede regenerar el PDF.')
  }
  const sequence = secuencia.sequence.map((p, i) => ({ id: i, type: p.type, ancho: p.ancho ?? undefined }))
  const mirrored = !!secuencia.mirrored

  const items = cot.items ?? []
  const filas = items.map(it => ({
    nombre: it.configuracion_nombre,
    cantidad: it.cantidad,
    anchoCm: Number(/(\d+)\s*cm/.exec(it.medidas ?? '')?.[1] ?? 100),
    profundidadCm: 100,
    precioUnitario: it.precio_cliente ?? it.precio_unitario ?? 0,
    subtotal: (it.precio_cliente ?? it.precio_unitario ?? 0) * it.cantidad,
  }))

  const total = filas.reduce((sum, f) => sum + f.subtotal, 0)
  const totalPiezas = items.reduce((sum, it) => sum + it.cantidad, 0)
  const { anchoM, profundidadM } = huellaAproxM(sequence)
  const { catalogo, grado, color } = parseTextilNombre(items[0]?.textil_nombre)

  return {
    folio: `BR-${cot.folio}`,
    fecha: cot.emitida_at ? new Date(cot.emitida_at) : new Date(cot.created_at),
    vigenciaDias: 15,
    productoNombre: items[0]?.producto_nombre ?? '',
    nombreArmado: nombreDelArmado(sequence),
    filas,
    total,
    totalPiezas,
    huellaAnchoCm: Math.round(anchoM * 100),
    huellaProfundidadCm: Math.round(profundidadM * 100),
    telaNombre: catalogo,
    colorNombre: color,
    gradoSel: grado,
    orientacion: mirrored ? 'Espejo' : 'Normal',
    tiempoFabricacion,
    sequence,
    mirrored,
  }
}
