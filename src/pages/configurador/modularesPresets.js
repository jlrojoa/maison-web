// src/pages/configurador/modularesPresets.js
//
// Atajos de arranque para el armado de Modulares (Cubo, Milan) — NO son
// productos ni SKUs (ver orden de JL, 2026-08-26). Cada preset es una
// SECUENCIA ordenada de tipos de pieza (mismo modelo mental que
// modularesSequence.js) que se valida contra getAllowedTypes() al
// aplicarse — si algún día cambian las reglas de posición, un preset que ya
// no sea válido simplemente no debería usarse, así que estas listas están
// escritas para pasar esa validación tal cual.
//
// Confirmados por JL, 2026-08-25 — la suma de sus piezas en Grado B debe
// reproducir exactamente: Dos plazas 11,800 · Tres plazas 17,700 · Chaise
// 22,500 · Escuadra dos brazos 29,500 · Escuadra con puff 28,400.
export const ARMADOS_SUGERIDOS = [
  { id: 'dos-plazas', nombre: 'Dos plazas', tipos: ['left', 'right'] },
  { id: 'tres-plazas', nombre: 'Tres plazas', tipos: ['left', 'center', 'right'] },
  { id: 'chaise', nombre: 'Chaise', tipos: ['left', 'center', 'right', 'puff'] },
  { id: 'escuadra-dos-brazos', nombre: 'Escuadra dos brazos', tipos: ['left', 'center', 'corner', 'center', 'right'] },
  { id: 'escuadra-con-puff', nombre: 'Escuadra con puff', tipos: ['left', 'center', 'corner', 'center', 'puff'] },
]
