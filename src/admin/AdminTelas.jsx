import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const GRADOS = ['AA', 'A', 'B', 'C']
const EMPTY_FORM = { nombre: '', grado: 'AA', descripcion: '' }

const GRADO_STYLE = {
  AA: { background: 'var(--gold)', color: 'var(--ink)' },
  A:  { background: 'var(--charcoal)', color: '#fff' },
  B:  { background: 'var(--stone)', color: '#fff' },
  C:  { background: 'var(--sand)', color: 'var(--charcoal)' },
}

const Label = ({ children }) => (
  <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
    {children}
  </label>
)

const SectionHeader = ({ children, style: overrideStyle }) => (
  <div style={{
    fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase',
    color: 'var(--charcoal)', borderBottom: '1px solid var(--sand)',
    paddingBottom: 10, marginBottom: 18, marginTop: 32,
    ...overrideStyle,
  }}>
    {children}
  </div>
)

const GradoBadge = ({ grado }) => (
  <span style={{
    ...GRADO_STYLE[grado],
    fontSize: 9, letterSpacing: '.15em', padding: '2px 7px',
    display: 'inline-block', textTransform: 'uppercase', fontFamily: 'var(--sans)',
  }}>
    {grado}
  </span>
)

function ColorCard({ color, onNombreBlur, onToggleActivo, onDelete }) {
  const [nombre, setNombre] = useState(color.nombre ?? '')

  useEffect(() => { setNombre(color.nombre ?? '') }, [color.nombre])

  return (
    <div style={{ width: 96 }}>
      {color.imagen_url ? (
        <img
          src={color.imagen_url}
          alt={nombre}
          style={{ width: 96, height: 96, objectFit: 'cover', display: 'block', border: '1px solid var(--sand)' }}
        />
      ) : (
        <div style={{ width: 96, height: 96, background: 'var(--sand)', border: '1px solid var(--sand)' }} />
      )}
      <input
        className="so"
        style={{ width: '100%', padding: '5px 7px', fontSize: 11, marginTop: 6, boxSizing: 'border-box' }}
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        onBlur={() => { if (nombre !== color.nombre) onNombreBlur(color.id, nombre) }}
        placeholder="Nombre"
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={color.activo ?? true}
            onChange={() => onToggleActivo(color)}
          />
          <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--taupe)', textTransform: 'uppercase' }}>
            activo
          </span>
        </label>
        <button
          onClick={() => onDelete(color.id)}
          title="Eliminar color"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#c0392b', fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function AdminTelas() {
  const [selectedFamilia, setSelectedFamilia] = useState(null)
  const [familias, setFamilias] = useState([])
  const [colores, setColores] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [savingFamilia, setSavingFamilia] = useState(false)
  const [pendingColors, setPendingColors] = useState([])
  const [uploadingColors, setUploadingColors] = useState(false)
  const [dragging, setDragging] = useState(false)
  const colorInputRef = useRef()

  const selectedId = selectedFamilia?.id ?? null

  const loadFamilias = async () => {
    try {
      const { data } = await supabase
        .from('telas')
        .select('*, colores:tela_colores(count)')
        .order('grado')
        .order('orden')
      setFamilias(data ?? [])
    } catch {}
  }

  const loadColores = async (telaId) => {
    try {
      const { data } = await supabase
        .from('tela_colores')
        .select('*')
        .eq('tela_id', telaId)
        .order('orden')
      setColores(data ?? [])
    } catch {}
  }

  useEffect(() => { loadFamilias() }, [])

  useEffect(() => {
    if (selectedId) {
      loadColores(selectedId)
    } else {
      setColores([])
      setPendingColors([])
    }
  }, [selectedId])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveFamilia = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSavingFamilia(true)
    try {
      if (editingId) {
        await supabase.from('telas')
          .update({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion })
          .eq('id', editingId)
      } else {
        await supabase.from('telas')
          .insert({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion })
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      await loadFamilias()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSavingFamilia(false)
    }
  }

  const deleteFamilia = async (id) => {
    if (!confirm('¿Eliminar esta familia? Se eliminarán también todos sus colores.')) return
    try {
      await supabase.from('telas').delete().eq('id', id)
      if (selectedFamilia?.id === id) setSelectedFamilia(null)
      await loadFamilias()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    }
  }

  const toggleActivo = async (familia) => {
    try {
      await supabase.from('telas').update({ activo: !familia.activo }).eq('id', familia.id)
      if (selectedFamilia?.id === familia.id) {
        setSelectedFamilia(prev => ({ ...prev, activo: !prev.activo }))
      }
      await loadFamilias()
    } catch {}
  }

  const startEdit = (familia) => {
    setEditingId(familia.id)
    setForm({
      nombre: familia.nombre ?? '',
      grado: familia.grado ?? 'AA',
      descripcion: familia.descripcion ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const addColorFiles = (files) => {
    const items = Array.from(files).map(file => ({
      localId: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      nombre: file.name.replace(/\.[^.]+$/, ''),
    }))
    setPendingColors(prev => [...prev, ...items])
  }

  const removePending = (localId) => {
    setPendingColors(prev => {
      const item = prev.find(p => p.localId === localId)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(p => p.localId !== localId)
    })
  }

  const updatePendingNombre = (localId, nombre) => {
    setPendingColors(prev => prev.map(p => p.localId === localId ? { ...p, nombre } : p))
  }

  const uploadColors = async () => {
    if (!selectedFamilia || pendingColors.length === 0) return
    setUploadingColors(true)
    try {
      const existingCount = colores.length
      for (let i = 0; i < pendingColors.length; i++) {
        const pc = pendingColors[i]
        const ext = pc.file.name.split('.').pop().toLowerCase()
        const path = `telas/${selectedFamilia.id}/${Date.now()}-${i}.${ext}`
        const { error } = await supabase.storage.from('telas').upload(path, pc.file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('telas').getPublicUrl(path)
          await supabase.from('tela_colores').insert({
            tela_id: selectedFamilia.id,
            nombre: pc.nombre,
            imagen_url: urlData.publicUrl,
            orden: existingCount + i,
          })
        }
      }
      pendingColors.forEach(pc => URL.revokeObjectURL(pc.previewUrl))
      setPendingColors([])
      await loadColores(selectedFamilia.id)
      await loadFamilias()
    } catch (err) {
      alert(`Error al subir colores: ${err.message}`)
    } finally {
      setUploadingColors(false)
    }
  }

  const updateColorNombre = async (id, nombre) => {
    try {
      await supabase.from('tela_colores').update({ nombre }).eq('id', id)
      if (selectedFamilia) await loadColores(selectedFamilia.id)
    } catch {}
  }

  const toggleColorActivo = async (color) => {
    try {
      await supabase.from('tela_colores').update({ activo: !color.activo }).eq('id', color.id)
      if (selectedFamilia) await loadColores(selectedFamilia.id)
    } catch {}
  }

  const deleteColor = async (id) => {
    if (!confirm('¿Eliminar este color?')) return
    try {
      await supabase.from('tela_colores').delete().eq('id', id)
      if (selectedFamilia) {
        await loadColores(selectedFamilia.id)
        await loadFamilias()
      }
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    }
  }

  const onDropColors = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addColorFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>
        Telas & Familias
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 32, alignItems: 'flex-start' }}>

        {/* ── LEFT PANEL ── */}
        <div>
          {/* Add / Edit family form */}
          <div style={{ background: '#fff', padding: 20, border: '1px solid var(--sand)' }}>
            <SectionHeader style={{ marginTop: 0 }}>
              {editingId ? 'Editar familia' : 'Nueva familia'}
            </SectionHeader>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>Nombre *</Label>
                <input
                  className="so"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }}
                  value={form.nombre}
                  onChange={e => setF('nombre', e.target.value)}
                  placeholder="ej. Lino Belga"
                />
              </div>
              <div>
                <Label>Grado</Label>
                <select
                  className="so"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }}
                  value={form.grado}
                  onChange={e => setF('grado', e.target.value)}
                >
                  <option value="AA">AA — Premium</option>
                  <option value="A">A — Alto</option>
                  <option value="B">B — Estándar</option>
                  <option value="C">C — Económico</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Descripción</Label>
                <input
                  className="so"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }}
                  value={form.descripcion}
                  onChange={e => setF('descripcion', e.target.value)}
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="bcot"
                style={{ width: 'auto', padding: '10px 22px', opacity: savingFamilia ? 0.6 : 1 }}
                onClick={saveFamilia}
                disabled={savingFamilia}
              >
                {savingFamilia ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar familia'}
              </button>
              {editingId && (
                <button
                  className="bkit"
                  style={{ width: 'auto', padding: '10px 22px' }}
                  onClick={cancelEdit}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Family list grouped by grado */}
          {GRADOS.map(grado => {
            const grupo = familias.filter(f => f.grado === grado)
            if (grupo.length === 0) return null
            return (
              <div key={grado}>
                <SectionHeader>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <GradoBadge grado={grado} />
                    Grado {grado}
                  </span>
                </SectionHeader>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grupo.map(familia => {
                    const colorCount = familia.colores?.[0]?.count ?? 0
                    const isSelected = selectedFamilia?.id === familia.id
                    return (
                      <div
                        key={familia.id}
                        style={{
                          background: '#fff',
                          padding: '14px 16px',
                          border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--sand)'}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        {/* Left: badge + name + count + description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <GradoBadge grado={familia.grado} />
                            <strong style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 15, color: 'var(--ink)' }}>
                              {familia.nombre}
                            </strong>
                            <span style={{ fontSize: 11, color: 'var(--taupe)' }}>
                              {colorCount} {colorCount === 1 ? 'color' : 'colores'}
                            </span>
                          </div>
                          {familia.descripcion && (
                            <div style={{ fontSize: 11, color: 'var(--taupe)' }}>
                              {familia.descripcion}
                            </div>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                          <button
                            className="la"
                            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedFamilia(isSelected ? null : familia)}
                          >
                            {isSelected ? 'Cerrar' : 'Ver colores'}
                          </button>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={familia.activo ?? true}
                              onChange={() => toggleActivo(familia)}
                            />
                            <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--taupe)', textTransform: 'uppercase' }}>
                              activo
                            </span>
                          </label>

                          <button
                            className="la"
                            style={{ fontSize: 11 }}
                            onClick={() => startEdit(familia)}
                          >
                            Editar
                          </button>

                          <button
                            className="la"
                            style={{ fontSize: 11, borderColor: '#c0392b', color: '#c0392b' }}
                            onClick={() => deleteFamilia(familia.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {familias.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--taupe)', fontSize: 12, letterSpacing: '.15em' }}>
              No hay familias aún
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div>
          {!selectedFamilia ? (
            <div style={{
              background: '#fff',
              border: '1px solid var(--sand)',
              padding: 60,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--taupe)', letterSpacing: '.2em', textTransform: 'uppercase' }}>
                Selecciona una familia para gestionar sus colores
              </div>
            </div>
          ) : (
            <div>
              {/* Color manager header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20, flexWrap: 'wrap', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 24, color: 'var(--ink)' }}>
                    Colores · {selectedFamilia.nombre}
                  </span>
                  <GradoBadge grado={selectedFamilia.grado} />
                </div>
                <button
                  className="bkit"
                  style={{ width: 'auto', padding: '8px 18px', fontSize: 12 }}
                  onClick={() => { setSelectedFamilia(null); setPendingColors([]) }}
                >
                  ← Volver
                </button>
              </div>

              {/* Upload drop zone */}
              <div style={{ background: '#fff', padding: 20, border: '1px solid var(--sand)', marginBottom: 20 }}>
                <SectionHeader style={{ marginTop: 0 }}>Subir nuevos colores</SectionHeader>

                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDropColors}
                  onClick={() => colorInputRef.current.click()}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--sand)'}`,
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? 'rgba(184,151,106,.06)' : 'transparent',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--taupe)', letterSpacing: '.15em' }}>
                    {dragging ? 'SOLTAR AQUÍ' : 'ARRASTRA IMÁGENES O HAZ CLIC PARA SELECCIONAR'}
                  </div>
                  <div style={{ fontSize: 10, color: '#ccc', marginTop: 5 }}>
                    JPG · PNG · WEBP · múltiples archivos
                  </div>
                </div>
                <input
                  ref={colorInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => { addColorFiles(e.target.files); e.target.value = '' }}
                />

                {pendingColors.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      {pendingColors.map(pc => (
                        <div key={pc.localId} style={{ width: 96, position: 'relative' }}>
                          <img
                            src={pc.previewUrl}
                            alt="preview"
                            style={{
                              width: 96, height: 96, objectFit: 'cover',
                              display: 'block', border: '1px solid var(--sand)', opacity: 0.85,
                            }}
                          />
                          <button
                            onClick={e => { e.stopPropagation(); removePending(pc.localId) }}
                            style={{
                              position: 'absolute', top: 4, right: 4,
                              background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff',
                              width: 22, height: 22, cursor: 'pointer', fontSize: 13,
                              lineHeight: '22px', textAlign: 'center',
                            }}
                          >
                            ×
                          </button>
                          <input
                            className="so"
                            style={{ width: '100%', padding: '5px 7px', fontSize: 11, marginTop: 6, boxSizing: 'border-box' }}
                            value={pc.nombre}
                            onChange={e => updatePendingNombre(pc.localId, e.target.value)}
                            placeholder="Nombre"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      className="bcot"
                      style={{ width: 'auto', padding: '10px 24px', opacity: uploadingColors ? 0.6 : 1 }}
                      onClick={uploadColors}
                      disabled={uploadingColors}
                    >
                      {uploadingColors
                        ? 'Subiendo…'
                        : `Guardar ${pendingColors.length} color${pendingColors.length !== 1 ? 'es' : ''}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Existing colors grid */}
              <div style={{ background: '#fff', padding: 20, border: '1px solid var(--sand)' }}>
                <SectionHeader style={{ marginTop: 0 }}>
                  Colores guardados ({colores.length})
                </SectionHeader>

                {colores.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--taupe)', fontSize: 12, letterSpacing: '.15em' }}>
                    Sin colores aún · sube imágenes arriba
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {colores.map(color => (
                      <ColorCard
                        key={color.id}
                        color={color}
                        onNombreBlur={updateColorNombre}
                        onToggleActivo={toggleColorActivo}
                        onDelete={deleteColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
