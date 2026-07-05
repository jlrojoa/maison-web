import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { email: '', nombre: '', empresa: '', telefono: '', activo: true }

const TH = ({ children }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
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

export default function AdminDistribuidores() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('distribuidores')
      .select('*')
      .order('created_at', { ascending: false })
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm(EMPTY); setEditing(null) }

  const save = async () => {
    if (!form.email.trim()) return alert('El correo es obligatorio.')
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('distribuidores').update(form).eq('id', editing)
      } else {
        await supabase.from('distribuidores').insert(form)
      }
      reset()
      load()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (r) => {
    await supabase.from('distribuidores').update({ activo: !r.activo }).eq('id', r.id)
    load()
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este distribuidor?')) return
    await supabase.from('distribuidores').delete().eq('id', id)
    load()
  }

  const edit = (r) => {
    setEditing(r.id)
    setForm({
      email: r.email ?? '',
      nombre: r.nombre ?? '',
      empresa: r.empresa ?? '',
      telefono: r.telefono ?? '',
      activo: r.activo ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Distribuidores</h1>

      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>
          {editing ? 'Editar distribuidor' : 'Nuevo distribuidor'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Correo electrónico *</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="email"
              value={form.email} onChange={e => set('email', e.target.value)}
              disabled={!!editing} />
          </div>
          <div>
            <Label>Nombre</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <Label>Empresa</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.empresa} onChange={e => set('empresa', e.target.value)} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }}
              value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
            <input type="checkbox" id="dist-activo" checked={form.activo}
              onChange={e => set('activo', e.target.checked)} />
            <label htmlFor="dist-activo" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>
              Activo — puede iniciar sesión y ver precios
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px', opacity: saving ? .6 : 1 }}
            onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear distribuidor'}
          </button>
          {editing && (
            <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Email</TH>
              <TH>Nombre</TH>
              <TH>Empresa</TH>
              <TH>Teléfono</TH>
              <TH>Estado</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>
                  No hay distribuidores aún
                </td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <TD style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>{r.email}</TD>
                <TD>{r.nombre ?? '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.empresa ?? '—'}</TD>
                <TD style={{ color: 'var(--taupe)' }}>{r.telefono ?? '—'}</TD>
                <TD>
                  <button
                    onClick={() => toggleActivo(r)}
                    style={{
                      background: r.activo ? 'var(--gold)' : 'var(--sand)',
                      border: 'none',
                      color: r.activo ? '#fff' : 'var(--taupe)',
                      fontSize: 10,
                      letterSpacing: '.1em',
                      padding: '4px 12px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {r.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="la" onClick={() => edit(r)}>Editar</button>
                    <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }}
                      onClick={() => del(r.id)}>Eliminar</button>
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
