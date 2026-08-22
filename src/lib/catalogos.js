// src/lib/catalogos.js
//
// Bucket 'catalogos' es privado (a diferencia de 'productos'/'telas'/'maison').
// Nunca usar getPublicUrl aquí — no sirve de nada en un bucket privado y sería el
// mismo error que este bloque de trabajo existe para evitar. Toda descarga pasa por
// una signed URL de corta duración, generada al momento de pedirla.
import { supabase } from './supabase'

const BUCKET = 'catalogos'

export async function uploadCatalogoFile(file, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export async function getCatalogoSignedUrl(path, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function deleteCatalogoFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export const TIPO_LABELS = {
  catalogo: 'Catálogo',
  lista_precios: 'Lista de precios',
  aviso: 'Aviso',
  imagen: 'Imagen',
}
