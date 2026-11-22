import { createClient } from '@supabase/supabase-js'
import { enviarAlMaestro } from './_maestro.js'

// Cuando una cotización pasa a "Pedido", el cotizador avisa aquí y se manda una copia al sistema Maestro.
// Endpoint protegido (mismo patrón que prospector-enviar-correo.js): solo usuarios autenticados que estén en admin_users.
// No se confía en lo que diga el navegador: la cotización se lee de nuevo con la sesión del usuario y debe seguir en estado "orden".
// La clave del Maestro vive solo aquí, en el servidor.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.email) return res.status(401).json({ error: 'Sesión inválida' })
  const { data: admin } = await supabase.from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!admin) return res.status(403).json({ error: 'No autorizado' })

  const id = typeof req.body === 'object' && req.body ? req.body.id : null
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Falta el id de la cotización' })

  const { data: cot, error } = await supabase.from('cotizaciones').select('*, items:cotizacion_items(*)').eq('id', id).single()
  if (error || !cot) return res.status(404).json({ error: 'Cotización no encontrada' })
  if (cot.status !== 'orden') return res.status(409).json({ error: 'La cotización no está en estado Pedido' })

  const r = await enviarAlMaestro(cot)
  return res.status(200).json(r)
}
