// src/admin/AdminCatalogos.jsx
//
// Catálogos, listas de precios, avisos e imágenes para descarga de distribuidores.
// Bucket privado 'catalogos' + tabla public.catalogos (RLS: es_distribuidor_activo()
// OR es_admin() para leer, es_admin() para escribir — ver Bloque 2). El admin ve
// todos los recursos (activos e inactivos); el distribuidor solo ve los activos
// desde /mi-espacio/descargas.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadCatalogoFile, getCatalogoSignedUrl, deleteCatalogoFile, TIPO_LABELS } from '../lib/catalogos'

const TIPOS = Object.keys(TIPO_LABELS)
const MAX_MB = 20

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function fmtBytes(n) {
  if (!n) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminCatalogos() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', tipo: 'catalogo' })
  const [file, setFile] = useState(null)
  const fileInputRef = useRef()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('catalogos').select('*').order('orden').order('created_at')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onFileChange = (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) return alert(`El archivo pesa más de ${MAX_MB}MB.`)
    setFile(f)
    if (!form.titulo.trim()) setForm(prev => ({ ...prev, titulo: f.name.replace(/\.[^.]+$/, '') }))
  }

  const crear = async () => {
    if (!form.titulo.trim()) return alert('El título es obligatorio.')
    if (!file) return alert('Selecciona un archivo.')
    setUploading(true)
    try {
      const { data: fila, error: insErr } = await supabase.from('catalogos').insert({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        tipo: form.tipo,
        storage_path: 'pending',
        orden: rows.length,
      }).select().single()
      if (insErr) throw insErr

      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${fila.id}.${ext}`
      await uploadCatalogoFile(file, path)

      const { error: updErr } = await supabase.from('catalogos')
        .update({ storage_path: path, nombre_archivo: file.name, tamano_bytes: file.size })
        .eq('id', fila.id)
      if (updErr) throw updErr

      setForm({ titulo: '', descripcion: '', tipo: 'catalogo' })
      setFile(null)
      await load()
    } catch (err) {
      alert(`Error al subir: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const updateField = async (id, field, value) => {
    await supabase.from('catalogos').update({ [field]: value }).eq('id', id)
    load()
  }

  const toggleActivo = async (r) => {
    await supabase.from('catalogos').update({ activo: !r.activo }).eq('id', r.id)
    load()
  }

  const previsualizar = async (r) => {
    try {
      const url = await getCatalogoSignedUrl(r.storage_path)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      alert(`No se pudo generar el enlace: ${err.message}`)
    }
  }

  const eliminar = async (r) => {
    if (!confirm(`¿Eliminar "${r.titulo}"? También se borra el archivo del storage.`)) return
    try {
      if (r.storage_path && r.storage_path !== 'pending') await deleteCatalogoFile(r.storage_path)
      await supabase.from('catalogos').delete().eq('id', r.id)
      load()
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
    }
  }

  return (
    <div className="adm-content">
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Descargas para distribuidores</h1>

      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <div className="adm-card-title">Nuevo recurso</div>
            <div className="adm-card-sub">PDF o imagen, máx {MAX_MB}MB. Solo lo ven distribuidores con sesión activa.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="adm-field">
            <label className="adm-label">Título</label>
            <input className="adm-input" style={{ width: '100%' }} value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Tipo</label>
            <select className="adm-select" style={{ width: '100%' }} value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-field" style={{ marginBottom: 14 }}>
          <label className="adm-label">Descripción (opcional)</label>
          <input className="adm-input" style={{ width: '100%' }} value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
        </div>
        <div className="adm-field" style={{ marginBottom: 14 }}>
          <label className="adm-label">Archivo</label>
          <div className="adm-img-drop" onClick={() => fileInputRef.current.click()}>
            {file ? `${file.name} (${fmtBytes(file.size)})` : '+ Elegir archivo'}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp"
            style={{ display: 'none' }} onChange={onFileChange} />
        </div>
        <button type="button" className="adm-btn adm-btn-dark" onClick={crear} disabled={uploading}>
          {uploading ? 'Subiendo…' : 'Subir recurso'}
        </button>
      </div>

      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Todos los recursos</div></div>
        {loading ? (
          <div className="adm-empty-note">Cargando…</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr><th>Orden</th><th>Título</th><th>Tipo</th><th>Archivo</th><th>Activo</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="adm-empty-note">No hay recursos aún</td></tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <input className="adm-input" style={{ width: 56 }} type="number" defaultValue={r.orden}
                      onBlur={e => { const v = parseInt(e.target.value, 10); if (v !== r.orden && !isNaN(v)) updateField(r.id, 'orden', v) }} />
                  </td>
                  <td>
                    <input className="adm-input" defaultValue={r.titulo}
                      onBlur={e => { if (e.target.value !== r.titulo) updateField(r.id, 'titulo', e.target.value) }} />
                  </td>
                  <td>
                    <select className="adm-select" defaultValue={r.tipo}
                      onChange={e => updateField(r.id, 'tipo', e.target.value)}>
                      {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: '#6B7280' }}>
                    {r.storage_path === 'pending' ? '⚠ subiendo…' : (
                      <button type="button" className="adm-btn-sm" onClick={() => previsualizar(r)}>
                        {r.nombre_archivo ?? 'ver'} · {fmtBytes(r.tamano_bytes)}
                      </button>
                    )}
                  </td>
                  <td>
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(r)}>
                      {r.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}
                    </button>
                  </td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => eliminar(r)}><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
