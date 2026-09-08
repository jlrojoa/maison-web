import { createClient } from '@supabase/supabase-js'

// Endpoint protegido: solo usuarios autenticados que además estén en admin_users
// pueden usarlo. La API key de Google nunca sale del servidor.

const FIELD_MASK = [
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

function extraeComponente(addressComponents, tipos) {
  const c = (addressComponents || []).find(c => tipos.some(t => c.types?.includes(t)))
  return c?.longText ?? null
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
    const googleRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, languageCode: 'es', regionCode: 'MX' }),
    })

    const data = await googleRes.json()
    if (!googleRes.ok) {
      res.status(502).json({ error: data?.error?.message || 'Error consultando Google Places' })
      return
    }

    const results = (data.places || []).map(p => ({
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

    res.status(200).json({ results })
  } catch (err) {
    res.status(500).json({ error: 'Error inesperado', detail: String(err) })
  }
}
