// src/pages/configurador/modularesNombre.js
import { ARMADOS_SUGERIDOS } from './modularesPresets'

// Compara la secuencia (solo los tipos, en orden) contra cada preset de
// modularesPresets.js — si calza usa ese nombre ("Chaise", "Escuadra dos
// brazos"...), si no "Personalizado".
export function nombreDelArmado(sequence) {
  const tipos = sequence.map(p => p.type)
  const preset = ARMADOS_SUGERIDOS.find(p => p.tipos.length === tipos.length && p.tipos.every((t, i) => t === tipos[i]))
  return preset?.nombre ?? 'Personalizado'
}

// El armado al que pertenece una línea de cotizacion_items (se guarda como
// JSON en `notas`: { id, sequence, mirrored, nombre, qty }), o null.
export function notasArmado(item) {
  try { return item.notas ? JSON.parse(item.notas)?.armado ?? null : null } catch { return null }
}

// Cotización guardada que es UN armado de Modulares (tiene la secuencia).
export const esModular = (cot) => !!cot.secuencia_pdf?.sequence?.length
