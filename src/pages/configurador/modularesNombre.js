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
  try {
    const a = item.notas ? JSON.parse(item.notas)?.armado : null
    return a && typeof a.id === 'string' && Array.isArray(a.sequence) && a.sequence.length > 0 ? a : null
  } catch { return null }
}

// "Cancún (B) · Azul Cielo" -> { catalogo: 'Cancún', grado: 'B', color: 'Azul Cielo' }
// (formato con el que se guarda la tela en cotizacion_items.textil_nombre).
export function parseTextil(textil) {
  const m = /^(.+) \(([^)]+)\) · (.+)$/.exec(textil ?? '')
  return m ? { catalogo: m[1], grado: m[2], color: m[3] } : { catalogo: textil ?? '', grado: '', color: '' }
}

// Cotización guardada que es UN armado de Modulares (tiene la secuencia).
export const esModular = (cot) => !!cot.secuencia_pdf?.sequence?.length
