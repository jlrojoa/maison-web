// src/pages/configurador/ResultadoCotizacion.jsx
//
// Contenido del cuadro "cotización guardada/emitida" para los configuradores
// de producto único: entrega el PDF (ver/descargar) y permite enviarlo.
import { fmt } from './format'
import { abrirBlob, descargarBlob } from './cotizacionPdf/pdfActions'

export default function ResultadoCotizacion({ resultado, onClose }) {
  const enviar = () => {
    const cuerpo = encodeURIComponent(`Hola ${resultado.nombre},\n\nTe comparto tu cotización BR-${resultado.folio} (${fmt(resultado.precio)}). Te adjunto el PDF.\n\nSaludos.`)
    window.open(resultado.email
      ? `mailto:${resultado.email}?subject=${encodeURIComponent('Cotización BR-' + resultado.folio)}&body=${cuerpo}`
      : `https://wa.me/${resultado.tel.replace(/\D/g, '')}?text=${cuerpo}`, '_blank')
  }
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
        {resultado.modo === 'emitir' && (resultado.email || resultado.tel) && (
          <button type="button" className="cfg-btn cfg-btn-secondary" onClick={enviar}>Enviar al cliente</button>
        )}
        <a href="/mi-espacio" className="cfg-btn cfg-btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>Ir a Mi Espacio</a>
        <button type="button" className="cfg-btn cfg-btn-secondary" onClick={onClose}>Seguir configurando</button>
      </div>
    </>
  )
}
