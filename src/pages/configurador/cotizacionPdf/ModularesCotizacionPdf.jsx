// src/pages/configurador/cotizacionPdf/ModularesCotizacionPdf.jsx
//
// Documento de 2 páginas para la cotización de Modulares — detalle de
// configuración + plano técnico. SIN página de imagen de referencia (a
// diferencia de Veka): Modulares no tiene fotos reales de armados
// completos, y JL pidió explícitamente no inventarlas.
import { Document } from '@react-pdf/renderer'
import { registrarFuentesPdf } from './pdfFonts'
import { EMPRESA } from './empresa'
import DetallePagePdf from './DetallePagePdf'
import PlanoPagePdf from './PlanoPagePdf'

registrarFuentesPdf()

export default function ModularesCotizacionPdf({ data }) {
  return (
    <Document title={`Cotización ${data.folio} · Brendell Modular`}>
      <DetallePagePdf data={data} empresa={EMPRESA} />
      <PlanoPagePdf data={data} empresa={EMPRESA} />
    </Document>
  )
}
