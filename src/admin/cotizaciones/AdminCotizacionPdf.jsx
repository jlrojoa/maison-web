// src/admin/cotizaciones/AdminCotizacionPdf.jsx
//
// PDF de las cotizaciones hechas desde el admin. Una sola tabla: cada renglón
// lleva modelo, descripción, foto, tela, isométrico con medidas, precio,
// cantidad y subtotal, todo junto para que el cliente no tenga que relacionar
// textos con imágenes. Después van las notas, los totales y los términos.
import { Document, Page, View, Text, Image, Svg, Line, StyleSheet } from '@react-pdf/renderer'
import { registrarFuentesPdf } from '../../pages/configurador/cotizacionPdf/pdfFonts'
import { COLORS } from '../../pages/configurador/cotizacionPdf/pdfTheme'
import { fmtFecha } from '../../pages/configurador/cotizacionPdf/fmtPdf'
import { DimLineH, DimLineV } from '../../pages/configurador/cotizacionPdf/DimLinePdf'
import { fmtMx, num } from './calc'

registrarFuentesPdf()

const PAD = 28
// Anchos de columna (suman el ancho útil de la hoja Carta: 612 − 2 × 28 = 556)
const COL = { n: 16, modelo: 82, desc: 92, img: 84, tela: 62, iso: 86, unit: 52, cant: 26, sub: 56 }

const s = StyleSheet.create({
  page: { padding: PAD, paddingBottom: 48, fontFamily: 'Poppins', fontSize: 8, color: COLORS.ink },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  wordmark: { fontSize: 24, fontWeight: 400, letterSpacing: 7 },
  empresaTxt: { fontSize: 7, color: COLORS.inkMuted, marginTop: 4, lineHeight: 1.45, maxWidth: 280 },
  titulo: { fontSize: 17, fontWeight: 500, letterSpacing: 6, textAlign: 'right' },
  meta: { flexDirection: 'row', marginTop: 5 },
  metaK: { width: 46, fontSize: 8, fontWeight: 600 },
  metaV: { fontSize: 8, color: COLORS.inkMuted },

  partes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 12 },
  parteBox: { width: '48%' },
  parteLabel: { fontSize: 9, fontWeight: 600, marginBottom: 2 },
  parteTxt: { fontSize: 8, color: COLORS.inkMuted, lineHeight: 1.45 },
  proyecto: { fontSize: 10, fontWeight: 700, marginBottom: 6 },

  th: { flexDirection: 'row', backgroundColor: COLORS.panelBg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  thCell: { paddingVertical: 6, paddingHorizontal: 3, fontSize: 7, fontWeight: 600, textAlign: 'center', lineHeight: 1.25 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, minHeight: 66, alignItems: 'stretch' },
  td: { paddingVertical: 5, paddingHorizontal: 4, justifyContent: 'center', borderLeftWidth: 0.5, borderLeftColor: COLORS.border },
  modelo: { fontSize: 9, fontWeight: 700 },
  modeloSub: { fontSize: 7, color: COLORS.inkMuted, marginTop: 1, lineHeight: 1.3 },
  descTxt: { fontSize: 7.2, lineHeight: 1.4 },
  req: { marginTop: 3, backgroundColor: COLORS.accentBg, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 4 },
  reqL: { fontSize: 5.5, fontWeight: 700, color: COLORS.copperText, letterSpacing: 0.6 },
  reqT: { fontSize: 6.8, lineHeight: 1.3 },
  imgFoto: { width: COL.img - 8, height: 56, objectFit: 'contain' },
  telaCaja: { width: 30, height: 30, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, padding: 1.5, backgroundColor: '#fff', marginBottom: 3 },
  telaTxt: { fontSize: 6.5, color: COLORS.ink, lineHeight: 1.3 },
  num: { fontSize: 8.5 },
  tachado: { fontSize: 6.5, color: COLORS.inkMuted, textDecoration: 'line-through' },

  abajo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  notasBox: { width: '58%' },
  notasTit: { fontSize: 9, fontWeight: 600, marginBottom: 3 },
  nota: { flexDirection: 'row', marginBottom: 2 },
  notaN: { width: 12, fontSize: 7, color: COLORS.inkMuted },
  notaT: { flex: 1, fontSize: 7, color: COLORS.inkMuted, lineHeight: 1.4 },
  totBox: { width: '36%' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totK: { fontSize: 9, color: COLORS.inkMuted },
  totV: { fontSize: 9 },
  totalBox: { marginTop: 3, backgroundColor: COLORS.panelBg, paddingVertical: 8, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalK: { fontSize: 11 },
  totalV: { fontSize: 14, fontWeight: 600 },

  condiciones: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  cond: { flex: 1, paddingRight: 10 },
  condK: { fontSize: 7.5, fontWeight: 700 },
  condV: { fontSize: 7, color: COLORS.inkMuted, marginTop: 1, lineHeight: 1.4 },

  h2: { fontSize: 10, fontWeight: 700, marginTop: 14, marginBottom: 3 },
  terminoT: { fontSize: 7.5, fontWeight: 700, marginTop: 5 },
  terminoD: { fontSize: 7, color: COLORS.inkMuted, marginTop: 1, lineHeight: 1.4 },
  firmas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  firma: { width: 200, borderTopWidth: 1, borderTopColor: COLORS.ink, paddingTop: 3 },
  firmaTxt: { fontSize: 7, color: COLORS.inkMuted },
  gracias: { fontSize: 8.5, textAlign: 'center', marginTop: 14, color: COLORS.inkMuted },

  footer: { position: 'absolute', left: PAD, right: PAD, bottom: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 6.5, color: COLORS.inkMuted },
})

// Isométrico completo (nunca recortado) con sus cotas, en chico.
function IsoMini({ img, m }) {
  const W = COL.iso - 8, H = 62, IX = 2, IY = 2, IW = 56, IH = 36
  const ancho = num(m?.ancho), fondo = num(m?.fondo), alto = num(m?.alto)
  return (
    <View style={{ width: W, height: H }}>
      {img ? <Image src={img.src} style={{ position: 'absolute', left: IX, top: IY, width: IW, height: IH, objectFit: 'contain' }} /> : null}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        {ancho > 0 ? <DimLineH x={IX} y={IY + IH + 11} width={IW} label={`${ancho}`} /> : null}
        {alto > 0 ? <DimLineV x={IX + IW + 8} y={IY} height={IH} label={`${alto}`} /> : null}
        {ancho > 0 ? <Line x1={IX} y1={IY + IH + 3} x2={IX} y2={IY + IH + 11} stroke={COLORS.copperLine} strokeWidth={0.4} strokeOpacity={0.5} /> : null}
        {ancho > 0 ? <Line x1={IX + IW} y1={IY + IH + 3} x2={IX + IW} y2={IY + IH + 11} stroke={COLORS.copperLine} strokeWidth={0.4} strokeOpacity={0.5} /> : null}
      </Svg>
      {fondo > 0 ? <Text style={{ position: 'absolute', left: IX, width: IW, bottom: 0, textAlign: 'center', fontSize: 6, color: COLORS.inkMuted }}>fondo {fondo}</Text> : null}
    </View>
  )
}

function Pie({ d }) {
  const e = d.empresa
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>{[e.razon_social, e.rfc ? `RFC ${e.rfc}` : null, e.email, e.telefono].filter(Boolean).join(' · ')}</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${d.folio} · Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

// Notas numeradas: lo que el admin capturó para esta cotización, en un solo lugar.
function armarNotas(d) {
  const a = d.ajustes
  const n = []
  n.push(a.iva_modo === 'sumar' ? `Precios en MXN. Al subtotal se suma el IVA (${num(a.iva_pct)}%).`
    : a.iva_modo === 'incluido' ? `Precios en MXN e incluyen IVA (${num(a.iva_pct)}%).` : 'Precios en MXN.')
  if (a.tiempo_entrega) n.push(`Tiempo de entrega estimado: ${a.tiempo_entrega}.`)
  n.push(`Esta cotización tiene una vigencia de ${d.vigenciaDias} días naturales${d.vence ? ` (hasta el ${fmtFecha(d.vence)})` : ''}.`)
  if (d.totales.anticipo > 0) n.push(`Para confirmar el pedido se requiere un anticipo del ${num(a.anticipo_pct)}%.`)
  if (a.condiciones_pago) n.push(a.condiciones_pago)
  if (a.mostrar_datos_bancarios && a.datos_bancarios) n.push(`Datos para depósito o transferencia: ${a.datos_bancarios.replace(/\s*\n\s*/g, ' · ')}`)
  for (const linea of (a.notas ?? '').split('\n').map(x => x.trim()).filter(Boolean)) n.push(linea)
  return n
}

function Fila({ f, i }) {
  const celda = (w, extra) => [s.td, { width: w }, extra]
  return (
    <View style={s.tr} wrap={false}>
      <View style={celda(COL.n, { borderLeftWidth: 0, alignItems: 'center', paddingHorizontal: 0 })}><Text style={s.num}>{i + 1}</Text></View>
      <View style={celda(COL.modelo)}>
        <Text style={s.modelo}>{f.producto}</Text>
        {f.configuracion ? <Text style={s.modeloSub}>{f.configuracion}</Text> : null}
      </View>
      <View style={celda(COL.desc)}>
        <Text style={s.descTxt}>
          {[f.medidas, f.textilCatalogo ? `Tela ${f.textilCatalogo}${f.textilGrado ? ` cat. ${f.textilGrado}` : ''}` : null, f.textilColor ? `Color ${f.textilColor}` : null].filter(Boolean).join('\n')}
        </Text>
        {f.requisito ? <View style={s.req}><Text style={s.reqL}>REQUISITO ESPECIAL</Text><Text style={s.reqT}>{f.requisito}</Text></View> : null}
      </View>
      <View style={celda(COL.img, { alignItems: 'center' })}>{f.foto ? <Image src={f.foto.src} style={s.imgFoto} /> : null}</View>
      <View style={celda(COL.tela, { alignItems: 'flex-start' })}>
        {f.textilCatalogo ? (
          <>
            <View style={s.telaCaja}>
              {f.tela?.imagen ? <Image src={f.tela.imagen.src} style={{ width: 27, height: 27, objectFit: 'cover' }} /> : <View style={{ width: 27, height: 27, backgroundColor: f.tela?.hex || COLORS.panelBg }} />}
            </View>
            <Text style={s.telaTxt}>{f.textilCatalogo}{f.textilGrado ? `\nCategoría ${f.textilGrado}` : ''}{f.textilColor ? `\n${f.textilColor}` : ''}</Text>
          </>
        ) : null}
      </View>
      <View style={celda(COL.iso, { alignItems: 'center' })}>{!f.esLibre && (f.iso || f.medidasCm) ? <IsoMini img={f.iso} m={f.medidasCm} /> : null}</View>
      <View style={celda(COL.unit, { alignItems: 'flex-end' })}>
        <Text style={s.num}>{fmtMx(f.precioNeto)}</Text>
        {f.descuento > 0 ? <Text style={s.tachado}>{fmtMx(f.precio)}</Text> : null}
        {f.descuento > 0 ? <Text style={s.modeloSub}>−{f.descuento}%</Text> : null}
      </View>
      <View style={celda(COL.cant, { alignItems: 'center', paddingHorizontal: 0 })}><Text style={s.num}>{f.cantidad}</Text></View>
      <View style={celda(COL.sub, { alignItems: 'flex-end' })}><Text style={[s.num, { fontWeight: 600 }]}>{fmtMx(f.subtotal)}</Text></View>
    </View>
  )
}

export default function AdminCotizacionPdf({ data: d }) {
  const e = d.empresa, c = d.cliente ?? {}, a = d.ajustes, t = d.totales
  const hayCliente = [c.nombre, c.empresa, c.rfc, c.email, c.telefono, c.direccion].some(v => v)
  const notas = armarNotas(d)
  const encabezadosTabla = [['#', COL.n], ['Modelo', COL.modelo], ['Descripción', COL.desc], ['Imagen', COL.img], ['Tela\n(Categoría)', COL.tela], ['Isométrico\n(medidas en cm)', COL.iso], ['Precio\nunitario', COL.unit], ['Cant.', COL.cant], ['Subtotal', COL.sub]]
  return (
    <Document title={`Cotización ${d.folio}`} author={e.razon_social || 'Brendell'}>
      <Page size="LETTER" style={s.page}>
        <View style={s.top}>
          <View>
            {e.logo ? <Image src={e.logo.src} style={{ height: 40, objectFit: 'contain', objectPositionX: 0 }} /> : <Text style={s.wordmark}>BRENDELL</Text>}
            <Text style={s.empresaTxt}>{[e.razon_social, e.rfc ? `RFC ${e.rfc}` : null, e.direccion, [e.telefono, e.email, e.sitio_web].filter(Boolean).join(' · ')].filter(Boolean).join('\n')}</Text>
          </View>
          <View style={{ width: 190 }}>
            <Text style={s.titulo}>COTIZACIÓN</Text>
            <View style={[s.meta, { marginTop: 8 }]}><Text style={s.metaK}>No.</Text><Text style={s.metaV}>{d.folio}</Text></View>
            <View style={s.meta}><Text style={s.metaK}>Fecha</Text><Text style={s.metaV}>{fmtFecha(d.fecha)}</Text></View>
            <View style={s.meta}><Text style={s.metaK}>Vigencia</Text><Text style={s.metaV}>{d.vigenciaDias} días</Text></View>
          </View>
        </View>

        <View style={s.partes}>
          <View style={s.parteBox}>
            {hayCliente ? (
              <>
                <Text style={s.parteLabel}>Cliente</Text>
                <Text style={s.parteTxt}>{[c.nombre, c.empresa, c.rfc ? `RFC ${c.rfc}` : null, c.direccion, c.email, c.telefono].filter(Boolean).join('\n')}</Text>
              </>
            ) : null}
          </View>
          <View style={s.parteBox}>
            {c.direccion_entrega ? (
              <>
                <Text style={s.parteLabel}>Dirección de entrega</Text>
                <Text style={s.parteTxt}>{c.direccion_entrega}</Text>
              </>
            ) : null}
          </View>
        </View>
        {d.proyecto ? <Text style={s.proyecto}>{d.proyecto}</Text> : null}

        <View style={s.th} fixed>
          {encabezadosTabla.map(([txt, w], i) => <Text key={i} style={[s.thCell, { width: w }]}>{txt}</Text>)}
        </View>
        {d.filas.map((f, i) => <Fila key={i} f={f} i={i} />)}

        <View style={s.abajo} wrap={false}>
          <View style={s.notasBox}>
            <Text style={s.notasTit}>Notas</Text>
            {notas.map((x, i) => (<View key={i} style={s.nota}><Text style={s.notaN}>{i + 1}.</Text><Text style={s.notaT}>{x}</Text></View>))}
          </View>
          <View style={s.totBox}>
            <View style={s.totRow}><Text style={s.totK}>Subtotal</Text><Text style={s.totV}>{fmtMx(t.subtotal)}</Text></View>
            {t.descuento > 0 ? <View style={s.totRow}><Text style={s.totK}>Descuento{num(a.descuento_pct) > 0 ? ` (${num(a.descuento_pct)}%)` : ''}</Text><Text style={s.totV}>− {fmtMx(t.descuento)}</Text></View> : null}
            {a.iva_modo === 'sumar' ? <View style={s.totRow}><Text style={s.totK}>IVA ({num(a.iva_pct)}%)</Text><Text style={s.totV}>{fmtMx(t.iva)}</Text></View> : null}
            <View style={s.totalBox}><Text style={s.totalK}>Total</Text><Text style={s.totalV}>{fmtMx(t.total)}</Text></View>
            {a.iva_modo === 'incluido' ? <View style={s.totRow}><Text style={[s.totK, { fontSize: 7 }]}>IVA incluido ({num(a.iva_pct)}%)</Text><Text style={[s.totV, { fontSize: 7 }]}>{fmtMx(t.iva)}</Text></View> : null}
            {t.anticipo > 0 ? (
              <View style={{ marginTop: 4 }}>
                <View style={s.totRow}><Text style={s.totK}>Anticipo {num(a.anticipo_pct)}%</Text><Text style={[s.totV, { fontWeight: 600 }]}>{fmtMx(t.anticipo)}</Text></View>
                <View style={s.totRow}><Text style={s.totK}>Saldo</Text><Text style={s.totV}>{fmtMx(t.saldo)}</Text></View>
              </View>
            ) : null}
          </View>
        </View>

        {(a.terminos ?? []).length > 0 ? (
          <View>
            <Text style={s.h2}>Términos y condiciones</Text>
            {a.terminos.map((x, i) => (<View key={i} wrap={false}><Text style={s.terminoT}>{x.titulo}</Text><Text style={s.terminoD}>{x.texto}</Text></View>))}
          </View>
        ) : null}

        <View style={s.firmas} wrap={false}>
          <View style={s.firma}><Text style={s.firmaTxt}>Acepto la cotización · Nombre y firma del cliente</Text></View>
          <View style={[s.firma, { width: 110 }]}><Text style={s.firmaTxt}>Fecha</Text></View>
        </View>
        {e.notas_pie ? <Text style={s.gracias}>{e.notas_pie}</Text> : null}
        <Pie d={d} />
      </Page>
    </Document>
  )
}
