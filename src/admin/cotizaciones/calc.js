// src/admin/cotizaciones/calc.js
//
// Cuentas de una cotización del admin. Una sola función para pantalla, lista
// y PDF, así el total que ves al editar es el mismo que sale en el documento.
export const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
const r2 = (n) => Math.round(n * 100) / 100

// Enteros sin decimales ($9,800); si hay centavos siempre con dos ($1,928.50).
export const fmtMx = (v) => {
  const n = num(v)
  const d = Math.abs(n * 100 - Math.round(n * 100) / 1) < 1e-9 && Number.isInteger(Math.round(n * 100) / 100) && Math.round(n * 100) % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
}

// Precio unitario ya con el descuento de la línea.
export const precioNeto = (l) => r2(num(l.precio) * (1 - Math.min(100, Math.max(0, num(l.descuento_pct))) / 100))
export const totalLinea = (l) => r2(precioNeto(l) * Math.max(0, num(l.cantidad)))

export const AJUSTES_VACIOS = {
  descuento_pct: '', descuento_monto: '', iva_modo: 'ninguno', iva_pct: 16, anticipo_pct: '',
  vigencia_dias: 15, tiempo_entrega: '', condiciones_pago: '', datos_bancarios: '', mostrar_datos_bancarios: false,
  notas: '', terminos: [],
}

export function totales(lineas, aj) {
  const subtotal = r2(lineas.reduce((s, l) => s + totalLinea(l), 0))
  const descuento = Math.min(subtotal, r2(subtotal * Math.min(100, Math.max(0, num(aj.descuento_pct))) / 100 + Math.max(0, num(aj.descuento_monto))))
  const base = r2(subtotal - descuento)
  const pct = Math.max(0, num(aj.iva_pct))
  let iva = 0
  let total = base
  if (aj.iva_modo === 'sumar') { iva = r2(base * pct / 100); total = r2(base + iva) }
  else if (aj.iva_modo === 'incluido') { iva = r2(base - base / (1 + pct / 100)) }
  const anticipo = num(aj.anticipo_pct) > 0 ? r2(total * Math.min(100, num(aj.anticipo_pct)) / 100) : 0
  return { subtotal, descuento, base, iva, total, anticipo, saldo: r2(total - anticipo) }
}

// "160 × 200 cm", "160x200x95", "Matrimonial 160 x 190" -> { ancho, fondo, alto } (los que se encuentren, en ese orden).
export function medidasDeTexto(texto) {
  const nums = (String(texto ?? '').match(/\d+(?:[.,]\d+)?/g) ?? []).map(n => parseFloat(n.replace(',', '.'))).filter(n => n >= 10 && n <= 600)
  const [ancho, fondo, alto] = nums
  return { ancho: ancho ?? '', fondo: fondo ?? '', alto: alto ?? '' }
}
export const textoMedidas = (m) => {
  const v = [m?.ancho, m?.fondo, m?.alto].filter(x => x !== '' && x != null && num(x) > 0)
  return v.length ? `${v.map(num).join(' × ')} cm` : ''
}
