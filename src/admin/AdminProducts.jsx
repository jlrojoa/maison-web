import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { nombre: '', slug: '', subtitulo: '', descripcion: '', precio_desde: '', badge: '', categoria_id: '', activo: true, orden: 0 }

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TH = ({ children }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
    {children}
  </th>
)
const TD = ({ children, style }) => (
  <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)', ...style }}>
    {children}
  </td>
)

export default function AdminProducts() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*, categoria:categorias(id,nombre)').order('orden'),
      supabase.from('categorias').select('*').order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    const payload = {
      ...form,
      precio_desde: form.precio_desde !== '' ? parseFloat(form.precio_desde) : null,
      orden: parseInt(form.orden) || 0,
      slug: form.slug || slugify(form.nombre),
      categoria_id: form.categoria_id || null,
    }
    if (editing) {
      await supabase.from('productos').update(payload).eq('id', editing)
    } else {
      await supabase.from('productos').insert(payload)
    }
    setForm(EMPTY)
    setEditing(null)
    load()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    load()
  }

  const edit = (p) => {
    setEditing(p.id)
    setForm({
      nombre: p.nombre ?? '',
      slug: p.slug ?? '',
      subtitulo: p.subtitulo ?? '',
      descripcion: p.descripcion ?? '',
      precio_desde: p.precio_desde != null ? String(p.precio_desde) : '',
      badge: p.badge ?? '',
      categoria_id: p.categoria_id ?? '',
      activo: p.activo ?? true,
      orden: p.orden ?? 0,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const Label = ({ children }) => (
    <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  )

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Productos</h1>

      {/* Form */}
      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>
          {editing ? 'Editar producto' : 'Nuevo producto'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Nombre *</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.nombre}
              onChange={e => { set('nombre', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }} />
          </div>
          <div>
            <Label>Slug</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.slug} onChange={e => set('slug', e.target.value)} />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.subtitulo} onChange={e => set('subtitulo', e.target.value)} />
          </div>
          <div>
            <Label>Precio desde (€)</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number" value={form.precio_desde} onChange={e => set('precio_desde', e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
            <select className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <Label>Badge</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} placeholder="Nuevo, Ed. Limitada…" value={form.badge} onChange={e => set('badge', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Descripción</Label>
            <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 90, resize: 'vertical' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>
          <div>
            <Label>Orden</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number" value={form.orden} onChange={e => set('orden', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input type="checkbox" id="activo" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            <label htmlFor="activo" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>Activo (visible en el sitio)</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px' }} onClick={save}>
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {editing && (
            <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => { setEditing(null); setForm(EMPTY) }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><TH>Nombre</TH><TH>Categoría</TH><TH>Precio</TH><TH>Badge</TH><TH>Activo</TH><TH>Orden</TH><TH></TH></tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><TD style={{ color: 'var(--taupe)', textAlign: 'center' }} colSpan={7}>No hay productos aún</TD></tr>
            ) : productos.map(p => (
              <tr key={p.id}>
                <TD><strong style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>{p.nombre}</strong><br /><span style={{ fontSize: 11, color: 'var(--taupe)' }}>{p.subtitulo}</span></TD>
                <TD style={{ color: 'var(--taupe)' }}>{p.categoria?.nombre ?? '—'}</TD>
                <TD>{p.precio_desde != null ? `€${p.precio_desde}` : '—'}</TD>
                <TD style={{ color: 'var(--gold)' }}>{p.badge ?? '—'}</TD>
                <TD>{p.activo ? '✓' : '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{p.orden}</TD>
                <TD>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="la" onClick={() => edit(p)}>Editar</button>
                    <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }} onClick={() => del(p.id)}>Eliminar</button>
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
