// Sube las fotos reales de Froca (Terranova + Nantes) al bucket 'telas' de Supabase Storage.
//
// Uso:
//   1. Copia la carpeta "upload/telas" que te dejó Claude (contiene terranova/ y nantes/)
//      a algún lugar accesible, o usa la ruta del scratchpad tal cual.
//   2. Corre, en una sola línea, con tu SERVICE_ROLE_KEY (Supabase > Settings > API):
//        SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/upload-froca-telas.mjs "C:/ruta/a/upload/telas"
//   3. NUNCA pongas SUPABASE_SERVICE_ROLE_KEY en .env.local con prefijo VITE_ — eso lo
//      empaqueta en el bundle público del sitio. Pásala solo como variable de entorno
//      de esta corrida, o en un .env.local sin prefijo VITE_ que nunca se commitea.
//
// Sube cada archivo a telas/<subcarpeta>/<archivo>, con upsert:true (si vuelves a correrlo,
// reemplaza en vez de fallar por duplicado).

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://smnjbqjvqomopeulsuvp.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno. Ver instrucciones en la cabecera de este script.')
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
