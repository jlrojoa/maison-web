// src/pages/configurador/steps.js
//
// Pasos "resolver": los que van resolviendo cuál producto real queda
// seleccionado. En Camas son 3 (Familia -> Cabecera -> Pata, en cascada,
// sobre las columnas ya pobladas productos.familia/cabecera/pata). En las
// otras 3 categorías es 1 solo paso (Modelo) que resuelve el producto
// directo. De ahí en adelante (Tamaño, Tela) el flujo es idéntico para las
// 4 y no depende de esta tabla — StickyConfigurador los agrega siempre al
// final.
export const STEPS_BY_CATEGORY = {
  camas: [
    { id: 'familia', label: 'Familia', kind: 'cards' },
    { id: 'cabecera', label: 'Cabecera', kind: 'chips' },
    { id: 'pata', label: 'Pata', kind: 'chips' },
  ],
  sofas: [
    { id: 'modelo', label: 'Modelo', kind: 'cards' },
  ],
  'escuadras-l': [
    { id: 'modelo', label: 'Modelo', kind: 'cards' },
  ],
  'chaise-lounge': [
    { id: 'modelo', label: 'Modelo', kind: 'cards' },
  ],
}
