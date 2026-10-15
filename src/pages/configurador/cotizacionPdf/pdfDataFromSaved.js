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
import { nombreDelArmado, notasArmado, esModular } from '../modularesNombre'
import { splitSofaLayout } from '../ModularesConfigurador'

const tieneAncho = (type) => type === 'center' || type === 'puff'
const metrosDePieza = (p) => (tieneAncho(p.type) ? (p.ancho ?? 100) / 100 : 1)


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
    folio: cot.folio ? `BR-${cot.folio}` : 'BORRADOR',
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

// Datos para la página del plano de un armado (PlanoPagePdf).
export function datosPlano(armado, { folio, fecha, colorNombre, totalPiezas }) {
  const sequence = armado.sequence.map((p, i) => ({ id: i, type: p.type, ancho: p.ancho ?? undefined }))
  const { anchoM, profundidadM } = huellaAproxM(sequence)
  return {
    sequence, mirrored: !!armado.mirrored, folio, fecha, colorNombre, totalPiezas,
    huellaAnchoCm: Math.round(anchoM * 100), huellaProfundidadCm: Math.round(profundidadM * 100),
  }
}

// Datos para CotizacionSimplePdf a partir de una cotización guardada — o
// de una recién creada con el mismo shape (`items` con precio_cliente
// congelado). Muebles sueltos = una fila; las piezas de un armado de Modulares
// (mismo id en `notas`) se agrupan en UNA fila con su lista de piezas, y se
// devuelve `armados` para dibujar su plano al final.
export function buildSimplePdfDataFromCotizacion(cot, tiempoFabricacion) {
  const items = cot.items ?? []
  if (items.length === 0) throw new Error('Esta cotización no tiene productos guardados.')
  const folio = cot.folio ? `BR-${cot.folio}` : 'BORRADOR'
  const fecha = cot.emitida_at ? new Date(cot.emitida_at) : new Date(cot.created_at ?? Date.now())
  const filas = []
  const grupos = new Map()
  for (const it of items) {
    const precio = it.precio_cliente ?? it.precio_unitario ?? 0
    const arm = notasArmado(it)
    if (arm) {
      let g = grupos.get(arm.id)
      if (!g) {
        g = { arm, items: [], fila: null }
        grupos.set(arm.id, g)
        g.fila = { esArmado: true, piezas: [], cantidad: arm.qty ?? 1, precioUnitario: 0 }
        filas.push(g.fila)
      }
      g.items.push(it)
      const qty = arm.qty ?? 1
      g.fila.piezas.push({ nombre: it.configuracion_nombre, cantidad: Math.round((it.cantidad ?? 1) / qty) })
      g.fila.precioUnitario += precio * Math.round((it.cantidad ?? 1) / qty)
      continue
    }
    const t = parseTextilNombre(it.textil_nombre)
    filas.push({
      producto: it.producto_nombre ?? cot.nombre_proyecto ?? '', configuracion: it.configuracion_nombre ?? '', medidas: it.medidas ?? '',
      textilCatalogo: t.catalogo, textilGrado: t.grado, textilColor: t.color,
      imagenUrl: it.imagen_url ?? null, productoId: it.producto_id ?? null,
      cantidad: it.cantidad ?? 1, precioUnitario: precio,
    })
  }
  const armados = []
  for (const g of grupos.values()) {
    const t = parseTextilNombre(g.items[0].textil_nombre)
    const totalPiezas = g.fila.piezas.reduce((s, p) => s + p.cantidad, 0)
    const plano = datosPlano(g.arm, { folio, fecha, colorNombre: t.color, totalPiezas })
    Object.assign(g.fila, {
      producto: `${g.items[0].producto_nombre ?? 'Modulares'} · ${g.arm.nombre ?? nombreDelArmado(g.arm.sequence)}`,
      configuracion: 'Armado modular', medidas: `${plano.huellaAnchoCm} × ${plano.huellaProfundidadCm} cm aprox.`,
      textilCatalogo: t.catalogo, textilGrado: t.grado, textilColor: t.color,
      imagenUrl: g.items.find(i => i.imagen_url)?.imagen_url ?? null, productoId: g.items[0].producto_id ?? null,
    })
    armados.push(plano)
  }
  for (const f of filas) f.subtotal = f.precioUnitario * f.cantidad
  return {
    folio, fecha, vigenciaDias: 15,
    clienteNombre: cot.cliente_nombre ?? '', clienteEmail: cot.cliente_email ?? '', clienteTelefono: cot.cliente_telefono ?? '',
    tiempoFabricacion, filas, armados,
    total: filas.reduce((sum, f) => sum + f.subtotal, 0),
  }
}

export { esModular }
