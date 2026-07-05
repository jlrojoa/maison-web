import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { nombre: '', categoria: '', grado: 'A', color_hex: '', imagen_url: '', descripcion: '', activo: true, orden: 0 }

const TH = ({ children }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)', verticalAlign: 'middle', ...style }}>
    {children}
  </td>
)
const Label = ({ children }) => (
  <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
    {children}
  </label>
)

export default function AdminTextiles() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const load = () => supabase.from('textiles').select('*').order('orden').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImageSelect = (files) => {
    const file = files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    set('imagen_url', '')
  }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      let imagen_url = form.imagen_url

      if (imageFile) {
        const ext = imageFile.name.split('.').pop().toLowerCase()
        const path = `textiles/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('maison').upload(path, imageFile, { upsert: true })
        if (!upErr) {
          const { data } = supabase.storage.from('maison').getPublicUrl(path)
          imagen_url = data.publicUrl
        }
      }

      const payload = { ...form, imagen_url, orden: parseInt(form.orden) || 0 }

      if (editing) {
        await supabase.from('textiles').update(payload).eq('id', editing)
      } else {
        await supabase.from('textiles').insert(payload)
      }

      setForm(EMPTY)
      setEditing(null)
      setImageFile(null)
      setImagePreview(null)
      load()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este tejido?')) return
    await supabase.from('textiles').delete().eq('id', id)
    load()
  }

  const edit = (r) => {
    setEditing(r.id)
    setForm({ nombre: r.nombre ?? '', categoria: r.categoria ?? '', grado: r.grado ?? 'A', color_hex: r.color_hex ?? '', imagen_url: r.imagen_url ?? '', descripcion: r.descripcion ?? '', activo: r.activo ?? true, orden: r.orden ?? 0 })
    setImageFile(null)
    setImagePreview(r.imagen_url ?? null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleImageSelect(e.dataTransfer.files)
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Tejidos</h1>

      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>
          {editing ? 'Editar tejido' : 'Nuevo tejido'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Nombre *</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.categoria} onChange={e => set('categoria', e.target.value)} />
          </div>
          <div>
            <Label>Grado de tela</Label>
            <select className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.grado} onChange={e => set('grado', e.target.value)}>
              <option value="AA">AA — Premium</option>
              <option value="A">A — Alto</option>
              <option value="B">B — Estándar</option>
              <option value="C">C — Económico</option>
            </select>
          </div>
          <div>
            <Label>Color HEX</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="so" style={{ flex: 1, padding: '10px 14px' }} placeholder="#B8976A" value={form.color_hex} onChange={e => set('color_hex', e.target.value)} />
              {form.color_hex && (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: form.color_hex, border: '1px solid var(--sand)', flexShrink: 0 }} />
              )}
            </div>
          </div>
          <div>
            <Label>Orden</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number" value={form.orden} onChange={e => set('orden', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Descripción</Label>
            <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 80, resize: 'vertical' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Imagen</Label>
            {imagePreview ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <img src={imagePreview} alt="preview" style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid var(--sand)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <button className="la" onClick={() => inputRef.current.click()}>Cambiar imagen</button>
                  <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }} onClick={clearImage}>Quitar imagen</button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--sand)'}`,
                  padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                  background: dragging ? 'rgba(184,151,106,.06)' : 'transparent',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--taupe)', letterSpacing: '.15em' }}>
                  {dragging ? 'SOLTAR AQUÍ' : 'ARRASTRA UNA IMAGEN O HAZ CLIC PARA SELECCIONAR'}
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { handleImageSelect(e.target.files); e.target.value = '' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="activo-t" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            <label htmlFor="activo-t" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>Activo</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px', opacity: saving ? .6 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear tejido'}
          </button>
          {editing && (
            <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => { setEditing(null); setForm(EMPTY); setImageFile(null); setImagePreview(null) }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><TH>Imagen</TH><TH>Nombre</TH><TH>Categoría</TH><TH>Grado</TH><TH>Color</TH><TH>Activo</TH><TH>Orden</TH><TH></TH></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>No hay tejidos aún</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <TD>
                  {r.imagen_url
                    ? <img src={r.imagen_url} alt={r.nombre} style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }} />
                    : r.color_hex
                      ? <div style={{ width: 48, height: 48, background: r.color_hex, border: '1px solid var(--sand)' }} />
                      : <div style={{ width: 48, height: 48, background: 'var(--sand)' }} />
                  }
                </TD>
                <TD><strong style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>{r.nombre}</strong></TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.categoria ?? '—'}</TD>
                <TD style={{ color: 'var(--taupe)', fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.1em' }}>{r.grado ?? '—'}</TD>
                <TD>
                  {r.color_hex
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: r.color_hex, border: '1px solid var(--sand)', display: 'inline-block' }} />
                        {r.color_hex}
                      </span>
                    : '—'}
                </TD>
                <TD>{r.activo ? '✓' : '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.orden}</TD>
                <TD>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="la" onClick={() => edit(r)}>Editar</button>
                    <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }} onClick={() => del(r.id)}>Eliminar</button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
