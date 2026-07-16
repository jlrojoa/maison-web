// src/admin/catalogo/AdminColores.jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS = ['AA', 'A', 'B', 'C']
const BUCKET = 'telas'

export default function AdminColores() {
  const [telas, setTelas] = useState([])
  const [selectedTelaId, setSelectedTelaId] = useState(null)
  const [colores, setColores] = useState([])
  const [pending, setPending] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const selectedTela = telas.find(t => t.id === selectedTelaId) ?? null

  const loadTelas = async () => {
    const { data } = await supabase.from('telas').select('*').eq('activo', true).order('grado').order('orden')
    setTelas(data ?? [])
    setSelectedTelaId(prev => prev ?? (data ?? [])[0]?.id ?? null)
  }

  useEffect(() => { loadTelas() }, [])

  const loadColores = async (telaId) => {
    if (!telaId) { setColores([]); return }
    const { data } = await supabase.from('tela_colores').select('*').eq('tela_id', telaId).order('orden')
    setColores(data ?? [])
  }

  useEffect(() => { loadColores(selectedTelaId); setPending([]) }, [selectedTelaId])

  const addFiles = (files) => {
    const items = Array.from(files).map(file => ({
      localId: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      nombre: file.name.replace(/\.[^.]+$/, ''),
    }))
    setPending(prev => [...prev, ...items])
  }
  const removePending = (localId) => setPending(prev => {
    const item = prev.find(p => p.localId === localId)
    if (item) URL.revokeObjectURL(item.previewUrl)
    return prev.filter(p => p.localId !== localId)
  })
  const updatePendingNombre = (localId, nombre) => setPending(prev => prev.map(p => p.localId === localId ? { ...p, nombre } : p))

  const uploadPending = async () => {
    if (!selectedTela || pending.length === 0) return
    setUploading(true)
    try {
      const startOrden = colores.length
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i]
        const ext = item.file.name.split('.').pop().toLowerCase()
        const path = `telas/${selectedTela.id}/${Date.now()}-${i}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, item.file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
          await supabase.from('tela_colores').insert({
            tela_id: selectedTela.id,
            nombre: item.nombre,
            imagen_url: urlData.publicUrl,
            orden: startOrden + i,
            activo: true,
          })
        }
      }
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPending([])
      loadColores(selectedTela.id)
      loadTelas()
    } catch (err) {
      alert(`Error al subir colores: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const updateColorNombre = async (id, nombre) => {
    await supabase.from('tela_colores').update({ nombre }).eq('id', id)
    loadColores(selectedTelaId)
  }
  const toggleColorActivo = async (color) => {
    await supabase.from('tela_colores').update({ activo: !color.activo }).eq('id', color.id)
    loadColores(selectedTelaId)
  }
  const deleteColor = async (id) => {
    if (!confirm('¿Eliminar este color?')) return
    await supabase.from('tela_colores').delete().eq('id', id)
    loadColores(selectedTelaId)
    loadTelas()
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Colores</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Colores</b></div>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-header"><div className="adm-card-title">Selecciona una colección</div></div>
          <select className="adm-select" style={{ width: 320 }} value={selectedTelaId ?? ''} onChange={e => setSelectedTelaId(e.target.value)}>
            {GRADOS.map(g => {
              const grupo = telas.filter(t => t.grado === g)
              if (grupo.length === 0) return null
              return (
                <optgroup key={g} label={`Categoría ${g}`}>
                  {grupo.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </optgroup>
              )
            })}
          </select>
        </div>

        {selectedTela && (
          <>
            <div className="adm-card">
              <div className="adm-card-header">
                <div>
                  <div className="adm-card-title">Subir colores · {selectedTela.nombre}</div>
                  <div className="adm-card-sub">Arrastra imágenes o haz clic para seleccionar.</div>
                </div>
              </div>
              <div
                className="adm-img-drop"
                style={{ height: 100, borderColor: dragging ? '#111827' : undefined, background: dragging ? '#F3F4F6' : undefined }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current.click()}
              >
                {dragging ? 'Soltar aquí' : '+ Arrastra o haz clic para subir'}
              </div>
              <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

              {pending.length > 0 && (
                <>
                  <div className="adm-img-grid" style={{ marginTop: 16 }}>
                    {pending.map(item => (
                      <div key={item.localId} className="adm-img-thumb" style={{ background: `url(${item.previewUrl})`, opacity: 0.8 }}>
                        <span className="adm-principal-tag" style={{ background: '#6B7280' }}>Pendiente</span>
                        <button type="button" className="adm-icon-btn" onClick={() => removePending(item.localId)}>🗑</button>
                        <input
                          className="adm-input"
                          style={{ position: 'absolute', bottom: -34, left: 0, width: '100%', fontSize: 11, padding: '4px 6px' }}
                          value={item.nombre}
                          onChange={e => updatePendingNombre(item.localId, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <button type="button" className="adm-btn adm-btn-dark" style={{ marginTop: 42 }} onClick={uploadPending} disabled={uploading}>
                    {uploading ? 'Subiendo…' : `Guardar ${pending.length} color${pending.length !== 1 ? 'es' : ''}`}
                  </button>
                </>
              )}
            </div>

            <div className="adm-card">
              <div className="adm-card-header"><div className="adm-card-title">Colores guardados ({colores.length})</div></div>
              {colores.length === 0 ? (
                <div className="adm-empty-note">Sin colores aún — sube imágenes arriba.</div>
              ) : (
                <div className="adm-img-grid">
                  {colores.map(color => (
                    <div key={color.id} style={{ position: 'relative', paddingBottom: 30 }}>
                      <div className="adm-img-thumb" style={{ background: color.imagen_url ? `url(${color.imagen_url})` : '#F3F4F6', opacity: color.activo ? 1 : 0.5 }}>
                        <button type="button" className="adm-icon-btn" onClick={() => deleteColor(color.id)}>🗑</button>
                      </div>
                      <input
                        className="adm-input"
                        style={{ width: '100%', fontSize: 11, padding: '4px 6px', marginTop: 4 }}
                        defaultValue={color.nombre}
                        onBlur={e => { if (e.target.value !== color.nombre) updateColorNombre(color.id, e.target.value) }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9CA3AF', marginTop: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={color.activo ?? true} onChange={() => toggleColorActivo(color)} />
                        activo
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
