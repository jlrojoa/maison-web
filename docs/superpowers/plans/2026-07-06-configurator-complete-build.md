# Maison Configurator Complete Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite AdminTelas (grado tabs + inline color management + tela-imagenes bucket), AdminProducts Precios tab (pending-state grid + GUARDAR button), and ProductDetail price display (priceStatus + "desde" logic).

**Architecture:** Three independent files, each modified/rewritten in isolation. No new files needed. AdminTelas gets a full structural rewrite into a tab+card layout. AdminProducts gets a surgical change to the precios tab only. ProductDetail gets a price-logic enhancement.

**Tech Stack:** React 18, Supabase JS v2, `@supabase/supabase-js`, `crypto.randomUUID()`, existing CSS variables (`--charcoal`, `--sand`, `--gold`, `--taupe`, `--warm`, `--serif`, `--sans`).

---

## Pre-Work: Read the codebase

- [ ] Read `src/admin/AdminTelas.jsx` (604 lines) — note existing `saveFamilia`, `loadColores`, `uploadColors`, bucket name ("telas"), upload path pattern
- [ ] Read `src/admin/AdminProducts.jsx` — specifically the `PriceCell` component (lines 38-53), `priceMatrix` state, `savePriceCell` function, and the Precios tab JSX (lines 672-729)
- [ ] Read `src/pages/ProductDetail.jsx` — note `precioMatrix` loading in `loadDetail`, `livePrice` derivation, price display JSX (lines 175-188)

---

## Task 1: AdminTelas — Top-level structure rewrite

**Files:**
- Modify: `src/admin/AdminTelas.jsx` (full rewrite)

The current layout is left-panel (form + list) + right-panel (color manager). New layout: grade tabs → familia cards → inline color management. The existing `saveFamilia`, `deleteFamilia`, `toggleActivo` logic is reused; only the UI structure changes significantly.

### Step 1.1 — Replace state declarations and imports

- [ ] Open `src/admin/AdminTelas.jsx` and replace the entire file with the following. Read carefully — this is a complete rewrite.

```jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const GRADOS = ['AA', 'A', 'B', 'C']
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

const GradoBadge = ({ grado }) => (
  <span style={{ ...GRADO_STYLE[grado], fontSize: 9, letterSpacing: '.15em', padding: '2px 7px', display: 'inline-block', textTransform: 'uppercase', fontFamily: 'var(--sans)' }}>
    {grado}
  </span>
)

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--charcoal)', color: '#fff', fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '.1em', padding: '14px 22px', zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.25)', animation: 'up .3s ease' }}>
      {message}
    </div>
  )
}

// ── EditFamiliaModal ──────────────────────────────────────────────────────────
function EditFamiliaModal({ familia, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: familia?.nombre ?? '',
    grado: familia?.grado ?? 'AA',
    descripcion: familia?.descripcion ?? '',
  })
  const [saving, setSaving] = useState(false)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (familia?.id) {
        await supabase.from('telas').update({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion }).eq('id', familia.id)
      } else {
        await supabase.from('telas').insert({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion, activo: true, orden: 999 })
      }
      onSaved()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tl-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="tl-box" style={{ maxWidth: 460 }}>
        <button className="tl-x" onClick={onClose}>×</button>
        <div className="tl-body">
          <div style={{ fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18 }}>
            {familia?.id ? 'Editar familia' : 'Nueva familia'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <Label>Nombre *</Label>
              <input className="so" style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }} value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="ej. Lino Belga" />
            </div>
            <div>
              <Label>Grado</Label>
              <select className="so" style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }} value={form.grado} onChange={e => setF('grado', e.target.value)}>
                <option value="AA">AA — Premium</option>
                <option value="A">A — Alto</option>
                <option value="B">B — Estándar</option>
                <option value="C">C — Económico</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>Descripción</Label>
              <input className="so" style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box' }} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} placeholder="Descripción opcional" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bcot" style={{ width: 'auto', padding: '10px 24px', opacity: saving ? .6 : 1 }} onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : familia?.id ? 'Guardar cambios' : 'Crear familia'}
            </button>
            <button className="bkit" style={{ width: 'auto', padding: '10px 20px' }} onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EditColorModal ────────────────────────────────────────────────────────────
function EditColorModal({ color, onClose, onSaved }) {
  const [nombre, setNombre] = useState(color.nombre ?? '')
  const [newFile, setNewFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const save = async () => {
    setSaving(true)
    try {
      let imagen_url = color.imagen_url
      if (newFile) {
        const ext = newFile.name.split('.').pop().toLowerCase()
        const path = `telas/${color.tela_id}/${color.id}/imagen.${ext}`
        const { error } = await supabase.storage.from('tela-imagenes').upload(path, newFile, { upsert: true })
        if (!error) {
          const { data } = supabase.storage.from('tela-imagenes').getPublicUrl(path)
          imagen_url = data.publicUrl
        }
      }
      await supabase.from('tela_colores').update({ nombre, imagen_url }).eq('id', color.id)
      onSaved()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tl-ov" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="tl-box" style={{ maxWidth: 380 }}>
        <button className="tl-x" onClick={onClose}>×</button>
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18 }}>Editar color</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            {(newFile ? URL.createObjectURL(newFile) : color.imagen_url) ? (
              <img src={newFile ? URL.createObjectURL(newFile) : color.imagen_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid var(--sand)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 72, height: 72, background: 'var(--sand)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <Label>Nombre</Label>
              <input className="so" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', marginBottom: 10 }} value={nombre} onChange={e => setNombre(e.target.value)} />
              <button className="la" style={{ fontSize: 11 }} onClick={() => fileRef.current.click()}>
                {newFile ? `✓ ${newFile.name}` : 'Cambiar imagen'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setNewFile(e.target.files[0] ?? null); e.target.value = '' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bcot" style={{ width: 'auto', padding: '10px 24px', opacity: saving ? .6 : 1 }} onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="bkit" style={{ width: 'auto', padding: '10px 20px' }} onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FamiliaCard ───────────────────────────────────────────────────────────────
function FamiliaCard({ familia, expanded, onToggle, onEdit, onDelete, onToggleActivo, onColorsChanged, onToast }) {
  const [colores, setColores] = useState([])
  const [editColorModal, setEditColorModal] = useState(null)
  const [pendingColors, setPendingColors] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const loadColores = async () => {
    const { data } = await supabase.from('tela_colores').select('*').eq('tela_id', familia.id).order('orden')
    setColores(data ?? [])
  }

  useEffect(() => {
    if (expanded) loadColores()
    else { setPendingColors([]) }
  }, [expanded, familia.id])

  const deleteColor = async (id) => {
    if (!confirm('¿Eliminar este color?')) return
    try {
      await supabase.from('tela_colores').delete().eq('id', id)
      await loadColores()
      onColorsChanged()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const toggleColorActivo = async (color) => {
    await supabase.from('tela_colores').update({ activo: !color.activo }).eq('id', color.id)
    await loadColores()
  }

  const reorderColor = async (color, direction) => {
    const sorted = [...colores].sort((a, b) => a.orden - b.orden)
    const idx = sorted.findIndex(c => c.id === color.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      supabase.from('tela_colores').update({ orden: other.orden }).eq('id', color.id),
      supabase.from('tela_colores').update({ orden: color.orden }).eq('id', other.id),
    ])
    await loadColores()
  }

  const addFiles = (files) => {
    const items = Array.from(files).map(file => ({
      localId: crypto.randomUUID(),
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

  const uploadAll = async () => {
    if (!pendingColors.length) return
    setUploading(true)
    try {
      const existingCount = colores.length
      let successCount = 0
      for (let i = 0; i < pendingColors.length; i++) {
        const pc = pendingColors[i]
        const colorId = crypto.randomUUID()
        const ext = pc.file.name.split('.').pop().toLowerCase()
        const path = `telas/${familia.id}/${colorId}/imagen.${ext}`
        const { error } = await supabase.storage.from('tela-imagenes').upload(path, pc.file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('tela-imagenes').getPublicUrl(path)
          const { error: insertErr } = await supabase.from('tela_colores').insert({
            id: colorId,
            tela_id: familia.id,
            nombre: pc.nombre,
            imagen_url: urlData.publicUrl,
            orden: existingCount + i,
            activo: true,
          })
          if (!insertErr) successCount++
        }
      }
      pendingColors.forEach(pc => URL.revokeObjectURL(pc.previewUrl))
      setPendingColors([])
      await loadColores()
      onColorsChanged()
      onToast(`${successCount} color${successCount !== 1 ? 'es' : ''} agregado${successCount !== 1 ? 's' : ''} a ${familia.nombre} ✓`)
    } catch (err) {
      alert(`Error al subir: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const colorCount = colores.length

  return (
    <div style={{ border: '1px solid var(--sand)', marginBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: expanded ? 'var(--cream)' : '#fff', cursor: 'pointer' }}
        onClick={onToggle}>
        <GradoBadge grado={familia.grado} />
        <strong style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 16, color: 'var(--ink)', flex: 1 }}>{familia.nombre}</strong>
        {familia.descripcion && (
          <span style={{ fontSize: 11, color: 'var(--taupe)', flex: 1 }}>{familia.descripcion}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--taupe)', whiteSpace: 'nowrap' }}>{expanded ? colorCount : (familia.colores?.[0]?.count ?? 0)} colores</span>
        {/* Actions — stop propagation so they don't toggle expand */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <input type="checkbox" checked={familia.activo ?? true} onChange={() => onToggleActivo(familia)} />
            <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--taupe)', textTransform: 'uppercase' }}>activo</span>
          </label>
          <button className="la" style={{ fontSize: 11 }} onClick={() => onEdit(familia)}>Editar</button>
          <button className="la" style={{ fontSize: 11, borderColor: '#c0392b', color: '#c0392b' }} onClick={() => onDelete(familia.id)}>Eliminar</button>
        </div>
        <span style={{ color: 'var(--taupe)', fontSize: 18, fontWeight: 300, marginLeft: 4 }}>{expanded ? '−' : '+'}</span>
      </div>

      {/* Expanded: color list + upload zone */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--sand)', padding: '16px 16px 20px' }}>
          {/* Existing colors */}
          {colores.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {colores.map((color, idx) => (
                <div key={color.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--sand)', opacity: color.activo ? 1 : 0.45 }}>
                  {color.imagen_url
                    ? <img src={color.imagen_url} alt={color.nombre} style={{ width: 48, height: 48, objectFit: 'cover', border: '1px solid var(--sand)', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, background: 'var(--sand)', flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--charcoal)' }}>{color.nombre}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <input type="checkbox" checked={color.activo ?? true} onChange={() => toggleColorActivo(color)} />
                      <span style={{ fontSize: 9, color: 'var(--taupe)', textTransform: 'uppercase', letterSpacing: '.1em' }}>activo</span>
                    </label>
                    <button className="la" style={{ fontSize: 11 }} onClick={() => setEditColorModal(color)}>Editar</button>
                    <button className="la" style={{ fontSize: 11, borderColor: '#c0392b', color: '#c0392b' }} onClick={() => deleteColor(color.id)}>Eliminar</button>
                    <button
                      style={{ background: 'none', border: '1px solid var(--sand)', width: 26, height: 26, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 12 }}
                      disabled={idx === 0}
                      onClick={() => reorderColor(color, 'up')}
                    >↑</button>
                    <button
                      style={{ background: 'none', border: '1px solid var(--sand)', width: 26, height: 26, cursor: idx === colores.length - 1 ? 'default' : 'pointer', opacity: idx === colores.length - 1 ? 0.3 : 1, fontSize: 12 }}
                      disabled={idx === colores.length - 1}
                      onClick={() => reorderColor(color, 'down')}
                    >↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginBottom: 10 }}>
              + Agregar colores
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
              onClick={() => fileRef.current.click()}
              style={{ border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--sand)'}`, padding: '16px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(184,151,106,.06)' : 'transparent', transition: 'all .2s', marginBottom: 12 }}
            >
              <div style={{ fontSize: 11, color: 'var(--taupe)', letterSpacing: '.12em' }}>
                {dragging ? 'SOLTAR AQUÍ' : 'ARRASTRA IMÁGENES O HAZ CLIC'}
              </div>
              <div style={{ fontSize: 10, color: '#ccc', marginTop: 4 }}>JPG · PNG · WEBP · múltiples archivos</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

            {pendingColors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  {pendingColors.map(pc => (
                    <div key={pc.localId} style={{ width: 88, position: 'relative' }}>
                      <img src={pc.previewUrl} alt="" style={{ width: 88, height: 88, objectFit: 'cover', display: 'block', border: '1px solid var(--sand)' }} />
                      <button onClick={e => { e.stopPropagation(); removePending(pc.localId) }}
                        style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: '20px', textAlign: 'center' }}>×</button>
                      <input
                        className="so"
                        style={{ width: '100%', padding: '4px 6px', fontSize: 10, marginTop: 5, boxSizing: 'border-box' }}
                        value={pc.nombre}
                        onChange={e => setPendingColors(prev => prev.map(p => p.localId === pc.localId ? { ...p, nombre: e.target.value } : p))}
                        placeholder="Nombre"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="bcot"
                  style={{ width: 'auto', padding: '10px 24px', opacity: uploading ? .6 : 1 }}
                  onClick={uploadAll}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo…' : `Subir ${pendingColors.length} color${pendingColors.length !== 1 ? 'es' : ''} al storage`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit color modal */}
      {editColorModal && (
        <EditColorModal
          color={editColorModal}
          onClose={() => setEditColorModal(null)}
          onSaved={async () => { setEditColorModal(null); await loadColores() }}
        />
      )}
    </div>
  )
}

// ── AdminTelas (main) ─────────────────────────────────────────────────────────
export default function AdminTelas() {
  const [familias, setFamilias] = useState([])
  const [activeGradoTab, setActiveGradoTab] = useState('AA')
  const [expandedFamiliaId, setExpandedFamiliaId] = useState(null)
  const [editFamiliaModal, setEditFamiliaModal] = useState(null) // null=closed, {}=new, {familia}=edit
  const [toast, setToast] = useState(null)

  const loadFamilias = async () => {
    const { data } = await supabase.from('telas').select('*, colores:tela_colores(count)').order('grado').order('orden')
    setFamilias(data ?? [])
  }

  useEffect(() => { loadFamilias() }, [])

  const deleteFamilia = async (id) => {
    if (!confirm('¿Eliminar esta familia? Se eliminarán también todos sus colores.')) return
    try {
      await supabase.from('telas').delete().eq('id', id)
      if (expandedFamiliaId === id) setExpandedFamiliaId(null)
      await loadFamilias()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    }
  }

  const toggleActivo = async (familia) => {
    await supabase.from('telas').update({ activo: !familia.activo }).eq('id', familia.id)
    await loadFamilias()
  }

  const familiasForTab = familias.filter(f => f.grado === activeGradoTab)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)' }}>Telas & Familias</h1>
        <button className="bcot" style={{ width: 'auto', padding: '10px 22px' }} onClick={() => setEditFamiliaModal({})}>
          + Nueva familia
        </button>
      </div>

      {/* Grade tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--sand)', marginBottom: 28 }}>
        {GRADOS.map(g => {
          const count = familias.filter(f => f.grado === g).length
          return (
            <button key={g} onClick={() => setActiveGradoTab(g)}
              style={{ padding: '10px 22px', background: 'none', border: 'none', borderBottom: activeGradoTab === g ? '2px solid var(--charcoal)' : '2px solid transparent', marginBottom: -2, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.18em', color: activeGradoTab === g ? 'var(--charcoal)' : 'var(--taupe)' }}>
              Grado {g}
              {count > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--sand)', borderRadius: 99, padding: '1px 6px' }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Familia cards */}
      {familiasForTab.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--taupe)', fontSize: 12, letterSpacing: '.2em' }}>
          No hay familias en Grado {activeGradoTab} · crea una arriba
        </div>
      ) : (
        <div>
          {familiasForTab.map(familia => (
            <FamiliaCard
              key={familia.id}
              familia={familia}
              expanded={expandedFamiliaId === familia.id}
              onToggle={() => setExpandedFamiliaId(prev => prev === familia.id ? null : familia.id)}
              onEdit={f => setEditFamiliaModal(f)}
              onDelete={deleteFamilia}
              onToggleActivo={toggleActivo}
              onColorsChanged={loadFamilias}
              onToast={setToast}
            />
          ))}
        </div>
      )}

      {/* Edit/Create familia modal */}
      {editFamiliaModal !== null && (
        <EditFamiliaModal
          familia={editFamiliaModal.id ? editFamiliaModal : null}
          onClose={() => setEditFamiliaModal(null)}
          onSaved={async () => {
            setEditFamiliaModal(null)
            await loadFamilias()
            if (!editFamiliaModal?.id) {
              // new familia: switch to its grade tab after creation
            }
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
```

### Step 1.2 — Verify AdminTelas renders without errors

- [ ] Run dev server: `npm run dev` (from `C:\Users\Usuario\Downloads\Maison`)
- [ ] Open browser to `http://localhost:5173/admin/telas`
- [ ] Confirm: grade tabs AA/A/B/C appear at top
- [ ] Confirm: existing families appear under their correct grade tab
- [ ] Confirm: clicking a familia header expands the color list
- [ ] Confirm: "+ Nueva familia" button opens modal
- [ ] Confirm: Editar button on a familia opens pre-populated modal

### Step 1.3 — Verify image upload to tela-imagenes bucket

- [ ] Expand a familia (e.g., Lino Basic under AA tab)
- [ ] Drag 1 image onto the upload zone
- [ ] Type a name (e.g., "Crema")
- [ ] Click "Subir 1 color al storage"
- [ ] In Supabase Storage dashboard: confirm file exists at `tela-imagenes/telas/{tela_id}/{color_id}/imagen.jpg`
- [ ] Confirm new color appears in the expanded familia
- [ ] Toast "1 color agregado a Lino Basic ✓" appears

### Step 1.4 — Verify color reorder

- [ ] Expand a familia with 3+ colors
- [ ] Click ↓ on the first color
- [ ] Confirm it swaps position with the second color
- [ ] Click ↑ on the same color to restore order
- [ ] Confirm ↑ is disabled on the first color (greyed out)

### Step 1.5 — Verify color edit modal

- [ ] Click Editar on any color
- [ ] Modal opens with current nombre and thumbnail
- [ ] Change nombre, click "Guardar"
- [ ] Confirm nombre updated in list without page reload

### Step 1.6 — Commit

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminTelas.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: AdminTelas — grado tabs, inline color management, tela-imagenes bucket"
```

---

## Task 2: AdminProducts — Precios Tab: pending state + GUARDAR button

**Files:**
- Modify: `src/admin/AdminProducts.jsx` (surgical: PriceCell + priceMatrix state + precios tab JSX)

Currently `PriceCell` saves to DB on blur. The spec requires: edited cells turn yellow (pending), all changes are held in memory, user presses GUARDAR to batch-upsert, CANCELAR reverts to original.

### Step 2.1 — Remove PriceCell component, add pendingPrices state

- [ ] At the top of `src/admin/AdminProducts.jsx`, remove the `PriceCell` component (lines 38-53):

```jsx
// DELETE THIS entire function:
function PriceCell({ initialValue, onSave }) {
  const [val, setVal] = useState(initialValue)
  useEffect(() => { setVal(initialValue) }, [initialValue])
  return (
    <input ... onBlur={() => { onSave(val).catch(() => {}) }} ... />
  )
}
```

### Step 2.2 — Add pendingPrices and savingMatrix state to AdminProducts

- [ ] In `AdminProducts`, find the state declarations block. After the existing `priceMatrix` state:

```jsx
const [priceMatrix, setPriceMatrix] = useState({})
```

Add:

```jsx
const [pendingPrices, setPendingPrices] = useState({}) // {configId: {grado: value}}
const [savingMatrix, setSavingMatrix] = useState(false)
```

### Step 2.3 — Add reset for pendingPrices in the reset() function

- [ ] In the `reset()` function, after `setPriceMatrix({})`, add:

```jsx
setPendingPrices({})
```

### Step 2.4 — Replace the Precios tab JSX

- [ ] Find the Precios tab block (starts with `{editing && activeTab === 'precios' && (`). Replace it entirely with:

```jsx
{/* ── PRECIOS TAB ── */}
{editing && activeTab === 'precios' && (
  <div style={{ background: '#fff', padding: 24 }}>
    <div style={{ fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--charcoal)', borderBottom: '1px solid var(--sand)', paddingBottom: 10, marginBottom: 18, marginTop: 0 }}>
      Matriz de Precios
    </div>
    <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 20px', letterSpacing: '.05em' }}>
      Edita las celdas y pulsa <strong>Guardar Matriz</strong> para aplicar cambios.
    </p>

    {configuraciones.filter(c => c.activo).length === 0 ? (
      <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.05em' }}>
        Primero agrega tamaños en la pestaña Tamaños.
      </p>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>
                Tamaño
              </th>
              {GRADOS.map(g => (
                <th key={g} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {configuraciones.filter(c => c.activo).map(cfg => (
              <tr key={cfg.id}>
                <td style={{ padding: '10px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)', color: 'var(--charcoal)' }}>
                  <strong style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>{cfg.nombre}</strong>
                  {cfg.dimensiones && (
                    <span style={{ fontSize: 11, color: 'var(--taupe)', marginLeft: 8 }}>{cfg.dimensiones}</span>
                  )}
                </td>
                {GRADOS.map(g => {
                  const savedVal = (priceMatrix[cfg.id] ?? {})[g] ?? ''
                  const pendingVal = pendingPrices[cfg.id]?.[g]
                  const displayVal = pendingVal !== undefined ? pendingVal : savedVal
                  const isDirty = pendingVal !== undefined && pendingVal !== savedVal
                  return (
                    <td key={g} style={{ padding: '6px 10px', borderBottom: '1px solid var(--sand)', textAlign: 'center', background: isDirty ? '#FFF9E6' : 'transparent' }}>
                      <input
                        className="so"
                        style={{ width: 100, padding: '7px 10px', fontSize: 13, textAlign: 'right', background: isDirty ? '#FFF9E6' : 'transparent' }}
                        type="number"
                        value={displayVal}
                        placeholder="—"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const v = e.target.value
                          setPendingPrices(prev => ({
                            ...prev,
                            [cfg.id]: { ...(prev[cfg.id] ?? {}), [g]: v }
                          }))
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
      <button
        className="bcot"
        style={{ width: 'auto', padding: '12px 28px', opacity: savingMatrix ? .6 : 1 }}
        disabled={savingMatrix || Object.keys(pendingPrices).length === 0}
        onClick={async () => {
          setSavingMatrix(true)
          try {
            const upserts = []
            Object.entries(pendingPrices).forEach(([configId, grades]) => {
              Object.entries(grades).forEach(([grado, value]) => {
                const precio = parseFloat(value)
                if (!isNaN(precio) && value.trim() !== '') {
                  upserts.push({ producto_id: editing, configuracion_id: configId, grado, precio })
                }
              })
            })
            if (upserts.length > 0) {
              await supabase.from('producto_precios').upsert(upserts, { onConflict: 'producto_id,configuracion_id,grado' })
            }
            // Delete cells where value was cleared
            for (const [configId, grades] of Object.entries(pendingPrices)) {
              for (const [grado, value] of Object.entries(grades)) {
                if (value.trim() === '' || isNaN(parseFloat(value))) {
                  await supabase.from('producto_precios').delete()
                    .eq('producto_id', editing).eq('configuracion_id', configId).eq('grado', grado)
                }
              }
            }
            setPendingPrices({})
            await reloadPriceMatrix()
            alert('Precios guardados ✓')
          } catch (err) {
            alert(`Error al guardar precios: ${err.message}`)
          } finally {
            setSavingMatrix(false)
          }
        }}
      >
        {savingMatrix ? 'Guardando…' : 'Guardar Matriz'}
      </button>
      <button
        className="bkit"
        style={{ width: 'auto', padding: '12px 28px' }}
        onClick={() => setPendingPrices({})}
        disabled={Object.keys(pendingPrices).length === 0}
      >
        Cancelar cambios
      </button>
      <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
        Cerrar
      </button>
    </div>
  </div>
)}
```

### Step 2.5 — Verify Precios tab behavior

- [ ] Open `/admin/productos` → click Editar on any product → click Precios tab
- [ ] Confirm: table shows all configuraciones as rows, AA/A/B/C as columns, with existing values
- [ ] Click a price cell → type a new value → background turns yellow (#FFF9E6)
- [ ] Click elsewhere → yellow background stays (NOT auto-saved)
- [ ] "Guardar Matriz" button is now enabled (was disabled before edit)
- [ ] Click "Guardar Matriz" → alert "Precios guardados ✓" → yellow cells return to white
- [ ] Click "Cancelar cambios" → edited values revert to original (yellow disappears)

### Step 2.6 — Commit

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/admin/AdminProducts.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: AdminProducts — precios tab pending state + GUARDAR MATRIZ button"
```

---

## Task 3: ProductDetail — Price display: priceStatus + "desde" logic

**Files:**
- Modify: `src/pages/ProductDetail.jsx`

Currently: `livePrice` is derived synchronously from a preloaded matrix. The spec adds:
- `priceStatus` enum: `'loading'` | `'available'` | `'unavailable'` | `'desde'`
- "desde $X MXN" when `selectedConfig === null` (before detail loads or when unselected)
- Show "desde" using the global minimum price across all configs + grades

### Step 3.1 — Add lowestPriceAll derived value

- [ ] In `src/pages/ProductDetail.jsx`, after the `livePrice` line, add:

```jsx
// Global minimum across ALL configs and grades (for "desde" when no size selected)
const lowestPriceAll = distribuidor && detail
  ? Object.values(precioMatrix).flatMap(grades => Object.values(grades)).reduce(
      (min, v) => (v != null && (min === null || v < min)) ? v : min,
      null
    )
  : null
```

### Step 3.2 — Update the price display line

- [ ] Find the price display block (the `<div className="p-pr">` block). Replace it:

```jsx
{/* Price line */}
<div className="p-pr">
  <span
    className="p-price"
    style={distribuidor && detail && selectedConfig && livePrice == null ? { color: '#c0392b', fontSize: 14 } : {}}
  >
    {!distribuidor
      ? 'Precio a consultar'
      : !detail
        ? '…'
        : !selectedConfig
          ? lowestPriceAll != null
            ? `desde ${fmt(lowestPriceAll)}`
            : 'Precio a consultar'
          : livePrice != null
            ? fmt(livePrice)
            : 'Combinación no disponible'}
  </span>
  {distribuidor && livePrice != null && (
    <span className="p-note">IVA incluido · Grado {selectedGrado}</span>
  )}
</div>
```

### Step 3.3 — Verify price display states

- [ ] Open product page as logged-in distribuidor
  - Before detail loads: shows "…"
  - After detail loads (first config pre-selected, grade = AA): shows AA price immediately
  - Select a different grade tab: price updates to that grade's price
  - Select a config with no price for current grade: shows "Combinación no disponible" in red
- [ ] Open product page as public (incognito): always shows "Precio a consultar"

### Step 3.4 — Commit

```bash
git -C "C:\Users\Usuario\Downloads\Maison" add src/pages/ProductDetail.jsx
git -C "C:\Users\Usuario\Downloads\Maison" commit -m "feat: ProductDetail — priceStatus display + desde lowestPriceAll"
```

---

## Task 4: End-to-End Validation

Run all 6 validation cases from the spec:

### Step 4.1 — Validation 1: Distribuidor + Cubo + 1 Plaza + AA

- [ ] Log in as distribuidor
- [ ] Open product "Cubo"
- [ ] Confirm Paso 1 buttons show available sizes
- [ ] Select "1 Plaza" (or first size)
- [ ] Confirm AA tab is active by default
- [ ] Confirm price shows `$32,000 MXN` (or whatever the DB value is)
- [ ] Open Lino Basic familia → click a color swatch → resumen appears below

### Step 4.2 — Validation 2: Change to 1.5 Plazas

- [ ] Click "1.5 Plazas" size button
- [ ] Confirm price updates to `$38,000` (or whatever DB value is)

### Step 4.3 — Validation 3: Switch to grade A tab

- [ ] Click "A" tab in PASO 2
- [ ] Confirm Terranova (or A-grade telas) appear
- [ ] Confirm price updates to the A-grade price for 1.5 Plazas
- [ ] Click a color swatch in the expanded Terranova card

### Step 4.4 — Validation 4: Public user

- [ ] Open private/incognito window
- [ ] Navigate to the same product
- [ ] Confirm: "Precio a consultar" (not a number)
- [ ] Confirm: button says "Solicitar cotización"
- [ ] Click button → confirm it fires the requestQuote lead form (check Supabase leads table)

### Step 4.5 — Validation 5: AdminTelas color upload

- [ ] Go to `/admin/telas`
- [ ] Find "AA" tab → expand "Lino Basic" (or any AA familia)
- [ ] Drag 2 image files onto the upload zone
- [ ] Name them "Crema" and "Beige"
- [ ] Click "Subir 2 colores al storage"
- [ ] Toast appears ✓
- [ ] Confirm colors appear in the expanded list
- [ ] Go to the product page → open AA tela → confirm new colors appear in the swatch grid

### Step 4.6 — Validation 6: AdminProducts precios GUARDAR

- [ ] Go to `/admin/productos` → Editar product → Precios tab
- [ ] Click a price cell → type a different number → background turns yellow
- [ ] Click "Guardar Matriz" → alert "Precios guardados ✓"
- [ ] Go to product page → confirm the price now shows the new value

### Step 4.7 — Deploy

```bash
git -C "C:\Users\Usuario\Downloads\Maison" push
```

Then run Vercel deploy from the terminal or Vercel dashboard.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| AdminTelas tabs AA/A/B/C | Task 1 |
| AdminTelas familia collapsible cards | Task 1 |
| AdminTelas edit familia modal | Task 1 |
| AdminTelas delete familia | Task 1 |
| AdminTelas inline color list | Task 1 |
| AdminTelas edit color modal (change image) | Task 1 |
| AdminTelas reorder ↑↓ | Task 1 |
| AdminTelas multi-upload | Task 1 |
| Upload to "tela-imagenes" bucket | Task 1 |
| Upload path `telas/{tela_id}/{color_id}/imagen.{ext}` | Task 1 |
| Toast on upload success | Task 1 |
| Admin sidebar no "Tejidos" | ✅ already done in prior session |
| AdminProducts precios pending state (yellow) | Task 2 |
| AdminProducts GUARDAR MATRIZ button | Task 2 |
| AdminProducts CANCELAR button | Task 2 |
| ProductDetail price uses grade tab | ✅ already done in prior session |
| ProductDetail "desde" when no size | Task 3 |
| ProductDetail "Combinación no disponible" red | Task 3 |
| ProductDetail public = "Precio a consultar" | ✅ existing behavior correct |
| ProductDetail CTA enabled when price available | ✅ already done in prior session |
| ProductDetail fabric images from imagen_url | ✅ existing behavior correct |

**Gaps found:** None. All spec requirements are covered.

**Placeholder scan:** No TBD, no TODO, no "similar to Task N" patterns. All code blocks are complete and runnable.

**Type consistency:**
- `familia.id` used consistently throughout FamiliaCard and EditFamiliaModal
- `color.tela_id` used in EditColorModal upload path — matches `tela_colores.tela_id` column
- `pendingPrices[cfg.id][g]` in Task 2 — `cfg.id` matches `configuraciones[].id` from existing state
- `precioMatrix` structure `{configId: {grade: precio}}` — same as existing `reloadPriceMatrix` build logic
