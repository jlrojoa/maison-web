// src/pages/configurador/CotizacionModal.jsx
import { fmt } from './format'
import ResultadoCotizacion from './ResultadoCotizacion'

export default function CotizacionModal({
  cotizModo, cotizResultado, cotizForm, setCotizForm, cotizSaving,
  precioLookup, onConfirm, onClose,
}) {
  if (!cotizModo) return null

  return (
    <div className="cfg-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !cotizSaving) onClose() }}>
      <div className="cfg-modal-box">
        {cotizResultado ? (
          <ResultadoCotizacion resultado={cotizResultado} onClose={onClose} />
        ) : (
          <>
            <h3 className="cfg-modal-title">{cotizModo === 'emitir' ? 'Crear cotización' : 'Guardar borrador'}</h3>
            <p className="cfg-modal-text">Este documento es el que le compartes a tu cliente final.</p>
            <label className="cfg-dropdown-label">Nombre del cliente *</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_nombre} onChange={e => setCotizForm(f => ({ ...f, cliente_nombre: e.target.value }))} />
            <label className="cfg-dropdown-label">Email del cliente</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_email} onChange={e => setCotizForm(f => ({ ...f, cliente_email: e.target.value }))} />
            <label className="cfg-dropdown-label">Teléfono del cliente</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_telefono} onChange={e => setCotizForm(f => ({ ...f, cliente_telefono: e.target.value }))} />
            <label className="cfg-dropdown-label">Tu margen (%)</label>
            <input className="cfg-dropdown" type="number" value={cotizForm.markup_pct} onChange={e => setCotizForm(f => ({ ...f, markup_pct: e.target.value }))} />
            <div className="cfg-summary-price-row" style={{ marginBottom: 16 }}>
              <span>Precio para tu cliente</span>
              <span>{fmt(Math.round(precioLookup * (1 + (parseFloat(cotizForm.markup_pct) || 0) / 100)))}</span>
            </div>
            <div className="cfg-buttons">
              <button type="button" className="cfg-btn cfg-btn-primary" disabled={cotizSaving} onClick={onConfirm}>
                {cotizSaving ? 'Guardando…' : cotizModo === 'emitir' ? 'Confirmar y emitir' : 'Guardar borrador'}
              </button>
              <button type="button" className="cfg-btn cfg-btn-secondary" disabled={cotizSaving} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
