// src/admin/catalogo/MedidaModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadProductoImage } from './ProductoImageUpload'

export default function MedidaModal({ open, producto, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [dimensiones, setDimensiones] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => { setNombre(''); setDimensiones(''); setFile(null) }
  const close = () => { reset(); onClose() }

  const create = async () => {
    if (!nombre.trim()) return alert('La etiqueta es obligatoria.')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('producto_configuraciones').insert({
        producto_id: producto.id,
        nombre,
        dimensiones,
        activo: true,
        orden: 999,
      }).select().single()
      if (error) throw error

      if (file) {
        const ext = file.name.split('.').pop().toLowerCase()
        const url = await uploadProductoImage(file, `productos/${producto.id}/medida-${data.id}.${ext}`)
        const { error: updErr } = await supabase.from('producto_configuraciones').update({ isometrico_url: url }).eq('id', data.id)
        if (updErr) throw updErr
      }

      reset()
      onCreated()
    } catch (err) {
      alert(`Error al crear medida: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-modal-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="adm-modal-box">
        <div className="adm-modal-header">
          <div className="adm-modal-title">Nueva medida</div>
          <button type="button" className="adm-drawer-close" onClick={close}>✕</button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-empty-note" style={{ marginBottom: 14, padding: 0 }}>Para: <b style={{ color: '#111827' }}>{producto.nombre}</b></div>
          <div className="adm-field">
            <label className="adm-label">Etiqueta</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. 220cm" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Dimensiones</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. 220 × 95 × 85 cm" value={dimensiones} onChange={e => setDimensiones(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Imagen isométrica</label>
            <div className="adm-img-drop" onClick={() => document.getElementById('medida-file-input').click()}>
              {file ? file.name : '+ Subir imagen'}
            </div>
            <input id="medida-file-input" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0] ?? null)} />
            <div className="adm-form-hint">Puedes subirla después — mientras tanto se muestra un placeholder en el configurador.</div>
          </div>
          <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 14, marginBottom: 0, padding: '12px 14px' }}>
            <div className="adm-form-hint" style={{ color: '#6B7280' }}>💲 Después de crearla, ve a la pestaña <b>Precios</b> para capturar su valor en los 4 grados de tela.</div>
          </div>
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn" onClick={close}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-dark" onClick={create} disabled={saving}>
            {saving ? 'Creando…' : 'Crear medida'}
          </button>
        </div>
      </div>
    </div>
  )
}
