// src/pages/configurador/cotizacionPdf/DetallePagePdf.jsx
//
// Página 1 — detalle de configuración. Layout inspirado en el formato de
// referencia de Veka (ver conversación con JL, 2026-09-01) pero con la
// paleta blueprint propia de Brendell (grafito/cobre, ver pdfTheme.js) en
// vez del negro-sobre-blanco de Veka, y SIN "Opciones de pago" — Brendell
// cotiza a precio único, sin mensualidades ni tasas de interés.
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { fmt } from '../format'
import { fmtFecha, fmtVigencia } from './fmtPdf'
import { COLORS, PAGE_PADDING } from './pdfTheme'

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Poppins', fontSize: 9, color: COLORS.ink },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  presentadoPor: { fontSize: 7, color: COLORS.inkMuted, letterSpacing: 1.5, marginBottom: 3 },
  brand: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  brandContact: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 4, lineHeight: 1.5 },
  folioBadge: { backgroundColor: COLORS.headerBg, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  folioLabel: { fontSize: 6.5, color: '#94A3B8', letterSpacing: 1.5 },
  folioValue: { fontSize: 13, color: '#fff', fontWeight: 700, marginTop: 2 },
  metaRight: { fontSize: 7.5, color: COLORS.inkMuted, textAlign: 'right', marginTop: 6, lineHeight: 1.5 },
  hr: { borderBottomWidth: 1.5, borderBottomColor: COLORS.ink, marginTop: 12, marginBottom: 16 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 1, marginBottom: 8 },

  table: { borderRadius: 6, overflow: 'hidden' },
  tHeadRow: { flexDirection: 'row', backgroundColor: COLORS.fillNeutro, paddingVertical: 6, paddingHorizontal: 8 },
  tRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tHeadCell: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.5 },
  tCell: { fontSize: 8.5 },
  tCellBold: { fontSize: 8.5, fontWeight: 700 },
  colPieza: { flex: 2.6 },
  colNum: { flex: 1, textAlign: 'right' },

  cards: { flexDirection: 'row', gap: 10, marginTop: 16 },
  card: { flex: 1, backgroundColor: COLORS.fillNeutro, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  cardLabel: { fontSize: 7, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 0.8, marginBottom: 3 },
  cardValue: { fontSize: 11, fontWeight: 600, color: COLORS.ink },
  cardSub: { fontSize: 7.5, color: COLORS.inkMuted, marginTop: 1 },

  totalBox: {
    marginTop: 18, backgroundColor: COLORS.headerBg, borderRadius: 8,
    paddingVertical: 14, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 8, color: '#CBD5E1', letterSpacing: 1 },
  totalValue: { fontSize: 20, color: '#fff', fontWeight: 700, marginTop: 2 },
  totalArmado: { fontSize: 8.5, color: '#CBD5E1', textAlign: 'right' },

  fabricacionBox: {
    marginTop: 12, borderWidth: 1, borderColor: COLORS.copperLineFaint, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: COLORS.panelBg,
  },
  fabricacionLabel: { fontSize: 8, fontWeight: 700, color: COLORS.copperText },
  fabricacionText: { fontSize: 8, color: COLORS.inkMuted, marginTop: 2 },

  footerHr: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 24, paddingTop: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { fontSize: 8 },
  footerBold: { fontWeight: 700 },
  footerMuted: { color: COLORS.inkMuted },
  footerRight: { fontSize: 8, color: COLORS.inkMuted, textAlign: 'right' },
})

export default function DetallePagePdf({ data, casaMin }) {
  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.presentadoPor}>PRESENTADO POR</Text>
          <Text style={s.brand}>BRENDELL MODULAR</Text>
          <Text style={s.brandContact}>
            {casaMin.razonSocial} · RFC {casaMin.rfc}{'\n'}
            {casaMin.direccion} · {casaMin.telefono}
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

      <Text style={s.sectionLabel}>CONFIGURACIÓN DEL MUEBLE</Text>
      <View style={s.table}>
        <View style={s.tHeadRow}>
          <Text style={[s.tHeadCell, s.colPieza]}>MÓDULO</Text>
          <Text style={[s.tHeadCell, s.colNum]}>CANT.</Text>
          <Text style={[s.tHeadCell, s.colNum]}>ANCHO</Text>
          <Text style={[s.tHeadCell, s.colNum]}>PROF.</Text>
          <Text style={[s.tHeadCell, s.colNum]}>P. UNIT.</Text>
          <Text style={[s.tHeadCell, s.colNum]}>SUBTOTAL</Text>
        </View>
        {data.filas.map((f, i) => (
          <View key={i} style={s.tRow}>
            <Text style={[s.tCell, s.colPieza]}>{f.nombre}</Text>
            <Text style={[s.tCell, s.colNum]}>{f.cantidad}</Text>
            <Text style={[s.tCell, s.colNum]}>{f.anchoCm} cm</Text>
            <Text style={[s.tCell, s.colNum]}>{f.profundidadCm} cm</Text>
            <Text style={[s.tCell, s.colNum]}>{fmt(f.precioUnitario)}</Text>
            <Text style={[s.tCellBold, s.colNum]}>{fmt(f.subtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={s.cards}>
        <View style={s.card}>
          <Text style={s.cardLabel}>TONO DE TELA</Text>
          <Text style={s.cardValue}>{data.colorNombre || '—'}</Text>
          <Text style={s.cardSub}>Orientación: {data.orientacion}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>MÓDULOS TOTAL</Text>
          <Text style={s.cardValue}>{data.totalPiezas} piezas</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>HUELLA APROX. (ANCHO × PROF.)</Text>
          <Text style={s.cardValue}>{data.huellaAnchoCm} × {data.huellaProfundidadCm} cm</Text>
          <Text style={s.cardSub}>{data.nombreArmado}</Text>
        </View>
      </View>

      <View style={s.totalBox}>
        <View>
          <Text style={s.totalLabel}>PRECIO TOTAL</Text>
          <Text style={s.totalValue}>{fmt(data.total)} MXN</Text>
        </View>
        <Text style={s.totalArmado}>{data.productoNombre} · {data.nombreArmado}</Text>
      </View>

      <View style={s.fabricacionBox}>
        <Text style={s.fabricacionLabel}>Tiempo estimado de fabricación</Text>
        <Text style={s.fabricacionText}>{data.tiempoFabricacion}</Text>
      </View>

      <View style={s.footerHr}>
        <View style={s.footerRow}>
          <View>
            <Text style={[s.footerLeft, s.footerBold]}>Brendell Modular · {casaMin.razonSocial}</Text>
            <Text style={[s.footerLeft, s.footerMuted]}>RFC: {casaMin.rfc} · {casaMin.direccion}</Text>
          </View>
          <Text style={s.footerRight}>{casaMin.telefono}</Text>
        </View>
      </View>
    </Page>
  )
}
