// src/pages/configurador/cotizacionPdf/CotizacionSimplePdf.jsx
//
// PDF de una página para cotizaciones de producto único (Camas, Sofás,
// Mesas, Butacas, etc.) — las que no tienen armado por piezas ni plano
// técnico (esas usan ModularesCotizacionPdf). Misma identidad visual
// (pdfTheme/empresa) y mismos datos congelados de cotizacion_items.
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { registrarFuentesPdf } from './pdfFonts'
import { EMPRESA } from './empresa'
import { fmt } from '../format'
import { fmtFecha, fmtVigencia } from './fmtPdf'
import { COLORS, PAGE_PADDING } from './pdfTheme'

registrarFuentesPdf()

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Poppins', fontSize: 9, color: COLORS.ink },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  presentadoPor: { fontSize: 7, color: COLORS.inkMuted, letterSpacing: 1.5, marginBottom: 3 },
  brand: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  brandContact: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 4, lineHeight: 1.5 },
  folioBadge: { backgroundColor: COLORS.accentBg, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  folioLabel: { fontSize: 6.5, color: COLORS.copperText, letterSpacing: 1.5 },
  folioValue: { fontSize: 13, fontWeight: 700, marginTop: 2 },
  metaRight: { fontSize: 7.5, color: COLORS.inkMuted, textAlign: 'right', marginTop: 6, lineHeight: 1.5 },
  hr: { borderBottomWidth: 3, borderBottomColor: COLORS.accentBg, marginTop: 12, marginBottom: 16 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 1, marginBottom: 8 },
  clienteBox: { backgroundColor: COLORS.fillNeutro, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 16 },
  clienteNombre: { fontSize: 11, fontWeight: 600 },
  clienteSub: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2 },
  tHeadRow: { flexDirection: 'row', backgroundColor: COLORS.fillNeutro, paddingVertical: 6, paddingHorizontal: 8 },
  tRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tHeadCell: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.5 },
  tCell: { fontSize: 8.5 },
  tSub: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 2 },
  colProd: { flex: 3 },
  colNum: { flex: 1, textAlign: 'right' },
  totalBox: { marginTop: 18, backgroundColor: COLORS.accentBg, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 8, color: COLORS.copperText, letterSpacing: 1 },
  totalValue: { fontSize: 20, fontWeight: 700, marginTop: 2 },
  footerHr: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 24, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { fontSize: 8 },
  footerMuted: { fontSize: 8, color: COLORS.inkMuted },
})

export default function CotizacionSimplePdf({ data }) {
  return (
    <Document title={`Cotización ${data.folio} · Brendell`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <View style={{ maxWidth: 300 }}>
            <Text style={s.presentadoPor}>PRESENTADO POR</Text>
            <Text style={s.brand}>BRENDELL</Text>
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

        {data.clienteNombre ? (
          <View style={s.clienteBox}>
            <Text style={s.sectionLabel}>PARA</Text>
            <Text style={s.clienteNombre}>{data.clienteNombre}</Text>
            {(data.clienteEmail || data.clienteTelefono) && (
              <Text style={s.clienteSub}>{[data.clienteEmail, data.clienteTelefono].filter(Boolean).join(' · ')}</Text>
            )}
          </View>
        ) : null}

        <Text style={s.sectionLabel}>DETALLE</Text>
        <View style={s.tHeadRow}>
          <Text style={[s.tHeadCell, s.colProd]}>PRODUCTO</Text>
          <Text style={[s.tHeadCell, s.colNum]}>CANT.</Text>
          <Text style={[s.tHeadCell, s.colNum]}>P. UNIT.</Text>
          <Text style={[s.tHeadCell, s.colNum]}>SUBTOTAL</Text>
        </View>
        {data.filas.map((f, i) => (
          <View key={i} style={s.tRow} wrap={false}>
            <View style={s.colProd}>
              <Text style={s.tCell}>{f.producto}{f.configuracion ? ` · ${f.configuracion}` : ''}</Text>
              {f.medidas ? <Text style={s.tSub}>Medidas: {f.medidas}</Text> : null}
              {f.textil ? <Text style={s.tSub}>Tela: {f.textil}</Text> : null}
            </View>
            <Text style={[s.tCell, s.colNum]}>{f.cantidad}</Text>
            <Text style={[s.tCell, s.colNum]}>{fmt(f.precioUnitario)}</Text>
            <Text style={[s.tCell, s.colNum, { fontWeight: 700 }]}>{fmt(f.subtotal)}</Text>
          </View>
        ))}

        <View style={s.totalBox}>
          <View>
            <Text style={s.totalLabel}>PRECIO TOTAL</Text>
            <Text style={s.totalValue}>{fmt(data.total)} MXN</Text>
          </View>
        </View>

        <View style={s.footerHr}>
          <View style={{ maxWidth: 430 }}>
            <Text style={s.footerLeft}>Brendell · {EMPRESA.razonSocial}</Text>
            <Text style={s.footerMuted}>RFC: {EMPRESA.rfc}</Text>
            <Text style={s.footerMuted}>{EMPRESA.direccion}</Text>
          </View>
          <View>
            <Text style={s.footerMuted}>{EMPRESA.telefono}</Text>
            <Text style={s.footerMuted}>{EMPRESA.email}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
