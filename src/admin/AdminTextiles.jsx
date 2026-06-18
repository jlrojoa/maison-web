import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { nombre: '', categoria: '', color_hex: '', imagen_url: '', descripcion: '', activo: true, orden: 0 }

const TH = ({ children }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)', ...style }}>
    {children}
  </td>
)

export default function AdminTextiles() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = () => supabase.from('textiles').select('*').order('orden').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    const payload = { ...form, orden: parseInt(form.orden) || 0 }
    if (editing) {
      await supabase.from('textiles').update(payload).eq('id', editing)
    } else {
      await supabase.from('textiles').insert(payload)
    }
    setForm(EMPTY)
    setEditing(null)
    load()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este tejido?')) return
    await supabase.from('textiles').delete().eq('id', id)
    load()
  }

  const edit = (r) => {
    setEditing(r.id)
    setForm({ nombre: r.nombre ?? '', categoria: r.categoria ?? '', color_hex: r.color_hex ?? '', imagen_url: r.imagen_url ?? '', descripcion: r.descripcion ?? '', activo: r.activo ?? true, orden: r.orden ?? 0 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const Label = ({ children }) => (
    <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  )

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Tejidos</h1>

      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>
          {editing ? 'Editar tejido' : 'Nuevo tejido'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'nombre', label: 'Nombre *' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'color_hex', label: 'Color HEX (ej: #B8976A)' },
            { key: 'imagen_url', label: 'URL de imagen' },
          ].map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
            </div>
          ))}
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Descripción</Label>
            <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 80, resize: 'vertical' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div>
            <Label>Orden</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number" value={form.orden} onChange={e => set('orden', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input type="checkbox" id="activo-t" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            <label htmlFor="activo-t" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>Activo</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px' }} onClick={save}>
            {editing ? 'Guardar cambios' : 'Crear tejido'}
          </button>
          {editing && (
            <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => { setEditing(null); setForm(EMPTY) }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><TH>Nombre</TH><TH>Categoría</TH><TH>Color</TH><TH>Activo</TH><TH>Orden</TH><TH></TH></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>No hay tejidos aún</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <TD><strong style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>{r.nombre}</strong></TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.categoria ?? '—'}</TD>
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
