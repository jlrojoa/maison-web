// src/pages/configurador/cotizacionPdf/ModularesCotizacionPdf.jsx
//
// Documento de 2 páginas para la cotización de Modulares — detalle de
// configuración + plano técnico. SIN página de imagen de referencia (a
// diferencia de Veka): Modulares no tiene fotos reales de armados
// completos, y JL pidió explícitamente no inventarlas.
import { Document } from '@react-pdf/renderer'
import { registrarFuentesPdf } from './pdfFonts'
import { EMPRESA, empresaDeMarca } from './empresa'
import DetallePagePdf from './DetallePagePdf'
import PlanoPagePdf from './PlanoPagePdf'
import { Page } from '@react-pdf/renderer'
import { Encabezado, PasosYTerminos, Footer, s as sp } from './CotizacionSimplePdf'

registrarFuentesPdf()

export default function ModularesCotizacionPdf({ data }) {
  const empresa = data.marca ? empresaDeMarca(data.marca) : EMPRESA
  return (
    <Document title={data.marca ? `Cotización ${data.folio}` : `Cotización ${data.folio} · Brendell Modular`}>
      <DetallePagePdf data={data} empresa={empresa} />
      <PlanoPagePdf data={data} empresa={empresa} />
      <Page size="LETTER" style={sp.page}>
        <Encabezado data={data} titulo="BRENDELL MODULAR" />
        <PasosYTerminos marca={data.marca} />
        <Footer folio={data.folio} marca={data.marca} />
      </Page>
    </Document>
  )
}
