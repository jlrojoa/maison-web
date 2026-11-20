// src/admin/cotizaciones/movil/respaldo.js
//
// Respaldo local del borrador mientras se captura: si se cae la señal o se cierra la app,
// lo capturado no se pierde. Es solo del navegador de este celular.
const CLAVE = 'brendell_cotizador_movil_borrador_v1'
export const leerRespaldo = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null') } catch { return null } }
export const guardarRespaldo = (estado) => { try { localStorage.setItem(CLAVE, JSON.stringify({ ...estado, guardado: Date.now() })) } catch { /* sin almacenamiento: se sigue sin respaldo */ } }
export const borrarRespaldo = () => { try { localStorage.removeItem(CLAVE) } catch { /* nada */ } }
