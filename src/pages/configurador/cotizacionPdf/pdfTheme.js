// src/pages/configurador/cotizacionPdf/pdfTheme.js
//
// Mismos valores que ModularesConfigurador.css (.mod-plano-panel y
// alrededores) — el estilo blueprint propio de Brendell (grafito/cobre
// sobre fondo claro), NO el negro-sobre-blanco de Veka. Un solo lugar para
// que la página 1 y la página 2 del PDF usen exactamente los mismos tonos
// que ya se ven en pantalla en el plano técnico del configurador.
export const COLORS = {
  ink: '#2A2620', // texto principal, mismo que .mod-plano-panel { color }
  inkMuted: '#5B5449', // texto secundario (subtítulos, leyenda)
  copperLine: '#C97C4A', // líneas/bordes cobre — nunca texto (bajo contraste)
  copperText: '#9C5228', // texto cobre sobre fondo claro (sí cumple contraste)
  copperLineFaint: 'rgba(201,124,74,0.4)', // separadores, mismo alpha que CSS
  panelBg: '#F7F5F2', // fondo del panel blueprint
  panelBgAlt: '#FFFFFF', // fondo de página / tarjetas sobre el panel
  border: '#E2E8F0', // gris neutro ya establecido para tarjetas/tablas (no beige)
  fillNeutro: '#F8FAFC',
  headerBg: '#0F172A', // franja oscura del encabezado (folio), mismo tono que .mod-tela-card.mod-on etc.
}

// Mismos valores que BLUEPRINT_COLORS en ModularesConfigurador.jsx — el
// dibujo de las piezas en el plano NUNCA usa cobre (reservado para
// cotas/título/leyenda), para no competir visualmente.
export const BLUEPRINT_PIEZA_COLORS = {
  fill: '#EFEDE9',
  seat: '#F8F7F4',
  back: '#DAD7D0',
  stroke: '#2A2620',
}

export const PAGE_PADDING = 36
