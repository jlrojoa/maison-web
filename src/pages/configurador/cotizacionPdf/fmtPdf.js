// src/pages/configurador/cotizacionPdf/fmtPdf.js
export function fmtFecha(date) {
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

export function fmtVigencia(fecha, dias) {
  const vence = new Date(fecha)
  vence.setDate(vence.getDate() + dias)
  return fmtFecha(vence)
}
