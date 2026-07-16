// src/admin/catalogo/AdminTelas.jsx
//
// "Categoría de tela" = telas.grado, un CHECK constraint fijo a AA/A/B/C en el schema
// real (no se puede agregar una 5ª categoría sin migración). Por eso esta pantalla no
// ofrece crear/eliminar categorías — solo muestra las 4 fijas con sus conteos reales.
// "Colección" = una fila de la tabla telas (ej. "Lino Belga"). "Color" = tela_colores.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS = ['AA', 'A', 'B', 'C']
const EMPTY_FORM = { nombre: '', descripcion: '' }

export default function AdminTelas() {
  const [telas, setTelas] = useState([])
  const [grado, setGrado] = useState('AA')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('telas')
      .select('*, colores:tela_colores(count)')
      .order('grado')
      .order('orden')
    setTelas(data ?? [])
  }

  useEffect(() => { load() }, [])

  const totales = GRADOS.map(g => {
    const enGrado = telas.filter(t => t.grado === g)
    const nColores = enGrado.reduce((sum, t) => sum + (t.colores?.[0]?.count ?? 0), 0)
    return { grado: g, colecciones: enGrado.length, colores: nColores }
  })
  const totalColecciones = totales.reduce((s, t) => s + t.colecciones, 0)
  const totalColores = totales.reduce((s, t) => s + t.colores, 0)

  const rows = telas.filter(t => t.grado === grado)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY_FORM); setEditingId(null) }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('telas').update({ nombre: form.nombre, descripcion: form.descripcion }).eq('id', editingId)
      } else {
        await supabase.from('telas').insert({ nombre: form.nombre, descripcion: form.descripcion, grado, activo: true })
      }
      reset()
      load()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (tela) => {
    setEditingId(tela.id)
    setForm({ nombre: tela.nombre ?? '', descripcion: tela.descripcion ?? '' })
  }

  const toggleActivo = async (tela) => {
    await supabase.from('telas').update({ activo: !tela.activo }).eq('id', tela.id)
    load()
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Telas y categorías</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Telas y categorías</b></div>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Categorías de telas</div>
              <div className="adm-card-sub">Fijas por diseño del catálogo (AA · A · B · C) — cada producto tiene un precio distinto por categoría.</div>
            </div>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th>Categoría</th><th>Colecciones</th><th>Colores</th></tr>
            </thead>
            <tbody>
              {totales.map(t => (
                <tr key={t.grado} style={{ cursor: 'pointer' }} onClick={() => setGrado(t.grado)}>
                  <td>
                    <span className="grado-pill" style={{ marginRight: 8 }}>{t.grado}</span>
                    Categoría {t.grado}
                  </td>
                  <td>{t.colecciones}</td>
                  <td>{t.colores}</td>
                </tr>
              ))}
              <tr className="adm-total-row"><td>Total</td><td>{totalColecciones}</td><td>{totalColores}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="adm-grid-2">
          <div>
            <div className="adm-card">
              <div className="adm-card-title" style={{ marginBottom: 4 }}>{editingId ? 'Editar colección' : 'Nueva colección'}</div>
              <div className="adm-card-sub">Categoría: <b style={{ color: '#111827' }}>{grado}</b></div>
              <div className="adm-field">
                <label className="adm-label">Nombre</label>
                <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Lino Belga" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Descripción</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar colección'}
                </button>
                {editingId && <button type="button" className="adm-btn" onClick={reset}>Cancelar</button>}
              </div>
            </div>
          </div>

          <div>
            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title">Colecciones · Categoría {grado}</div>
              </div>
              <table className="adm-table">
                <thead><tr><th>Nombre</th><th># Colores</th><th>Activa</th><th></th></tr></thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={4} className="adm-empty-note">No hay colecciones en esta categoría</td></tr>
                  ) : rows.map(t => (
                    <tr key={t.id}>
                      <td>{t.nombre}</td>
                      <td>{t.colores?.[0]?.count ?? 0}</td>
                      <td>{t.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                      <td className="adm-cell-actions">
                        <button type="button" className="adm-icon-btn" onClick={() => startEdit(t)}>✎</button>
                        <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(t)}>{t.activo ? '⏸' : '▶'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="adm-form-hint" style={{ marginTop: 10 }}>Para administrar los colores de una colección, ve a la sección Colores.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
