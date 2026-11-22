// Convierte una cotización de Brendell (en estado "Pedido") al formato que recibe POST /api/pedidos del Maestro
// y la manda. Archivo con guion bajo: NO cuenta como función de Vercel.
// Apagado mientras falten MAESTRO_URL y MAESTRO_INGEST_SECRET. Nunca lanza: devuelve { ok, omitido?, error? }.
// El Maestro no duplica: el mismo folio (BR-…) enviado dos veces se guarda una sola vez.

const ESPERA_MS = 4000
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const txt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// "Bouclé (Grado B) · Crema" -> { catalogo, grado, color }. Igual que parseTextil del cotizador.
function parseTextil(t) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(t ?? '')
  return m ? { catalogo: m[1], grado: m[2], color: m[3] } : { catalogo: t ?? '', grado: '', color: '' }
}

export function aPedidoMaestro(cot) {
  const c = cot.cliente_datos ?? {}
  const aj = cot.ajustes ?? {}
  const items = [...(cot.items ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const folio = cot.folio ?? String(cot.id ?? '').slice(0, 8)
  // El Maestro exige un cliente: sin nombre se usa la empresa, el proyecto o el folio, para que el pedido no se pierda.
  const cliente = txt(c.nombre) ?? txt(cot.cliente_nombre) ?? txt(c.empresa) ?? txt(cot.nombre_proyecto) ?? `Cotización BR-${folio}`
  return {
    origen: 'brendell',
    externo_id: `BR-${folio}`,
    cliente,
    telefono: txt(c.telefono) ?? txt(cot.cliente_telefono),
    email: txt(c.email) ?? txt(cot.cliente_email),
    direccion: txt(c.direccion),
    canal: cot.origen === 'admin' ? 'Cotizador (venta directa)' : 'Distribuidor',
    subtotal: r2(cot.subtotal),
    descuento: r2(cot.descuento),
    iva: r2(cot.iva),
    total: r2(cot.total),
    anticipo: 0, // el cotizador no registra pagos: nada se da por cobrado hasta que se capture en el Maestro
    notas: [`Cotización BR-${folio}`, txt(cot.nombre_proyecto), txt(cot.distribuidor_email) && `Vendedor: ${cot.distribuidor_email}`, txt(aj.condiciones_pago) && `Pago: ${aj.condiciones_pago}`, txt(aj.tiempo_entrega) && `Entrega: ${aj.tiempo_entrega}`].filter(Boolean).join(' · '),
    items: items.map((it) => {
      const t = parseTextil(it.textil_nombre)
      const neto = r2((Number(it.precio_cliente ?? it.precio_unitario) || 0) * (1 - Math.min(100, Math.max(0, Number(it.descuento_pct) || 0)) / 100))
      return {
        descripcion: [it.producto_nombre, it.configuracion_nombre].filter(Boolean).join(' · ') || 'Concepto',
        cantidad: Math.max(1, Math.round(Number(it.cantidad)) || 1),
        tela: [t.catalogo, t.grado && `(${t.grado})`].filter(Boolean).join(' ') || null,
        color: t.color || null,
        observaciones: [txt(it.medidas) && `Medidas ${it.medidas}`, txt(it.orientacion) && `Orientación ${it.orientacion}`, txt(it.requisito_especial), txt(it.notas)].filter(Boolean).join(' · ') || null,
        precio_unitario: neto,
      }
    }),
  }
}

export async function enviarAlMaestro(cot, { env = process.env, fetchFn = globalThis.fetch } = {}) {
  const url = env.MAESTRO_URL, clave = env.MAESTRO_INGEST_SECRET
  if (!url || !clave) return { ok: false, omitido: true }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ESPERA_MS)
  try {
    const r = await fetchFn(`${String(url).replace(/\/+$/, '')}/api/pedidos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': clave }, body: JSON.stringify(aPedidoMaestro(cot)), signal: ctl.signal,
    })
    if (!r.ok) throw new Error(`Maestro respondió ${r.status}: ${(await r.text().catch(() => '')).slice(0, 160)}`)
    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('[maestro] no se pudo enviar', cot && (cot.folio ?? cot.id), error)
    return { ok: false, error }
  } finally { clearTimeout(t) }
}
