import { createClient } from '@supabase/supabase-js'

// Endpoint protegido: mismo patrón de auth que prospector-search.js. Lee y
// controla (pausar/reactivar/presupuesto) las campañas de Meta Ads de la
// cuenta de Brendell. Nunca crea campañas nuevas — eso todavía no está
// conectado (requiere armar el flujo de creativos/targeting con JL primero).
//
// Requiere en Vercel: META_ACCESS_TOKEN (system user token con permiso
// ads_management sobre el Business "Brendellsofa") y META_AD_ACCOUNT_ID
// (el id numérico de la cuenta, sin "act_" — ej. 1394121918831363).

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

async function llamarGraph(path, { method = 'GET', params = {} } = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`)
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN)
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString())
    return { ok: res.ok, data: await res.json() }
  }
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { method: 'POST' })
  return { ok: res.ok, data: await res.json() }
}

export default async function handler(req, res) {
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

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
    res.status(500).json({ error: 'META_ACCESS_TOKEN / META_AD_ACCOUNT_ID no están configuradas en el servidor' })
    return
  }
  const adAccountId = process.env.META_AD_ACCOUNT_ID.replace(/^act_/, '')

  try {
    if (req.method === 'GET') {
      const { ok, data } = await llamarGraph(`/act_${adAccountId}/campaigns`, {
        params: {
          fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,insights.date_preset(last_30d){spend,impressions,reach,clicks}',
          limit: '100',
        },
      })
      if (!ok) {
        res.status(502).json({ error: data?.error?.message || 'Error consultando Meta' })
        return
      }
      const campanas = (data.data || []).map(c => ({
        id: c.id,
        nombre: c.name,
        estado: c.effective_status,
        objetivo: c.objective,
        presupuesto_diario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        presupuesto_total: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        gasto: c.insights?.data?.[0]?.spend ? Number(c.insights.data[0].spend) : 0,
        alcance: c.insights?.data?.[0]?.reach ? Number(c.insights.data[0].reach) : 0,
        clics: c.insights?.data?.[0]?.clicks ? Number(c.insights.data[0].clicks) : 0,
      }))
      res.status(200).json({ campanas })
      return
    }

    if (req.method === 'PATCH') {
      const { campaignId, accion, dailyBudget } = req.body || {}
      if (!campaignId || !accion) {
        res.status(400).json({ error: 'Falta campaignId o accion' })
        return
      }

      let params = {}
      if (accion === 'pausar') params = { status: 'PAUSED' }
      else if (accion === 'activar') params = { status: 'ACTIVE' }
      else if (accion === 'presupuesto') {
        if (!dailyBudget || Number(dailyBudget) <= 0) {
          res.status(400).json({ error: 'Presupuesto inválido' })
          return
        }
        params = { daily_budget: String(Math.round(Number(dailyBudget) * 100)) }
      } else {
        res.status(400).json({ error: 'Acción no reconocida' })
        return
      }

      const { ok, data } = await llamarGraph(`/${campaignId}`, { method: 'POST', params })
      if (!ok) {
        res.status(502).json({ error: data?.error?.message || 'Error actualizando la campaña en Meta' })
        return
      }
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Método no permitido' })
  } catch (err) {
    res.status(500).json({ error: 'Error inesperado', detail: String(err) })
  }
}
