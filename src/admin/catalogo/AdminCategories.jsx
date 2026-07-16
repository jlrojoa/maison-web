import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY = { nombre: '', slug: '', orden: 0 }

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminCategories() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('categorias').select('*').order('orden')
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setEditing(null) }

  const openNew = () => { reset(); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row.id)
    setForm({ nombre: row.nombre ?? '', slug: row.slug ?? '', orden: row.orden ?? 0 })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); reset() }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        slug: form.slug || slugify(form.nombre),
        orden: parseInt(form.orden) || 0,
      }
      if (editing) {
        await supabase.from('categorias').update(payload).eq('id', editing)
      } else {
        await supabase.from('categorias').insert({ ...payload, activo: true })
      }
      closeModal()
      load()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (row) => {
    await supabase.from('categorias').update({ activo: !row.activo }).eq('id', row.id)
    load()
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Categorías</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Categorías</b></div>
        </div>
        <div className="adm-topbar-actions">
          <button type="button" className="adm-btn adm-btn-dark" onClick={openNew}>+ Nueva categoría</button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Todas las categorías</div>
              <div className="adm-card-sub">Tipos de producto que ve el cliente en el configurador (Sofás, Camas, Escuadras…).</div>
            </div>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Orden</th><th>Nombre</th><th>Slug</th><th>Activa</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="adm-empty-note">No hay categorías aún</td></tr>
              ) : rows.map(row => (
                <tr key={row.id}>
                  <td className="adm-drag">⠿</td>
                  <td>{row.orden}</td>
                  <td>{row.nombre}</td>
                  <td style={{ color: '#9CA3AF' }}>{row.slug}</td>
                  <td>{row.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸ inactiva</span>}</td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => openEdit(row)}>✎</button>
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(row)}>{row.activo ? '⏸' : '▶'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`adm-modal-overlay ${modalOpen ? 'adm-open' : ''}`} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
        {modalOpen && (
          <div className="adm-modal-box">
            <div className="adm-modal-header">
              <div className="adm-modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</div>
              <button type="button" className="adm-drawer-close" onClick={closeModal}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-label">Nombre</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.nombre}
                  onChange={e => { set('nombre', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Slug</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.slug}
                  onChange={e => set('slug', e.target.value)} />
                <div className="adm-form-hint">Se genera automático del nombre; puedes editarlo.</div>
              </div>
              <div className="adm-field">
                <label className="adm-label">Orden de aparición</label>
                <input className="adm-input" type="number" style={{ width: '100%' }} value={form.orden}
                  onChange={e => set('orden', e.target.value)} />
              </div>
              {!editing && (
                <div className="adm-card" style={{ background: '#F9FAFB', marginTop: 14, marginBottom: 0, padding: '12px 14px' }}>
                  <div className="adm-form-hint" style={{ color: '#6B7280' }}>
                    ⚠️ Una categoría nueva afecta la matriz de precios de los productos que se le asignen.
                  </div>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={closeModal}>Cancelar</button>
              <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
