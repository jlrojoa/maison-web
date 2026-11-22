// Ejecutar con: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { aPedidoMaestro, enviarAlMaestro } from '../api/_maestro.js'

const cot = (o = {}) => ({
  id: '11111111-1111-1111-1111-111111111111', folio: 214, status: 'orden', origen: 'admin', nombre_proyecto: 'Sala Lomas', distribuidor_email: 'ventas@brendell.mx',
  cliente_nombre: 'Respaldo', cliente_email: null, cliente_telefono: null,
  cliente_datos: { nombre: 'Carlos Ruiz', empresa: 'Ruiz Interiores', email: 'carlos@ruiz.mx', telefono: '5598765432', direccion: 'Av. Vasco de Quiroga 100, Santa Fe, CDMX' },
  subtotal: 100000, descuento: 5000, iva: 15200, total: 110200, ajustes: { iva_modo: 'sumar', condiciones_pago: '50% anticipo', tiempo_entrega: '8 semanas', anticipo_pct: 50 },
  items: [
    { orden: 1, producto_nombre: 'Sofá Milan', configuracion_nombre: 'Chaise izquierda', medidas: '320 × 160 cm', textil_nombre: 'Bouclé (Grado B) · Crema', precio_unitario: 60000, precio_cliente: 60000, descuento_pct: 10, cantidad: 1, orientacion: 'Izquierda', requisito_especial: null, notas: null },
    { orden: 0, producto_nombre: 'Mesa de centro', configuracion_nombre: null, medidas: null, textil_nombre: null, precio_unitario: 46000, precio_cliente: 46000, descuento_pct: 0, cantidad: 2, es_libre: false },
  ],
  ...o,
})
const ENV = { MAESTRO_URL: 'https://maestro.test/', MAESTRO_INGEST_SECRET: 'secreto' }

test('convierte la cotización al formato del Maestro', () => {
  const p = aPedidoMaestro(cot())
  assert.equal(p.origen, 'brendell'); assert.equal(p.externo_id, 'BR-214'); assert.equal(p.cliente, 'Carlos Ruiz'); assert.equal(p.email, 'carlos@ruiz.mx'); assert.equal(p.telefono, '5598765432')
  assert.equal(p.direccion, 'Av. Vasco de Quiroga 100, Santa Fe, CDMX'); assert.equal(p.canal, 'Cotizador (venta directa)')
  assert.equal(p.subtotal, 100000); assert.equal(p.descuento, 5000); assert.equal(p.iva, 15200); assert.equal(p.total, 110200); assert.equal(p.anticipo, 0)
  assert.match(p.notas, /BR-214/); assert.match(p.notas, /Sala Lomas/); assert.match(p.notas, /Vendedor: ventas@brendell.mx/); assert.match(p.notas, /Entrega: 8 semanas/)
})
test('las líneas salen en orden, con el precio neto después del descuento de la línea', () => {
  const p = aPedidoMaestro(cot())
  assert.equal(p.items[0].descripcion, 'Mesa de centro'); assert.equal(p.items[0].cantidad, 2); assert.equal(p.items[0].precio_unitario, 46000); assert.equal(p.items[0].tela, null)
  assert.deepEqual(p.items[1], { descripcion: 'Sofá Milan · Chaise izquierda', cantidad: 1, tela: 'Bouclé (Grado B)', color: 'Crema', observaciones: 'Medidas 320 × 160 cm · Orientación Izquierda', precio_unitario: 54000 })
})
test('sin datos del cliente en cliente_datos usa las columnas de respaldo; de distribuidor cambia el canal', () => {
  const p = aPedidoMaestro(cot({ cliente_datos: null, cliente_nombre: 'Ana', cliente_email: 'ana@x.mx', cliente_telefono: '55', origen: 'distribuidor' }))
  assert.equal(p.cliente, 'Ana'); assert.equal(p.email, 'ana@x.mx'); assert.equal(p.telefono, '55'); assert.equal(p.direccion, null); assert.equal(p.canal, 'Distribuidor')
})
test('apagado sin las variables: no hace ninguna llamada', async () => {
  let n = 0; const f = async () => { n++ }
  assert.deepEqual(await enviarAlMaestro(cot(), { env: {}, fetchFn: f }), { ok: false, omitido: true }); assert.equal(n, 0)
})
test('envía a /api/pedidos con la clave en x-api-key', async () => {
  let visto; const r = await enviarAlMaestro(cot(), { env: ENV, fetchFn: async (u, o) => { visto = { u, o }; return { ok: true } } })
  assert.equal(r.ok, true); assert.equal(visto.u, 'https://maestro.test/api/pedidos'); assert.equal(visto.o.headers['x-api-key'], 'secreto'); assert.equal(JSON.parse(visto.o.body).externo_id, 'BR-214')
})
test('si el Maestro responde error o no hay red, no lanza', async () => {
  const mudo = console.error; console.error = () => {}
  try {
    const a = await enviarAlMaestro(cot(), { env: ENV, fetchFn: async () => ({ ok: false, status: 401, text: async () => 'Clave inválida.' }) }); assert.equal(a.ok, false); assert.match(a.error, /401/)
    const b = await enviarAlMaestro(cot(), { env: ENV, fetchFn: async () => { throw new Error('sin red') } }); assert.equal(b.error, 'sin red')
  } finally { console.error = mudo }
})
test('si el Maestro tarda de más, se corta a los 4 s', async () => {
  const mudo = console.error; console.error = () => {}; const t0 = Date.now()
  try {
    const r = await enviarAlMaestro(cot(), { env: ENV, fetchFn: (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abortado')))) })
    assert.equal(r.ok, false); assert.ok(Date.now() - t0 < 6000)
  } finally { console.error = mudo }
})

test('sin nombre de cliente no se pierde el pedido: usa empresa, proyecto o folio', () => {
  assert.equal(aPedidoMaestro(cot({ cliente_datos: { empresa: 'Ruiz Interiores' }, cliente_nombre: null })).cliente, 'Ruiz Interiores')
  assert.equal(aPedidoMaestro(cot({ cliente_datos: null, cliente_nombre: null })).cliente, 'Sala Lomas')
  assert.equal(aPedidoMaestro(cot({ cliente_datos: null, cliente_nombre: null, nombre_proyecto: null })).cliente, 'Cotización BR-214')
})
test('sin folio usa el inicio del id, nunca "BR-null"', () => {
  const p = aPedidoMaestro(cot({ folio: null }))
  assert.equal(p.externo_id, 'BR-11111111'); assert.doesNotMatch(p.notas, /null/)
})
