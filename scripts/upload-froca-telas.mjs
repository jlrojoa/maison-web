// Sube fotos de colecciones de Froca al bucket 'telas' de Supabase Storage.
//
// Uso (ya no hace falta pegar la clave cada vez):
//   1. La primera vez, crea el archivo .env.upload-secrets en la raíz del proyecto
//      (junto a package.json) con una sola línea:
//        SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-clave-completa...
//      Ese archivo NUNCA se sube a git (ya está en .gitignore vía *.local... revisa
//      que tu editor no le ponga otra extensión). Trátalo como una contraseña.
//   2. De ahí en adelante, solo corre:
//        node scripts/upload-froca-telas.mjs "C:/ruta/a/la/carpeta/de/fotos"
//      El script lee la clave solo del archivo, no queda nada pegado en PowerShell.
//
// Sube cada archivo a telas/<subcarpeta>/<archivo>, con upsert:true (si vuelves a correrlo,
// reemplaza en vez de fallar por duplicado).

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SECRETS_FILE = join(__dirname, '..', '.env.upload-secrets')

function cargarSecretoLocal() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return // ya viene del entorno, no tocar
  if (!existsSync(SECRETS_FILE)) return
  const contenido = readFileSync(SECRETS_FILE, 'utf-8')
  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const idx = limpia.indexOf('=')
    if (idx === -1) continue
    const clave = limpia.slice(0, idx).trim()
    const valor = limpia.slice(idx + 1).trim()
    if (clave === 'SUPABASE_SERVICE_ROLE_KEY' && valor) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = valor
    }
  }
}

cargarSecretoLocal()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://smnjbqjvqomopeulsuvp.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SERVICE_KEY) {
  console.error(`Falta SUPABASE_SERVICE_ROLE_KEY. Crea el archivo ${SECRETS_FILE} con una línea:\nSUPABASE_SERVICE_ROLE_KEY=eyJ...tu-clave...\nVer instrucciones completas en la cabecera de este script.`)
  process.exit(1)
}

const root = process.argv[2]
if (!root) {
  console.error('Uso: node scripts/upload-froca-telas.mjs "<ruta a la carpeta upload/telas>"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const CONTENT_TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

function walk(dir, prefix) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walk(full, `${prefix}${entry}/`))
    } else {
      files.push({ full, storagePath: `${prefix}${entry}` })
    }
  }
  return files
}

const files = walk(root, '')
console.log(`Encontrados ${files.length} archivos para subir al bucket 'telas'.`)

let ok = 0
let fail = 0
for (const { full, storagePath } of files) {
  const contentType = CONTENT_TYPES[extname(full).toLowerCase()] || 'application/octet-stream'
  const body = readFileSync(full)
  const { error } = await supabase.storage.from('telas').upload(storagePath, body, {
    upsert: true,
    contentType,
  })
  if (error) {
    console.error(`FALLÓ  ${storagePath}: ${error.message}`)
    fail++
  } else {
    console.log(`OK     ${storagePath}`)
    ok++
  }
}

console.log(`\nListo: ${ok} subidas, ${fail} fallidas.`)
