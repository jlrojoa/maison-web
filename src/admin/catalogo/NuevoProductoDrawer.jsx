// src/admin/catalogo/NuevoProductoDrawer.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function NuevoProductoDrawer({ open, categorias, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [activo, setActivo] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => { setNombre(''); setCategoriaId(''); setDescripcion(''); setActivo(false) }
  const close = () => { reset(); onClose() }

  const create = async () => {
    if (!nombre.trim()) return alert('El nombre es obligatorio.')
    if (!categoriaId) return alert('Selecciona un tipo (categoría).')
    setSaving(true)
    try {
      // Orden por defecto = al final de la lista, no 0. Con 0 fijo, cada producto
      // nuevo empataba con los demás en "orden" y el orden final dependía de un
      // desempate arbitrario — confuso para saber por qué algo aparecía antes o después.
      const { data: maxRow } = await supabase.from('productos').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle()
      const siguienteOrden = (maxRow?.orden ?? -1) + 1

      const { data, error } = await supabase.from('productos').insert({
        nombre,
        slug: slugify(nombre),
        categoria_id: categoriaId,
        descripcion,
        activo,
        orden: siguienteOrden,
      }).select().single()
      if (error) throw error
      reset()
      onCreated(data)
    } catch (err) {
      alert(`Error al crear: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-drawer-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="adm-drawer">
        <div className="adm-drawer-header">
          <div className="adm-drawer-title">Nuevo producto</div>
          <button type="button" className="adm-drawer-close" onClick={close}>✕</button>
        </div>
        <div className="adm-drawer-body">
          <div className="adm-step-track">
            <div className="adm-step-dot adm-done"></div>
            <div className="adm-step-dot"></div>
            <div className="adm-step-dot"></div>
          </div>
          <div className="adm-empty-note" style={{ marginBottom: 16 }}>Paso 1 de 3 — Datos básicos</div>

          <div className="adm-field">
            <label className="adm-label">Nombre del modelo</label>
            <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Cubo" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          <div className="adm-field">
            <label className="adm-label">Tipo (categoría)</label>
            <select className="adm-select" style={{ width: '100%' }} value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Selecciona un tipo...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <div className="adm-form-hint">Si el modelo ya existe en otro tipo (ej. Cubo en Sofás), se crea como registro independiente — puede tener medidas y precios distintos.</div>
          </div>

          <div className="adm-field">
            <label className="adm-label">Descripción</label>
            <textarea className="adm-textarea" placeholder="Breve descripción del modelo..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>

          <div className="adm-toggle-row">
            <div>
              <div className="adm-toggle-label">Producto activo</div>
              <div className="adm-toggle-desc">Puedes dejarlo apagado mientras terminas de cargar medidas, precios e imágenes</div>
            </div>
            <button type="button" className={`adm-switch ${activo ? '' : 'adm-off'}`} onClick={() => setActivo(a => !a)} />
          </div>

          <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 16, marginBottom: 0 }}>
            <div className="adm-form-hint" style={{ color: '#6B7280' }}>
              📋 <b>Después de crear</b> podrás agregar sus medidas, precios por grado, imágenes y (si aplica) orientaciones — todo desde sus pestañas correspondientes.
            </div>
          </div>
        </div>
        <div className="adm-drawer-footer">
          <button type="button" className="adm-btn" onClick={close}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn-dark" onClick={create} disabled={saving}>
            {saving ? 'Creando…' : 'Crear y continuar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
