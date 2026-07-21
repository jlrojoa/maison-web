// src/pages/CategoryIcons.jsx
//
// Iconos de línea (no fotos) para el selector "¿Qué tipo buscas?" del Configurador.
// Reemplazan el círculo de color con la inicial del nombre — con muebles muy
// distintos entre sí (sofá vs. mesa vs. cama), una letra no ayuda a reconocer
// la categoría de un vistazo; una silueta sí. Todos comparten el mismo trazo
// (stroke, sin relleno) y heredan su color de --cfg-tipo-color vía currentColor,
// para no duplicar la paleta que ya existe en Configurador.jsx.
const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function SofaIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M9 24c0-3.9 3.1-7 7-7h16c3.9 0 7 3.1 7 7v5H9v-5Z" />
      <path d="M7 29h34v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-6Z" />
      <path d="M20 24v5M28 24v5" />
      <path d="M11 38v2M37 38v2" />
    </svg>
  )
}

function BedIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <rect x="9" y="18" width="10" height="7" rx="2" />
      <path d="M9 25h30a4 4 0 0 1 4 4v6H9V25Z" />
      <path d="M7 35v4M43 35v4" />
      <path d="M9 25V16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function EscuadraIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M9 12h11a2 2 0 0 1 2 2v9h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V12Z" />
      <path d="M9 23h13" />
      <path d="M13 38v2M35 38v2" />
    </svg>
  )
}

function ChaiseIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M8 28c0-2.8 2.2-5 5-5h4V14a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v3h9a5 5 0 0 1 5 5v6" />
      <path d="M8 28h32v5a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3v-5Z" />
      <path d="M10 36v2M38 36v2" />
    </svg>
  )
}

function ModularIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <rect x="7" y="26" width="14" height="14" rx="2.5" />
      <rect x="27" y="26" width="14" height="14" rx="2.5" />
      <rect x="17" y="10" width="14" height="14" rx="2.5" />
    </svg>
  )
}

function ButacaIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M12 26a12 9.5 0 0 1 24 0v7a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3v-7Z" />
      <path d="M15 36v3M33 36v3" />
    </svg>
  )
}

function MesaIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <path d="M8 15h32" />
      <path d="M8 15v3M40 15v3" />
      <path d="M13 18v18M35 18v18" />
    </svg>
  )
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <rect x="9" y="9" width="30" height="30" rx="6" />
    </svg>
  )
}

export const CATEGORY_ICONS = {
  'sofas': SofaIcon,
  'camas': BedIcon,
  'escuadras-l': EscuadraIcon,
  'chaise-lounge': ChaiseIcon,
  'modulares': ModularIcon,
  'butacas': ButacaIcon,
  'mesas': MesaIcon,
}

export function CategoryIcon({ slug }) {
  const Icon = CATEGORY_ICONS[slug] ?? DefaultIcon
  return <Icon />
}
