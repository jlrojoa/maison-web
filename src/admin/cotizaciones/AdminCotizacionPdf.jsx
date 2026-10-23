// src/admin/cotizaciones/AdminCotizacionPdf.jsx
//
// PDF de las cotizaciones hechas desde el admin. Mismo lenguaje visual que el
// PDF del configurador (tonos, tipografía, cotas), con: logo y datos fijos de
// la empresa, datos del cliente, foto del mueble completa, tela en recuadro,
// isométrico con sus medidas, requisitos especiales, totales (descuento, IVA,
// anticipo), términos y firma de aceptación.
import { Document, Page, View, Text, Image, Svg, Line, StyleSheet } from '@react-pdf/renderer'
import { registrarFuentesPdf } from '../../pages/configurador/cotizacionPdf/pdfFonts'
import { COLORS, PAGE_PADDING } from '../../pages/configurador/cotizacionPdf/pdfTheme'
import { fmtFecha } from '../../pages/configurador/cotizacionPdf/fmtPdf'
import { DimLineH, DimLineV } from '../../pages/configurador/cotizacionPdf/DimLinePdf'
import { fmtMx, num } from './calc'

registrarFuentesPdf()

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, paddingBottom: 54, fontFamily: 'Poppins', fontSize: 9, color: COLORS.ink },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 20, fontWeight: 700, letterSpacing: 2 },
  brandContact: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 4, lineHeight: 1.5 },
  folioBadge: { backgroundColor: COLORS.accentBg, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' },
  folioLabel: { fontSize: 6.5, color: COLORS.copperText, letterSpacing: 1.5 },
  folioValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  metaRight: { fontSize: 7.5, color: COLORS.inkMuted, textAlign: 'right', marginTop: 6, lineHeight: 1.5 },
  hr: { borderBottomWidth: 3, borderBottomColor: COLORS.accentBg, marginTop: 12, marginBottom: 14 },
  h2: { fontSize: 11.5, fontWeight: 700, marginBottom: 4 },
  h2Rule: { width: 28, borderBottomWidth: 2, borderBottomColor: COLORS.copperLine, marginBottom: 10 },
  proyecto: { fontSize: 13, fontWeight: 700, marginBottom: 8 },

  clienteBox: { backgroundColor: COLORS.fillNeutro, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 14 },
  clienteLabel: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.8, marginBottom: 3 },
  clienteNombre: { fontSize: 11, fontWeight: 600 },
  clienteSub: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, lineHeight: 1.4 },

  // Cotización: tabla de conceptos
  th: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: COLORS.ink, paddingBottom: 4, marginBottom: 2 },
  thTxt: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.8 },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cNum: { width: 20, fontSize: 8, color: COLORS.inkMuted, paddingTop: 1 },
  cDesc: { flex: 1, paddingRight: 8 },
  cCant: { width: 34, textAlign: 'center' },
  cUnit: { width: 74, textAlign: 'right' },
  cImp: { width: 80, textAlign: 'right' },
  prod: { fontSize: 10.5, fontWeight: 700 },
  linea2: { fontSize: 8.5, color: COLORS.copperText, fontWeight: 600, marginTop: 1 },
  telaLinea: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  telaMini: { width: 18, height: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, marginRight: 6 },
  telaTxt: { fontSize: 8, color: COLORS.inkMuted },
  reqBox: { marginTop: 5, backgroundColor: COLORS.accentBg, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 7 },
  reqLabel: { fontSize: 6.5, fontWeight: 700, color: COLORS.copperText, letterSpacing: 0.8 },
  reqTxt: { fontSize: 8.5, marginTop: 1, lineHeight: 1.35 },
  subtle: { fontSize: 7.5, color: COLORS.inkMuted },

  totalesWrap: { alignItems: 'flex-end', marginTop: 10 },
  totalesBox: { width: 270 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totTxt: { fontSize: 9, color: COLORS.inkMuted },
  totVal: { fontSize: 9 },
  totalBox: { marginTop: 4, backgroundColor: COLORS.accentBg, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 8, color: COLORS.copperText, letterSpacing: 1 },
  totalValue: { fontSize: 19, fontWeight: 700 },

  caja: { marginTop: 10, borderWidth: 1, borderColor: COLORS.copperLineFaint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: COLORS.panelBg },
  cajaLabel: { fontSize: 8, fontWeight: 700, color: COLORS.copperText },
  cajaTexto: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, lineHeight: 1.45 },

  terminoTitulo: { fontSize: 8.6, fontWeight: 700, marginTop: 7 },
  terminoTexto: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, lineHeight: 1.45 },
  firmas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 34 },
  firma: { width: 200, borderTopWidth: 1, borderTopColor: COLORS.ink, paddingTop: 4 },
  firmaTxt: { fontSize: 7.5, color: COLORS.inkMuted },

  // Anexo: imágenes, una ficha compacta por mueble
  anexoTitulo: { fontSize: 14, fontWeight: 700 },
  anexoSub: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, marginBottom: 12 },
  ficha: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  fichaFoto: { width: 170, minHeight: 118, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  fichaFotoImg: { width: 158, height: 106, objectFit: 'contain' },
  fichaCentro: { flex: 1, padding: 8, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.border },
  fichaTela: { width: 92, padding: 8, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.border, backgroundColor: COLORS.fillNeutro },
  fichaTelaImg: { width: 44, height: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, padding: 2, backgroundColor: '#fff' },
  fichaNum: { position: 'absolute', top: 5, left: 6, fontSize: 7.5, fontWeight: 700, color: COLORS.copperText },
  fichaTit: { fontSize: 8, fontWeight: 700, alignSelf: 'flex-start', marginBottom: 2 },

  footer: { position: 'absolute', left: PAGE_PADDING, right: PAGE_PADDING, bottom: 22, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 6.8, color: COLORS.inkMuted },
})

const Titulo = ({ children }) => (<View wrap={false}><Text style={s.h2}>{children}</Text><View style={s.h2Rule} /></View>)

// Isométrico completo (nunca recortado) con cotas de ancho, alto y fondo.
function IsoConCotas({ img, m }) {
  const W = 190, H = 112, IX = 8, IY = 4, IW = 132, IH = 72
  const ancho = num(m?.ancho), fondo = num(m?.fondo), alto = num(m?.alto)
  return (
    <View style={{ width: W, height: H }}>
      {img ? <Image src={img.src} style={{ position: 'absolute', left: IX, top: IY, width: IW, height: IH, objectFit: 'contain' }} /> : null}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        {ancho > 0 ? <DimLineH x={IX} y={IY + IH + 14} width={IW} label={`${ancho} cm`} /> : null}
        {alto > 0 ? <DimLineV x={IX + IW + 14} y={IY} height={IH} label={`${alto} cm`} /> : null}
        {ancho > 0 ? <Line x1={IX} y1={IY + IH + 4} x2={IX} y2={IY + IH + 14} stroke={COLORS.copperLine} strokeWidth={0.5} strokeOpacity={0.5} /> : null}
        {ancho > 0 ? <Line x1={IX + IW} y1={IY + IH + 4} x2={IX + IW} y2={IY + IH + 14} stroke={COLORS.copperLine} strokeWidth={0.5} strokeOpacity={0.5} /> : null}
      </Svg>
      {fondo > 0 ? <Text style={{ position: 'absolute', left: IX, width: IW, bottom: 0, textAlign: 'center', fontSize: 7, fontWeight: 700, color: COLORS.copperText }}>Fondo {fondo} cm</Text> : null}
    </View>
  )
}

function Encabezado({ d }) {
  const e = d.empresa
  return (
    <>
      <View style={s.headerRow}>
        <View style={{ maxWidth: 300 }}>
          {e.logo ? <Image src={e.logo.src} style={{ height: 46, objectFit: 'contain', objectPositionX: 0, marginBottom: 6 }} /> : <Text style={s.brand}>{e.razon_social || 'BRENDELL'}</Text>}
          <Text style={s.brandContact}>
            {[e.logo ? e.razon_social : null, e.rfc ? `RFC ${e.rfc}` : null, e.direccion, [e.telefono, e.email, e.sitio_web].filter(Boolean).join(' · ')].filter(Boolean).join('\n')}
          </Text>
        </View>
        <View>
          <View style={s.folioBadge}>
            <Text style={s.folioLabel}>COTIZACIÓN</Text>
            <Text style={s.folioValue}>{d.folio}</Text>
          </View>
          <Text style={s.metaRight}>
            Fecha: {fmtFecha(d.fecha)}{'\n'}
            Vigencia: {d.vigenciaDias} días naturales{d.vence ? ` (hasta ${fmtFecha(d.vence)})` : ''}
          </Text>
        </View>
      </View>
      <View style={s.hr} />
    </>
  )
}

function Totales({ d }) {
  const t = d.totales, a = d.ajustes
  const ivaTxt = a.iva_modo === 'incluido' ? `IVA ${num(a.iva_pct)}% (incluido)` : `IVA ${num(a.iva_pct)}%`
  return (
    <View style={s.totalesWrap} wrap={false}>
      <View style={s.totalesBox}>
        <View style={s.totRow}><Text style={s.totTxt}>Subtotal</Text><Text style={s.totVal}>{fmtMx(t.subtotal)}</Text></View>
        {t.descuento > 0 ? <View style={s.totRow}><Text style={s.totTxt}>Descuento{num(a.descuento_pct) > 0 ? ` (${num(a.descuento_pct)}%)` : ''}</Text><Text style={s.totVal}>− {fmtMx(t.descuento)}</Text></View> : null}
        {a.iva_modo === 'sumar' ? <View style={s.totRow}><Text style={s.totTxt}>{ivaTxt}</Text><Text style={s.totVal}>{fmtMx(t.iva)}</Text></View> : null}
        <View style={s.totalBox}>
          <View>
            <Text style={s.totalLabel}>TOTAL</Text>
            {a.iva_modo === 'incluido' ? <Text style={[s.totTxt, { fontSize: 7 }]}>{ivaTxt}: {fmtMx(t.iva)}</Text> : null}
          </View>
          <Text style={s.totalValue}>{fmtMx(t.total)} MXN</Text>
        </View>
        {t.anticipo > 0 ? (
          <View style={{ marginTop: 6 }}>
            <View style={s.totRow}><Text style={s.totTxt}>Anticipo {num(a.anticipo_pct)}%</Text><Text style={[s.totVal, { fontWeight: 700 }]}>{fmtMx(t.anticipo)}</Text></View>
            <View style={s.totRow}><Text style={s.totTxt}>Saldo contra entrega</Text><Text style={s.totVal}>{fmtMx(t.saldo)}</Text></View>
          </View>
        ) : null}
      </View>
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

export default function AdminCotizacionPdf({ data: d }) {
  const e = d.empresa, c = d.cliente ?? {}, a = d.ajustes
  const hayCliente = Object.values(c).some(v => v)
  const conImagenes = d.filas.map((f, i) => ({ f, i })).filter(({ f }) => !f.esLibre && (f.foto || f.iso || f.textilCatalogo))
  return (
    <Document title={`Cotización ${d.folio}`} author={e.razon_social || 'Brendell'}>
      <Page size="LETTER" style={s.page}>
        <Encabezado d={d} />
        {d.proyecto ? <Text style={s.proyecto}>{d.proyecto}</Text> : null}

        {hayCliente ? (
          <View style={s.clienteBox} wrap={false}>
            <Text style={s.clienteLabel}>COTIZACIÓN PARA</Text>
            <Text style={s.clienteNombre}>{c.nombre}{c.empresa ? ` · ${c.empresa}` : ''}</Text>
            <Text style={s.clienteSub}>
              {[c.rfc ? `RFC ${c.rfc}` : null, c.direccion, [c.email, c.telefono].filter(Boolean).join(' · ')].filter(Boolean).join('\n')}
            </Text>
          </View>
        ) : null}

        <View style={s.th} fixed>
          <Text style={[s.thTxt, s.cNum]}>#</Text>
          <Text style={[s.thTxt, s.cDesc]}>DESCRIPCIÓN</Text>
          <Text style={[s.thTxt, s.cCant]}>CANT.</Text>
          <Text style={[s.thTxt, s.cUnit]}>PRECIO UNIT.</Text>
          <Text style={[s.thTxt, s.cImp]}>IMPORTE</Text>
        </View>
        {d.filas.map((f, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cNum}>{i + 1}</Text>
            <View style={s.cDesc}>
              <Text style={s.prod}>{f.producto}</Text>
              {(f.configuracion || f.medidas) ? <Text style={s.linea2}>{[f.configuracion, f.medidas].filter(Boolean).join(' · ')}</Text> : null}
              {f.textilCatalogo ? (
                <View style={s.telaLinea}>
                  {f.tela?.imagen ? <Image src={f.tela.imagen.src} style={[s.telaMini, { objectFit: 'cover' }]} /> : <View style={[s.telaMini, { backgroundColor: f.tela?.hex || COLORS.panelBg }]} />}
                  <Text style={s.telaTxt}>Tela {f.textilCatalogo}{f.textilColor ? ` · ${f.textilColor}` : ''}{f.textilGrado ? ` (Cat. ${f.textilGrado})` : ''}</Text>
                </View>
              ) : null}
              {f.requisito ? (
                <View style={s.reqBox}><Text style={s.reqLabel}>REQUISITO ESPECIAL</Text><Text style={s.reqTxt}>{f.requisito}</Text></View>
              ) : null}
            </View>
            <Text style={s.cCant}>{f.cantidad}</Text>
            <View style={s.cUnit}>
              <Text>{fmtMx(f.precioNeto)}</Text>
              {f.descuento > 0 ? <Text style={s.subtle}>{fmtMx(f.precio)} − {f.descuento}%</Text> : null}
            </View>
            <Text style={[s.cImp, { fontWeight: 700 }]}>{fmtMx(f.subtotal)}</Text>
          </View>
        ))}

        <Totales d={d} />

        {a.tiempo_entrega ? (
          <View style={s.caja} wrap={false}><Text style={s.cajaLabel}>Tiempo estimado de entrega</Text><Text style={s.cajaTexto}>{a.tiempo_entrega}</Text></View>
        ) : null}
        {a.condiciones_pago ? (
          <View style={s.caja} wrap={false}><Text style={s.cajaLabel}>Condiciones de pago</Text><Text style={s.cajaTexto}>{a.condiciones_pago}</Text></View>
        ) : null}
        {a.mostrar_datos_bancarios && a.datos_bancarios ? (
          <View style={s.caja} wrap={false}><Text style={s.cajaLabel}>Datos para depósito o transferencia</Text><Text style={s.cajaTexto}>{a.datos_bancarios}</Text></View>
        ) : null}
        {a.notas ? (
          <View style={s.caja} wrap={false}><Text style={s.cajaLabel}>Notas</Text><Text style={s.cajaTexto}>{a.notas}</Text></View>
        ) : null}

        {(a.terminos ?? []).length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Titulo>Términos y condiciones</Titulo>
            {a.terminos.map((t, i) => (
              <View key={i} wrap={false}><Text style={s.terminoTitulo}>{t.titulo}</Text><Text style={s.terminoTexto}>{t.texto}</Text></View>
            ))}
          </View>
        ) : null}

        <View style={s.firmas} wrap={false}>
          <View style={s.firma}><Text style={s.firmaTxt}>Acepto la cotización · Nombre y firma del cliente</Text></View>
          <View style={[s.firma, { width: 120 }]}><Text style={s.firmaTxt}>Fecha</Text></View>
        </View>
        {e.notas_pie ? <Text style={[s.terminoTexto, { marginTop: 14, textAlign: 'center' }]}>{e.notas_pie}</Text> : null}
        <Pie d={d} />
      </Page>

      {conImagenes.length > 0 ? (
        <Page size="LETTER" style={s.page}>
          <Text style={s.anexoTitulo}>Anexo · Imágenes y medidas</Text>
          <Text style={s.anexoSub}>Cotización {d.folio}{d.proyecto ? ` · ${d.proyecto}` : ''}. Los números corresponden a las partidas de la cotización.</Text>
          {conImagenes.map(({ f, i }) => (
            <View key={i} style={s.ficha} wrap={false}>
              <View style={s.fichaFoto}>
                {f.foto ? <Image src={f.foto.src} style={s.fichaFotoImg} /> : null}
                <Text style={s.fichaNum}>{i + 1}</Text>
              </View>
              <View style={s.fichaCentro}>
                <Text style={s.fichaTit}>{f.producto}{f.configuracion ? ` · ${f.configuracion}` : ''}</Text>
                {f.iso ? <IsoConCotas img={f.iso} m={f.medidasCm} /> : (f.medidas ? <Text style={s.telaTxt}>{f.medidas}</Text> : null)}
              </View>
              {f.textilCatalogo ? (
                <View style={s.fichaTela}>
                  <View style={s.fichaTelaImg}>
                    {f.tela?.imagen ? <Image src={f.tela.imagen.src} style={{ width: 38, height: 38, objectFit: 'cover' }} /> : <View style={{ width: 38, height: 38, backgroundColor: f.tela?.hex || COLORS.panelBg }} />}
                  </View>
                  <Text style={[s.telaTxt, { textAlign: 'center', marginTop: 4, fontSize: 7 }]}>{f.textilCatalogo}{'\n'}{f.textilColor}</Text>
                </View>
              ) : null}
            </View>
          ))}
          <Pie d={d} />
        </Page>
      ) : null}
    </Document>
  )
}
