// src/pages/configurador/ResultadoCotizacion.jsx
//
// Contenido del cuadro "cotización guardada/emitida" para los configuradores
// de producto único: entrega el PDF (ver/descargar) y permite enviarlo.
import { fmt } from './format'
import { abrirBlob, descargarBlob, compartirPdf } from './cotizacionPdf/pdfActions'

export default function ResultadoCotizacion({ resultado, onClose }) {
  const enviar = () => compartirPdf({
    blob: resultado.pdfBlob, nombre: resultado.pdfNombre ?? 'cotizacion.pdf',
    asunto: `Cotización BR-${resultado.folio}`,
    cuerpo: `Hola ${resultado.nombre},\n\nTe comparto tu cotización BR-${resultado.folio} (${fmt(resultado.precio)}).\n\nSaludos.`,
    email: resultado.email, tel: resultado.tel,
  })
  return (
    <>
      <h3 className="cfg-modal-title">
        {resultado.modo === 'emitir' ? '¡Cotización emitida!' : 'Guardada en Mi Espacio'}
      </h3>
      <p className="cfg-modal-text">
        {resultado.modo === 'emitir' && resultado.folio
          ? <>Folio <b>BR-{resultado.folio}</b>. Vigente 15 días. Aquí tienes tu PDF; también lo encuentras siempre en Mi Espacio.</>
          : <>Quedó guardada como borrador. Puedes revisar el PDF y emitirla cuando quieras desde Mi Espacio.</>}
      </p>
      {resultado.pdfError && <p className="cfg-modal-text" style={{ color: '#B91C1C' }}>La cotización se guardó, pero no se pudo generar el PDF aquí ({resultado.pdfError}). Ábrelo desde Mi Espacio.</p>}
      <div className="cfg-buttons">
        {resultado.pdfBlob && (
          <>
            <button type="button" className="cfg-btn cfg-btn-primary" onClick={() => abrirBlob(resultado.pdfBlob)}>Ver PDF</button>
            <button type="button" className="cfg-btn cfg-btn-secondary" onClick={() => descargarBlob(resultado.pdfBlob, resultado.pdfNombre ?? 'cotizacion.pdf')}>Descargar PDF</button>
          </>
        )}
        {resultado.modo === 'emitir' && resultado.pdfBlob && (resultado.email || resultado.tel) && (
          <button type="button" className="cfg-btn cfg-btn-secondary" onClick={enviar}>Enviar al cliente</button>
        )}
        <a href="/mi-espacio" className="cfg-btn cfg-btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>Ir a Mi Espacio</a>
        <button type="button" className="cfg-btn cfg-btn-secondary" onClick={onClose}>Seguir configurando</button>
      </div>
    </>
  )
}
