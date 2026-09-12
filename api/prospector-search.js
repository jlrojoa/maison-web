import { createClient } from '@supabase/supabase-js'

// Endpoint protegido: solo usuarios autenticados que además estén en admin_users
// pueden usarlo. La API key de Google nunca sale del servidor.
// Trae TODAS las páginas disponibles (hasta 60 resultados, tope real de Google
// Places Text Search — 3 páginas de 20). Cada página es una búsqueda facturada.

const FIELD_MASK = [
  'nextPageToken',
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
].join(',')

const TERMINO_POR_TIPO = {
  'mueblería': 'mueblería',
  diseñador_interior: 'diseñador de interiores',
  arquitecto: 'despacho de arquitectura',
  fabrica_muebles: 'fábrica de muebles',
  hotel: 'hotel',
  otro: '',
}

const MAX_PAGINAS = 3
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function extraeComponente(addressComponents, tipos) {
  const c = (addressComponents || []).find(c => tipos.some(t => c.types?.includes(t)))
  return c?.longText ?? null
}

// Google Places Text Search es una búsqueda por relevancia sobre el texto
// completo, no un filtro geográfico real (no soporta AND estricto por
// estado/municipio). Por eso puede regresar resultados de otro estado —
// ej. "Bosque de las Lomas" existe como colonia real tanto en Miguel
// Hidalgo (CDMX) como en Sahuayo (Michoacán); Google puede rankear alto un
// negocio de ese segundo lugar aunque el texto también mencione CDMX.
// Filtramos aquí, comparando el estado/municipio que Google geocodificó
// para CADA resultado (addressComponents), contra lo que pidió el usuario.
function normaliza(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function coincideUbicacion(valorResultado, valorFiltro) {
  if (!valorFiltro) return true
  if (!valorResultado) return true // Google no siempre geocodifica ese nivel; no descartamos por falta de dato
  const a = normaliza(valorResultado)
  const b = normaliza(valorFiltro)
  return a === b || a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a)
}

async function llamarGoogle(body) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.email) {
    res.status(401).json({ error: 'Sesión inválida' })
    return
  }

  const { data: admin } = await supabase.from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!admin) {
    res.status(403).json({ error: 'No autorizado' })
    return
  }

  const { tipo, estado, municipio, colonia, textoLibre } = req.body || {}
  const termino = TERMINO_POR_TIPO[tipo] ?? ''
  const textQuery = [termino, textoLibre, colonia, municipio, estado, estado ? null : 'México']
    .filter(Boolean)
    .join(', ')

  if (!textQuery.trim()) {
    res.status(400).json({ error: 'Agrega al menos un filtro de tipo o ubicación' })
    return
  }

  try {
    const vistos = new Set()
    const todos = []
    let pageToken = null
    let paginas = 0

    do {
      const body = pageToken
        ? { pageToken }
        : { textQuery, languageCode: 'es', regionCode: 'MX' }

      if (pageToken) await sleep(400)

      const { ok, data } = await llamarGoogle(body)
      paginas += 1

      if (!ok) {
        if (todos.length > 0) break // ya tenemos algo útil, no truena la búsqueda completa
        res.status(502).json({ error: data?.error?.message || 'Error consultando Google Places' })
        return
      }

      for (const p of data.places || []) {
        if (vistos.has(p.id)) continue
        vistos.add(p.id)
        todos.push(p)
      }

      pageToken = data.nextPageToken ?? null
    } while (pageToken && paginas < MAX_PAGINAS)

    const results = todos
      .map(p => ({
        google_place_id: p.id,
        nombre: p.displayName?.text ?? '(sin nombre)',
        direccion: p.formattedAddress ?? null,
        estado: extraeComponente(p.addressComponents, ['administrative_area_level_1']),
        municipio: extraeComponente(p.addressComponents, ['locality', 'administrative_area_level_2']),
        colonia: extraeComponente(p.addressComponents, ['sublocality_level_1', 'neighborhood', 'sublocality']),
        codigo_postal: extraeComponente(p.addressComponents, ['postal_code']),
        telefono: p.nationalPhoneNumber ?? null,
        sitio_web: p.websiteUri ?? null,
        rating: p.rating ?? null,
        rating_count: p.userRatingCount ?? null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      }))
      // Google Text Search no filtra estrictamente por ubicación (ver nota
      // arriba de coincideUbicacion) — descartamos aquí lo que Google marcó
      // en otro estado del que pidió el usuario. Solo a nivel estado: a nivel
      // municipio, Google frecuentemente etiqueta direcciones de CDMX con
      // locality/administrative_area_level_2 = "Ciudad de México" en vez de
      // la alcaldía real (ej. "Miguel Hidalgo") — filtrar por municipio ahí
      // descartaría TODOS los resultados reales, un falso negativo peor que
      // el bug original.
      .filter(r => coincideUbicacion(r.estado, estado))

    res.status(200).json({ results, paginasConsultadas: paginas, truncado: results.length >= 60 })
  } catch (err) {
    res.status(500).json({ error: 'Error inesperado', detail: String(err) })
  }
}
