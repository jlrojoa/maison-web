// Sube fotos de un producto al bucket 'maison' de Supabase Storage, bajo
// productos/<producto_id>/, con el mismo patrón de nombre que ya usan los
// productos existentes: <timestamp-ms>-<indice>.png (o la extensión real
// de cada archivo).
//
// Uso:
//   node scripts/upload-producto-fotos.mjs <producto_id> "<ruta a la carpeta de fotos>"
//
// Lee SUPABASE_SERVICE_ROLE_KEY de .env.upload-secrets (o del entorno si ya
// está seteada), igual que upload-froca-telas.mjs. No toca ninguna tabla —
// solo sube archivos al Storage.

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SECRETS_FILE = join(__dirname, '..', '.env.upload-secrets')

function cargarSecretoLocal() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return
  if (!existsSync(SECRETS_FILE)) return
  for (const linea of readFileSync(SECRETS_FILE, 'utf-8').split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const idx = limpia.indexOf('=')
    if (idx === -1) continue
    const clave = limpia.slice(0, idx).trim()
    const valor = limpia.slice(idx + 1).trim()
    if (clave === 'SUPABASE_SERVICE_ROLE_KEY' && valor) process.env.SUPABASE_SERVICE_ROLE_KEY = valor
  }
}
cargarSecretoLocal()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://smnjbqjvqomopeulsuvp.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const productoId = process.argv[2]
const carpeta = process.argv[3]

if (!SERVICE_KEY) {
  console.error(`Falta SUPABASE_SERVICE_ROLE_KEY. Crea el archivo ${SECRETS_FILE} con una línea:\nSUPABASE_SERVICE_ROLE_KEY=eyJ...tu-clave...`)
  process.exit(1)
}
if (!productoId || !carpeta) {
  console.error('Uso: node scripts/upload-producto-fotos.mjs <producto_id> "<ruta a la carpeta de fotos>"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const CONTENT_TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }

const archivos = readdirSync(carpeta).filter(f => statSync(join(carpeta, f)).isFile())
console.log(`Encontrados ${archivos.length} archivos en "${carpeta}".`)

const base = Date.now()
let ok = 0
let fail = 0
for (let i = 0; i < archivos.length; i++) {
  const archivo = archivos[i]
  const ext = extname(archivo).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
  const storagePath = `productos/${productoId}/${base}-${i}${ext}`
  const body = readFileSync(join(carpeta, archivo))
  const { error } = await supabase.storage.from('maison').upload(storagePath, body, { upsert: true, contentType })
  if (error) {
    console.error(`FALLÓ  ${archivo} -> ${storagePath}: ${error.message}`)
    fail++
  } else {
    console.log(`OK     ${archivo} -> ${storagePath}`)
    ok++
  }
}

console.log(`\nListo: ${ok} subidas, ${fail} fallidas.`)
