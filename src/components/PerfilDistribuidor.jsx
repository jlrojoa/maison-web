import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'

const input = { width: '100%', padding: '9px 10px', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }
const label = { display: 'block', fontSize: 11, color: '#64748B', margin: '12px 0 4px' }
const btn = (primary) => ({
  padding: '9px 14px', borderRadius: 4, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1px solid ${primary ? '#0F172A' : '#E2E8F0'}`, background: primary ? '#0F172A' : '#fff', color: primary ? '#fff' : '#0F172A',
})

// Datos del distribuidor para sus cotizaciones con marca propia: se capturan
// una sola vez y se guardan en su perfil (nombre, contacto, condiciones y logo).
export default function PerfilDistribuidor({ onGuardado }) {
  const ctx = useDistribuidor()
  const d = ctx?.distribuidor
  const [f, setF] = useState(() => ({
    nombre_comercial: d?.nombre_comercial || d?.empresa || d?.nombre || '',
    telefono: d?.telefono || '', direccion: d?.direccion || '', condiciones: d?.condiciones_venta || '',
  }))
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState('')
  const set = (k, v) => { setAviso(''); setF(prev => ({ ...prev, [k]: v })) }

  const guardar = async () => {
    if (!f.nombre_comercial.trim()) return alert('Escribe el nombre de tu negocio: aparecerá en el PDF.')
    setGuardando(true)
    try {
      const { error } = await supabase.rpc('actualizar_mi_perfil', {
        p_nombre_comercial: f.nombre_comercial, p_telefono: f.telefono, p_direccion: f.direccion, p_condiciones: f.condiciones,
      })
      if (error) throw error
      await ctx?.refrescar?.()
      setAviso('Guardado. Se usará en todas tus cotizaciones con tus datos.')
      onGuardado?.()
    } catch (err) { alert(`No se pudieron guardar tus datos: ${err.message}`) } finally { setGuardando(false) }
  }

  const subirLogo = async (file) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return alert('El logo debe ser PNG, JPG o WEBP.')
    if (file.size > 1024 * 1024) return alert('El logo pesa más de 1 MB. Usa una versión más ligera.')
    setSubiendo(true)
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const ruta = `${d.email}/logo-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('logos-distribuidores').upload(ruta, file, { contentType: file.type, upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('logos-distribuidores').getPublicUrl(ruta)
      const { error: rpcErr } = await supabase.rpc('actualizar_mi_logo', { p_logo_url: data.publicUrl })
      if (rpcErr) throw rpcErr
      await ctx?.refrescar?.()
    } catch (err) { alert(`No se pudo subir el logo: ${err.message}`) } finally { setSubiendo(false) }
  }
  const quitarLogo = async () => {
    setSubiendo(true)
    try {
      const { error } = await supabase.rpc('actualizar_mi_logo', { p_logo_url: '' })
      if (error) throw error
      await ctx?.refrescar?.()
    } catch (err) { alert(`No se pudo quitar el logo: ${err.message}`) } finally { setSubiendo(false) }
  }

  return (
    <div>
      <label style={{ ...label, marginTop: 0 }}>Tu logo (PNG, JPG o WEBP, máx. 1 MB)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {d?.logo_url && <img src={d.logo_url} alt="Tu logo" style={{ height: 48, maxWidth: 140, objectFit: 'contain', border: '1px solid #E2E8F0', borderRadius: 4, padding: 4, background: '#fff' }} />}
        <label style={{ ...btn(), fontSize: 12, opacity: subiendo ? 0.6 : 1 }}>
          {subiendo ? 'Subiendo…' : d?.logo_url ? 'Cambiar logo' : 'Subir logo'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={subiendo} style={{ display: 'none' }}
            onChange={e => { subirLogo(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {d?.logo_url && <button type="button" disabled={subiendo} onClick={quitarLogo} style={{ ...btn(), fontSize: 12 }}>Quitar</button>}
      </div>
      <label style={label}>Nombre de tu negocio *</label>
      <input style={input} value={f.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)} maxLength={120} />
      <label style={label}>Teléfono / WhatsApp</label>
      <input style={input} value={f.telefono} onChange={e => set('telefono', e.target.value)} maxLength={40} />
      <label style={label}>Dirección</label>
      <input style={input} value={f.direccion} onChange={e => set('direccion', e.target.value)} maxLength={300} />
      <label style={label}>Condiciones de venta (opcional; si lo dejas vacío salen los términos estándar de Brendell)</label>
      <textarea style={{ ...input, minHeight: 90, fontFamily: 'inherit' }} value={f.condiciones} onChange={e => set('condiciones', e.target.value)} maxLength={2000} />
      <button type="button" disabled={guardando} onClick={guardar} style={{ ...btn(true), marginTop: 16 }}>{guardando ? 'Guardando…' : 'Guardar mis datos'}</button>
      {aviso && <div role="status" style={{ fontSize: 12, color: '#15803D', marginTop: 8 }}>{aviso}</div>}
    </div>
  )
}
