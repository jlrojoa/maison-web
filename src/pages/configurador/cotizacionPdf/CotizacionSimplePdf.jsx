// src/pages/configurador/cotizacionPdf/CotizacionSimplePdf.jsx
//
// PDF completo para cotizaciones de producto único (Camas, Sofás, Mesas,
// Butacas, etc.): foto del mueble, medidas, tela con su foto y ficha técnica,
// precio, pasos y términos. Modulares usa ModularesCotizacionPdf (con plano).
// Las imágenes llegan ya como data URL JPEG (ver imagenesPdf.js).
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { registrarFuentesPdf } from './pdfFonts'
import { EMPRESA } from './empresa'
import { fmt } from '../format'
import { fmtFecha, fmtVigencia } from './fmtPdf'
import { COLORS, PAGE_PADDING } from './pdfTheme'
import { TERMINOS } from './terminos'

registrarFuentesPdf()

export const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, paddingBottom: 54, fontFamily: 'Poppins', fontSize: 9, color: COLORS.ink },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  presentadoPor: { fontSize: 7, color: COLORS.inkMuted, letterSpacing: 1.5, marginBottom: 3 },
  brand: { fontSize: 20, fontWeight: 700, letterSpacing: 2 },
  brandContact: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 4, lineHeight: 1.5 },
  folioBadge: { backgroundColor: COLORS.accentBg, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, alignItems: 'center' },
  folioLabel: { fontSize: 6.5, color: COLORS.copperText, letterSpacing: 1.5 },
  folioValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  metaRight: { fontSize: 7.5, color: COLORS.inkMuted, textAlign: 'right', marginTop: 6, lineHeight: 1.5 },
  hr: { borderBottomWidth: 3, borderBottomColor: COLORS.accentBg, marginTop: 12, marginBottom: 14 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 1, marginBottom: 8 },
  h2: { fontSize: 11.5, fontWeight: 700, marginBottom: 4 },
  h2Rule: { width: 28, borderBottomWidth: 2, borderBottomColor: COLORS.copperLine, marginBottom: 10 },

  clienteBox: { backgroundColor: COLORS.fillNeutro, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  clienteNombre: { fontSize: 11, fontWeight: 600 },
  clienteSub: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2 },
  clienteLabel: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.8, marginBottom: 3 },

  item: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 12, overflow: 'hidden' },
  itemTop: { flexDirection: 'row' },
  fotoBox: { width: 215, height: 175, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  foto: { width: 215, height: 175, objectFit: 'contain' },
  fotoVacia: { fontSize: 7.5, color: COLORS.inkMuted },
  itemInfo: { flex: 1, padding: 14 },
  itemNombre: { fontSize: 16, fontWeight: 700 },
  itemConfig: { fontSize: 10.5, color: COLORS.copperText, fontWeight: 600, marginTop: 2 },
  specRow: { flexDirection: 'row', marginTop: 7 },
  specLabel: { width: 70, fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.6, paddingTop: 1 },
  specValue: { flex: 1, fontSize: 9 },

  telaRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, backgroundColor: COLORS.fillNeutro },
  telaImg: { width: 64, height: 64, borderRadius: 6, objectFit: 'cover' },
  telaSwatch: { width: 64, height: 64, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  telaInfo: { flex: 1, marginLeft: 12 },
  telaNombre: { fontSize: 10.5, fontWeight: 600 },
  telaSub: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, lineHeight: 1.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { fontSize: 7, color: COLORS.copperText, backgroundColor: COLORS.accentBg, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5, marginRight: 4, marginBottom: 3 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceMuted: { fontSize: 8.5, color: COLORS.inkMuted },
  priceBig: { fontSize: 14, fontWeight: 700 },

  totalBox: { marginTop: 4, backgroundColor: COLORS.accentBg, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 8, color: COLORS.copperText, letterSpacing: 1 },
  totalValue: { fontSize: 22, fontWeight: 700, marginTop: 2 },
  totalNote: { fontSize: 8, color: COLORS.inkMuted, textAlign: 'right', maxWidth: 190, lineHeight: 1.4 },
  fabBox: { marginTop: 10, borderWidth: 1, borderColor: COLORS.copperLineFaint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: COLORS.panelBg },
  fabLabel: { fontSize: 8, fontWeight: 700, color: COLORS.copperText },
  fabText: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2 },

  pasoRow: { flexDirection: 'row', marginBottom: 7 },
  pasoNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.copperLine, color: '#fff', fontSize: 8, fontWeight: 700, textAlign: 'center', paddingTop: 3.5 },
  pasoTitulo: { fontSize: 9, fontWeight: 700 },
  pasoTexto: { fontSize: 8.2, color: COLORS.inkMuted, marginTop: 1, lineHeight: 1.4 },
  terminoTitulo: { fontSize: 8.6, fontWeight: 700, marginTop: 7 },
  terminoTexto: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2, lineHeight: 1.45 },

  footer: { position: 'absolute', left: PAGE_PADDING, right: PAGE_PADDING, bottom: 22, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 6.8, color: COLORS.inkMuted },
})

export function Footer({ folio }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>{EMPRESA.razonSocial} · RFC {EMPRESA.rfc} · {EMPRESA.email} · {EMPRESA.telefono}</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${folio} · Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

export function Encabezado({ data, titulo = 'BRENDELL' }) {
  return (
    <>
      <View style={s.headerRow}>
        <View style={{ maxWidth: 300 }}>
          <Text style={s.presentadoPor}>PRESENTADO POR</Text>
          <Text style={s.brand}>{titulo}</Text>
          <Text style={s.brandContact}>
            {EMPRESA.razonSocial} · RFC {EMPRESA.rfc}{'\n'}
            {EMPRESA.direccion}{'\n'}
            {EMPRESA.telefono} · {EMPRESA.email}
          </Text>
        </View>
        <View>
          <View style={s.folioBadge}>
            <Text style={s.folioLabel}>COTIZACIÓN</Text>
            <Text style={s.folioValue}>{data.folio}</Text>
          </View>
          <Text style={s.metaRight}>
            Fecha: {fmtFecha(data.fecha)}{'\n'}
            Vigencia: {data.vigenciaDias} días naturales (hasta {fmtVigencia(data.fecha, data.vigenciaDias)})
          </Text>
        </View>
      </View>
      <View style={s.hr} />
    </>
  )
}

export function Titulo({ children }) {
  return (<View wrap={false}><Text style={s.h2}>{children}</Text><View style={s.h2Rule} /></View>)
}

export function TelaFicha({ tela, catalogo, color, grado }) {
  const chips = []
  if (tela?.martindale) chips.push(`${Number(tela.martindale).toLocaleString('es-MX')} ciclos Martindale`)
  if (tela?.resistenciaLuz) chips.push(`Resistencia a la luz ${tela.resistenciaLuz}`)
  if (tela?.facilLimpieza) chips.push('Fácil limpieza')
  if (tela?.repelente) chips.push('Repelente a líquidos')
  return (
    <View style={s.telaRow} wrap={false}>
      {tela?.imagen
        ? <Image src={tela.imagen.src} style={s.telaImg} />
        : <View style={[s.telaSwatch, { backgroundColor: tela?.hex || COLORS.panelBg }]} />}
      <View style={s.telaInfo}>
        <Text style={s.telaNombre}>Tela {catalogo}{grado ? ` · Categoría ${grado}` : ''}</Text>
        <Text style={s.telaSub}>Color: {color}{tela?.composicion ? `\nComposición: ${tela.composicion}` : ''}{tela?.pais ? ` · Origen: ${tela.pais}` : ''}</Text>
        {chips.length > 0 && <View style={s.chips}>{chips.map((c, i) => <Text key={i} style={s.chip}>{c}</Text>)}</View>}
      </View>
    </View>
  )
}

export function PasosYTerminos() {
  const pasos = [
    ['Confirma tu cotización', 'Revisa modelo, medida, tela y precio con tu distribuidor y confírmalo antes de que termine la vigencia.'],
    ['Formaliza el pedido', 'Se acuerdan pago, entrega y garantía, y tu mueble entra a fabricación.'],
    ['Fabricación y entrega', 'Tu mueble se fabrica bajo pedido y se coordina la entrega.'],
  ]
  return (
    <>
      <Titulo>Cómo continuar</Titulo>
      {pasos.map(([t, d], i) => (
        <View key={i} style={s.pasoRow} wrap={false}>
          <Text style={s.pasoNum}>{i + 1}</Text>
          <View style={{ marginLeft: 8, flex: 1 }}><Text style={s.pasoTitulo}>{t}</Text><Text style={s.pasoTexto}>{d}</Text></View>
        </View>
      ))}
      <View style={{ marginTop: 10 }}><Titulo>Términos y condiciones</Titulo></View>
      {TERMINOS.map(([t, d], i) => (
        <View key={i} wrap={false}><Text style={s.terminoTitulo}>{t}</Text><Text style={s.terminoTexto}>{d}</Text></View>
      ))}
    </>
  )
}

export default function CotizacionSimplePdf({ data }) {
  return (
    <Document title={`Cotización ${data.folio} · Brendell`} author={EMPRESA.razonSocial}>
      <Page size="LETTER" style={s.page}>
        <Encabezado data={data} />

        {data.clienteNombre ? (
          <View style={s.clienteBox} wrap={false}>
            <View>
              <Text style={s.clienteLabel}>COTIZACIÓN PARA</Text>
              <Text style={s.clienteNombre}>{data.clienteNombre}</Text>
              {(data.clienteEmail || data.clienteTelefono) && (
                <Text style={s.clienteSub}>{[data.clienteEmail, data.clienteTelefono].filter(Boolean).join(' · ')}</Text>
              )}
            </View>
          </View>
        ) : null}

        <Titulo>Tu mueble</Titulo>
        {data.filas.map((f, i) => (
          <View key={i} style={s.item} wrap={false}>
            <View style={s.itemTop}>
              <View style={s.fotoBox}>
                {f.foto ? <Image src={f.foto.src} style={s.foto} /> : <Text style={s.fotoVacia}>Imagen no disponible</Text>}
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemNombre}>{f.producto}</Text>
                {f.configuracion ? <Text style={s.itemConfig}>{f.configuracion}</Text> : null}
                {f.medidas ? (
                  <View style={s.specRow}><Text style={s.specLabel}>MEDIDAS</Text><Text style={s.specValue}>{f.medidas}</Text></View>
                ) : null}
                <View style={s.specRow}><Text style={s.specLabel}>CANTIDAD</Text><Text style={s.specValue}>{f.cantidad}</Text></View>
              </View>
            </View>
            {f.textilCatalogo ? <TelaFicha tela={f.tela} catalogo={f.textilCatalogo} color={f.textilColor} grado={f.textilGrado} /> : null}
            <View style={s.priceRow}>
              <Text style={s.priceMuted}>{f.cantidad} × {fmt(f.precioUnitario)}</Text>
              <Text style={s.priceBig}>{fmt(f.subtotal)}</Text>
            </View>
          </View>
        ))}

        <View style={s.totalBox} wrap={false}>
          <View>
            <Text style={s.totalLabel}>PRECIO TOTAL</Text>
            <Text style={s.totalValue}>{fmt(data.total)} MXN</Text>
          </View>
          <Text style={s.totalNote}>Precio para el mueble, medida y tela descritos. Ver términos y condiciones en la siguiente página.</Text>
        </View>
        {data.tiempoFabricacion ? (
          <View style={s.fabBox} wrap={false}>
            <Text style={s.fabLabel}>Tiempo estimado de fabricación</Text>
            <Text style={s.fabText}>{data.tiempoFabricacion}</Text>
          </View>
        ) : null}
        <Footer folio={data.folio} />
      </Page>

      <Page size="LETTER" style={s.page}>
        <Encabezado data={data} />
        <PasosYTerminos />
        <Footer folio={data.folio} />
      </Page>
    </Document>
  )
}
