import { createClient } from '@supabase/supabase-js'

// Endpoint protegido: solo usuarios autenticados que además estén en admin_users
// pueden usarlo (mismo patrón que prospector-search.js). Envía un correo a cada
// prospecto seleccionado vía la API REST de Resend (sin SDK), opcionalmente
// adjuntando un archivo del bucket privado 'catalogos'. Al enviar con éxito,
// actualiza etapa (Nuevo -> Contactado) y agrega una línea a notas.

function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64')
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

  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ error: 'RESEND_API_KEY no está configurada en el servidor' })
    return
  }
  const fromAddress = process.env.RESEND_FROM || 'Brendell <onboarding@resend.dev>'

  const { prospectoIds, asunto, mensaje, catalogoId } = req.body || {}

  if (!Array.isArray(prospectoIds) || prospectoIds.length === 0) {
    res.status(400).json({ error: 'Selecciona al menos un prospecto' })
    return
  }
  if (!asunto?.trim() || !mensaje?.trim()) {
    res.status(400).json({ error: 'Falta asunto o mensaje' })
    return
  }

  const { data: prospectos, error: prospectosError } = await supabase
    .from('prospectos')
    .select('id, nombre, email, etapa, notas')
    .in('id', prospectoIds)

  if (prospectosError) {
    res.status(500).json({ error: 'No se pudieron leer los prospectos', detail: prospectosError.message })
    return
  }

  const destinatarios = (prospectos || []).filter(p => p.email)
  if (destinatarios.length === 0) {
    res.status(400).json({ error: 'Ninguno de los prospectos seleccionados tiene email' })
    return
  }

  // Adjunto opcional: se descarga una sola vez del bucket privado y se reusa
  // (misma base64) para todos los destinatarios.
  let attachment = null
  if (catalogoId) {
    const { data: catalogo, error: catalogoError } = await supabase
      .from('catalogos')
      .select('storage_path, nombre_archivo, titulo')
      .eq('id', catalogoId)
      .maybeSingle()

    if (catalogoError || !catalogo) {
      res.status(400).json({ error: 'No se encontró el adjunto seleccionado' })
      return
    }

    const { data: archivo, error: descargaError } = await supabase.storage
      .from('catalogos')
      .download(catalogo.storage_path)

    if (descargaError || !archivo) {
      res.status(500).json({ error: 'No se pudo descargar el adjunto', detail: descargaError?.message })
      return
    }

    const buffer = await archivo.arrayBuffer()
    attachment = {
      filename: catalogo.nombre_archivo || catalogo.titulo || 'presentacion.pdf',
      content: arrayBufferToBase64(buffer),
    }
  }

  const mensajeHtml = mensaje
    .split('\n')
    .map(linea => `<p>${linea.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')

  const enviados = []
  const fallidos = []

  for (const prospecto of destinatarios) {
    try {
      const body = {
        from: fromAddress,
        to: [prospecto.email],
        subject: asunto,
        html: mensajeHtml,
        text: mensaje,
        ...(attachment ? { attachments: [attachment] } : {}),
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(body),
      })

      if (!resendRes.ok) {
        const errData = await resendRes.json().catch(() => ({}))
        fallidos.push({ id: prospecto.id, email: prospecto.email, error: errData?.message || 'Error de Resend' })
        continue
      }

      enviados.push(prospecto.id)

      const hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const notaLinea = `[${hoy}] Correo enviado: "${asunto}"`
      const notasNuevas = prospecto.notas ? `${prospecto.notas}\n${notaLinea}` : notaLinea

      await supabase
        .from('prospectos')
        .update({
          notas: notasNuevas,
          ...(prospecto.etapa === 'Nuevo' ? { etapa: 'Contactado' } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospecto.id)
    } catch (err) {
      fallidos.push({ id: prospecto.id, email: prospecto.email, error: String(err) })
    }
  }

  if (enviados.length === 0) {
    res.status(502).json({ error: 'No se pudo enviar ningún correo', fallidos })
    return
  }

  res.status(200).json({ enviados, fallidos })
}
