import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'

const EMPTY_FORM = {
  nombre: '', slug: '', subtitulo: '', descripcion: '',
  badge: '', categoria_id: '', activo: true, orden: 0,
  isometrico_url: '',
}
const EMPTY_SPEC = { titulo: '', tipo: 'text', contenido: '' }
const GRADOS = ['AA', 'A', 'B', 'C']

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const Label = ({ children }) => (
  <label style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>
    {children}
  </label>
)
const SectionHeader = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: '.25em', textTransform: 'uppercase', color: 'var(--charcoal)', borderBottom: '1px solid var(--sand)', paddingBottom: 10, marginBottom: 18, marginTop: 32 }}>
    {children}
  </div>
)
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

function PriceCell({ initialValue, onSave }) {
  const [val, setVal] = useState(initialValue)
  useEffect(() => { setVal(initialValue) }, [initialValue])
  return (
    <input
      className="so"
      style={{ width: 90, padding: '7px 10px', fontSize: 13, textAlign: 'right' }}
      type="number"
      value={val}
      onChange={e => setVal(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={() => { onSave(val).catch(() => {}) }}
      placeholder="—"
    />
  )
}

export default function AdminProducts() {
  // Shared
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)

  // General tab
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingImages, setExistingImages] = useState([])
  const [isoFile, setIsoFile] = useState(null)
  const [specs, setSpecs] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const imgRef = useRef()
  const isoRef = useRef()

  // Tamaños tab
  const [configuraciones, setConfiguraciones] = useState([])
  const [tamanoForm, setTamanoForm] = useState({ nombre: '', dimensiones: '' })
  const [savingTamano, setSavingTamano] = useState(false)

  // Precios tab
  const [priceMatrix, setPriceMatrix] = useState({})

  // Telas tab
  const [allTelas, setAllTelas] = useState([])
  const [selectedTelaIds, setSelectedTelaIds] = useState(new Set())
  const [savingTelas, setSavingTelas] = useState(false)

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        supabase.from('productos')
          .select('*, categoria:categorias(id,nombre), imagenes:producto_imagenes(id,url,es_principal)')
          .order('orden'),
        supabase.from('categorias').select('*').order('orden'),
      ])
      setProductos(p.data ?? [])
      setCategorias(c.data ?? [])
    } catch {}
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setActiveTab('general')
    setExistingImages([])
    setSpecs([])
    setOrientaciones([])
    setIsoFile(null)
    setConfiguraciones([])
    setTamanoForm({ nombre: '', dimensiones: '' })
    setPriceMatrix({})
    setAllTelas([])
    setSelectedTelaIds(new Set())
  }

  // ── Price matrix ──
  const reloadPriceMatrix = async (productId) => {
    const pid = productId ?? editing
    if (!pid) return
    const { data } = await supabase.from('producto_precios')
      .select('configuracion_id, grado, precio')
      .eq('producto_id', pid)
    const matrix = {}
    ;(data ?? []).forEach(row => {
      if (!matrix[row.configuracion_id]) matrix[row.configuracion_id] = { AA: '', A: '', B: '', C: '' }
      matrix[row.configuracion_id][row.grado] = String(row.precio)
    })
    setPriceMatrix(matrix)
  }

  const savePriceCell = async (configuracion_id, grado, value) => {
    try {
      const precio = parseFloat(value)
      if (isNaN(precio) || value.trim() === '') {
        await supabase.from('producto_precios').delete()
          .eq('producto_id', editing).eq('configuracion_id', configuracion_id).eq('grado', grado)
      } else {
        await supabase.from('producto_precios').upsert(
          { producto_id: editing, configuracion_id, grado, precio },
          { onConflict: 'producto_id,configuracion_id,grado' }
        )
      }
      await reloadPriceMatrix()
    } catch (err) {
      alert(`Error al guardar precio: ${err.message}`)
    }
  }

  // ── Configuraciones ──
  const reloadConfiguraciones = async (productId) => {
    const pid = productId ?? editing
    if (!pid) return
    const { data } = await supabase.from('producto_configuraciones')
      .select('*').eq('producto_id', pid).order('orden')
    setConfiguraciones(data ?? [])
    await reloadPriceMatrix(pid)
  }

  const addTamano = async () => {
    if (!tamanoForm.nombre.trim()) return alert('El nombre es obligatorio.')
    setSavingTamano(true)
    try {
      await supabase.from('producto_configuraciones').insert({
        producto_id: editing,
        nombre: tamanoForm.nombre,
        dimensiones: tamanoForm.dimensiones,
        orden: configuraciones.length,
        activo: true,
      })
      setTamanoForm({ nombre: '', dimensiones: '' })
      await reloadConfiguraciones()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSavingTamano(false)
    }
  }

  const deleteTamano = async (id) => {
    if (!confirm('¿Eliminar este tamaño y sus precios?')) return
    try {
      await supabase.from('producto_configuraciones').delete().eq('id', id)
      await reloadConfiguraciones()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    }
  }

  const toggleTamanoActivo = async (cfg) => {
    try {
      await supabase.from('producto_configuraciones').update({ activo: !cfg.activo }).eq('id', cfg.id)
      await reloadConfiguraciones()
    } catch {}
  }

  const updateTamanoField = async (id, field, value) => {
    try {
      await supabase.from('producto_configuraciones').update({ [field]: value }).eq('id', id)
      await reloadConfiguraciones()
    } catch {}
  }

  // ── Telas ──
  const loadAllTelas = async () => {
    const { data } = await supabase.from('telas').select('*').eq('activo', true).order('grado').order('nombre')
    setAllTelas(data ?? [])
  }

  const loadSelectedTelas = async (productId) => {
    const pid = productId ?? editing
    if (!pid) return
    const { data } = await supabase.from('producto_telas').select('tela_id').eq('producto_id', pid)
    setSelectedTelaIds(new Set((data ?? []).map(r => r.tela_id)))
  }

  const saveTelasSelection = async () => {
    setSavingTelas(true)
    try {
      await supabase.from('producto_telas').delete().eq('producto_id', editing)
      if (selectedTelaIds.size > 0) {
        await supabase.from('producto_telas').insert(
          [...selectedTelaIds].map(tela_id => ({ producto_id: editing, tela_id }))
        )
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSavingTelas(false)
    }
  }

  // ── Save (General tab) ──
  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        slug: form.slug || slugify(form.nombre),
        subtitulo: form.subtitulo,
        descripcion: form.descripcion,
        badge: form.badge,
        categoria_id: form.categoria_id || null,
        activo: form.activo,
        orden: parseInt(form.orden) || 0,
        isometrico_url: form.isometrico_url || null,
      }

      // 1. Upsert product
      let productId = editing
      if (editing) {
        await supabase.from('productos').update(payload).eq('id', editing)
      } else {
        const { data, error } = await supabase.from('productos').insert(payload).select().single()
        if (error) throw error
        productId = data.id
      }

      // 2. Upload isometric
      if (isoFile) {
        const ext = isoFile.name.split('.').pop().toLowerCase()
        const path = `productos/${productId}/iso-${Date.now()}.${ext}`
        const { error: isoErr } = await supabase.storage.from('maison').upload(path, isoFile, { upsert: true })
        if (!isoErr) {
          const { data: isoData } = supabase.storage.from('maison').getPublicUrl(path)
          await supabase.from('productos').update({ isometrico_url: isoData.publicUrl }).eq('id', productId)
        }
        setIsoFile(null)
      }

      // 3. Upload product images
      const folder = `productos/${productId}`
      const newImages = await imgRef.current.uploadAll(folder)
      if (newImages.length > 0) {
        await supabase.from('producto_imagenes').insert(
          newImages.map(img => ({ ...img, producto_id: productId }))
        )
      }
      const principalExistingId = imgRef.current.getPrincipalExistingId()
      if (principalExistingId) {
        await supabase.from('producto_imagenes').update({ es_principal: false }).eq('producto_id', productId)
        await supabase.from('producto_imagenes').update({ es_principal: true }).eq('id', principalExistingId)
      }

      // 4. Specs: delete → re-insert
      await supabase.from('producto_specs').delete().eq('producto_id', productId)
      if (specs.length > 0) {
        await supabase.from('producto_specs').insert(
          specs.filter(s => s.titulo.trim()).map((s, i) => ({
            producto_id: productId, titulo: s.titulo, tipo: s.tipo, contenido: s.contenido, orden: i,
          }))
        )
      }

      // 5. Orientations: delete → re-insert
      await supabase.from('producto_orientaciones').delete().eq('producto_id', productId)
      const validOrient = orientaciones.filter(o => o.nombre.trim())
      if (validOrient.length > 0) {
        await supabase.from('producto_orientaciones').insert(
          validOrient.map((o, i) => ({ producto_id: productId, nombre: o.nombre, orden: i }))
        )
      }

      load()

      // After creating new product: switch to tamanos tab
      if (!editing) {
        setEditing(productId)
        setActiveTab('tamanos')
        await reloadConfiguraciones(productId)
        await loadAllTelas()
        await loadSelectedTelas(productId)
      }
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete product ──
  const del = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await Promise.all([
        supabase.from('producto_imagenes').delete().eq('producto_id', id),
        supabase.from('producto_configuraciones').delete().eq('producto_id', id),
        supabase.from('producto_specs').delete().eq('producto_id', id),
        supabase.from('producto_precios').delete().eq('producto_id', id),
        supabase.from('producto_telas').delete().eq('producto_id', id),
        supabase.from('producto_orientaciones').delete().eq('producto_id', id),
      ])
      await supabase.from('productos').delete().eq('id', id)
      load()
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`)
    }
  }

  // ── Edit product ──
  const edit = async (p) => {
    setEditing(p.id)
    setActiveTab('general')
    setForm({
      nombre: p.nombre ?? '',
      slug: p.slug ?? '',
      subtitulo: p.subtitulo ?? '',
      descripcion: p.descripcion ?? '',
      badge: p.badge ?? '',
      categoria_id: p.categoria_id ?? '',
      activo: p.activo ?? true,
      orden: p.orden ?? 0,
      isometrico_url: p.isometrico_url ?? '',
    })

    try {
      const [imgs, sps, orientRes] = await Promise.all([
        supabase.from('producto_imagenes').select('*').eq('producto_id', p.id).order('orden'),
        supabase.from('producto_specs').select('*').eq('producto_id', p.id).order('orden'),
        supabase.from('producto_orientaciones').select('*').eq('producto_id', p.id).order('orden'),
      ])
      setExistingImages(imgs.data ?? [])
      setSpecs((sps.data ?? []).map(s => ({ titulo: s.titulo ?? '', tipo: s.tipo ?? 'text', contenido: s.contenido ?? '' })))
      setOrientaciones((orientRes.data ?? []).map(o => ({ nombre: o.nombre ?? '' })))
    } catch {}

    // Load tab data
    await reloadConfiguraciones(p.id)
    await loadAllTelas()
    await loadSelectedTelas(p.id)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Specs helpers ──
  const addSpec = () => setSpecs(s => [...s, { ...EMPTY_SPEC }])
  const setSpec = (i, k, v) => setSpecs(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeSpec = (i) => setSpecs(s => s.filter((_, idx) => idx !== i))
  const addTableRow = (si) => setSpecs(s => s.map((x, idx) => idx === si
    ? { ...x, contenido: [...(Array.isArray(x.contenido) ? x.contenido : []), ['', '']] }
    : x))
  const setTableRow = (si, ri, col, v) => setSpecs(s => s.map((x, idx) => {
    if (idx !== si) return x
    const rows = Array.isArray(x.contenido) ? [...x.contenido] : []
    rows[ri] = col === 0 ? [v, rows[ri]?.[1] ?? ''] : [rows[ri]?.[0] ?? '', v]
    return { ...x, contenido: rows }
  }))
  const removeTableRow = (si, ri) => setSpecs(s => s.map((x, idx) => idx === si
    ? { ...x, contenido: (Array.isArray(x.contenido) ? x.contenido : []).filter((_, i) => i !== ri) }
    : x))

  // ── Orientaciones helpers ──
  const addOrientacion = () => setOrientaciones(o => [...o, { nombre: '' }])
  const setOrientacion = (i, v) => setOrientaciones(o => o.map((x, idx) => idx === i ? { nombre: v } : x))
  const removeOrientacion = (i) => setOrientaciones(o => o.filter((_, idx) => idx !== i))

  // ── Telas grouped by grado ──
  const telasGrouped = allTelas.reduce((acc, t) => {
    const g = t.grado ?? 'Sin grado'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Productos</h1>

      {/* ── FORM CONTAINER ── */}
      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 0, color: 'var(--charcoal)' }}>
          {editing ? 'Editar producto' : 'Nuevo producto'}
        </h3>

        {/* ── TAB BAR (only when editing) ── */}
        {editing && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--sand)', marginBottom: 32, marginTop: 24 }}>
            {['general', 'tamanos', 'precios', 'telas'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--charcoal)' : '2px solid transparent',
                  marginBottom: -2,
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontSize: 10,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: activeTab === tab ? 'var(--charcoal)' : 'var(--taupe)',
                }}>
                {tab === 'general' ? 'General' : tab === 'tamanos' ? 'Tamaños' : tab === 'precios' ? 'Precios' : 'Telas'}
              </button>
            ))}
          </div>
        )}

        {/* ── GENERAL TAB (always shown when not editing, or when editing + activeTab === general) ── */}
        {(!editing || activeTab === 'general') && (
          <>
            {!editing && <div style={{ marginTop: 24 }} />}
            <SectionHeader>Información General</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Label>Nombre *</Label>
                <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.nombre}
                  onChange={e => { set('nombre', e.target.value); if (!editing) set('slug', slugify(e.target.value)) }} />
              </div>
              <div>
                <Label>Slug</Label>
                <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.slug}
                  onChange={e => set('slug', e.target.value)} />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.subtitulo}
                  onChange={e => set('subtitulo', e.target.value)} />
              </div>
              <div>
                <Label>Categoría</Label>
                <select className="so" style={{ width: '100%', padding: '10px 14px' }} value={form.categoria_id}
                  onChange={e => set('categoria_id', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Badge</Label>
                <input className="so" style={{ width: '100%', padding: '10px 14px' }} placeholder="Nuevo, Bestseller…"
                  value={form.badge} onChange={e => set('badge', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Label>Descripción</Label>
                <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 90, resize: 'vertical' }}
                  value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
              <div>
                <Label>Orden</Label>
                <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number"
                  value={form.orden} onChange={e => set('orden', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="activo" checked={form.activo}
                  onChange={e => set('activo', e.target.checked)} />
                <label htmlFor="activo" style={{ fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer' }}>
                  Activo (visible en el sitio)
                </label>
              </div>
            </div>

            {/* Images */}
            <SectionHeader>Imágenes del Producto</SectionHeader>
            <ImageUpload
              key={editing ?? 'new'}
              ref={imgRef}
              bucket="maison"
              existingImages={existingImages}
              onExistingDeleted={id => setExistingImages(prev => prev.filter(i => i.id !== id))}
            />

            {/* Isometric */}
            <SectionHeader>Dibujo Isométrico General</SectionHeader>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {form.isometrico_url && (
                <img src={form.isometrico_url} alt="isométrico" style={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid var(--sand)', background: '#faf9f7' }} />
              )}
              <div>
                <button className="la" type="button" onClick={() => isoRef.current.click()}>
                  {form.isometrico_url ? 'Cambiar dibujo' : 'Subir dibujo isométrico'}
                </button>
                <input ref={isoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { setIsoFile(e.target.files[0] ?? null); e.target.value = '' }} />
                {isoFile && (
                  <p style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 6, letterSpacing: '.05em' }}>
                    {isoFile.name} — se subirá al guardar
                  </p>
                )}
              </div>
            </div>

            {/* Orientaciones */}
            <SectionHeader>Orientaciones</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orientaciones.map((o, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8 }}>
                  <input className="so" style={{ padding: '9px 12px', fontSize: 13 }}
                    placeholder="ej: Isla derecha"
                    value={o.nombre} onChange={e => setOrientacion(i, e.target.value)} />
                  <button onClick={() => removeOrientacion(i)}
                    style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              ))}
              <button onClick={addOrientacion}
                style={{ alignSelf: 'flex-start', marginTop: 4, padding: '8px 18px', background: 'none', border: '1px dashed var(--sand)', cursor: 'pointer', fontSize: 11, letterSpacing: '.15em', color: 'var(--taupe)' }}>
                + AÑADIR ORIENTACIÓN
              </button>
            </div>

            {/* Specs */}
            <SectionHeader>Especificaciones</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {specs.map((s, i) => (
                <div key={i} style={{ border: '1px solid var(--sand)', padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: 8, marginBottom: 12 }}>
                    <input className="so" style={{ padding: '9px 12px', fontSize: 13 }}
                      placeholder="Título (ej: Dimensiones)"
                      value={s.titulo} onChange={e => setSpec(i, 'titulo', e.target.value)} />
                    <select className="so" style={{ padding: '9px 12px', fontSize: 13 }}
                      value={s.tipo} onChange={e => setSpec(i, 'tipo', e.target.value)}>
                      <option value="text">Texto libre</option>
                      <option value="table">Tabla clave/valor</option>
                    </select>
                    <button onClick={() => removeSpec(i)}
                      style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                  {s.tipo === 'text' ? (
                    <textarea className="so" style={{ width: '100%', padding: '9px 12px', minHeight: 72, resize: 'vertical', fontSize: 13 }}
                      placeholder="Descripción de materiales, acabados, etc."
                      value={typeof s.contenido === 'string' ? s.contenido : ''}
                      onChange={e => setSpec(i, 'contenido', e.target.value)} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(Array.isArray(s.contenido) ? s.contenido : []).map((row, ri) => (
                        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: 6 }}>
                          <input className="so" style={{ padding: '7px 10px', fontSize: 12 }}
                            placeholder="Clave" value={row[0] ?? ''} onChange={e => setTableRow(i, ri, 0, e.target.value)} />
                          <input className="so" style={{ padding: '7px 10px', fontSize: 12 }}
                            placeholder="Valor" value={row[1] ?? ''} onChange={e => setTableRow(i, ri, 1, e.target.value)} />
                          <button onClick={() => removeTableRow(i, ri)}
                            style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 16, cursor: 'pointer' }}>×</button>
                        </div>
                      ))}
                      <button onClick={() => addTableRow(i)}
                        style={{ alignSelf: 'flex-start', padding: '6px 14px', background: 'none', border: '1px dashed var(--sand)', cursor: 'pointer', fontSize: 10, letterSpacing: '.15em', color: 'var(--taupe)', marginTop: 2 }}>
                        + FILA
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addSpec}
                style={{ alignSelf: 'flex-start', padding: '8px 18px', background: 'none', border: '1px dashed var(--sand)', cursor: 'pointer', fontSize: 11, letterSpacing: '.15em', color: 'var(--taupe)' }}>
                + AÑADIR ESPECIFICACIÓN
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button className="bcot" style={{ width: 'auto', padding: '12px 28px', opacity: saving ? .6 : 1 }}
                onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
              </button>
              {editing && (
                <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
                  Cancelar
                </button>
              )}
            </div>
          </>
        )}

        {/* ── TAMAÑOS TAB ── */}
        {editing && activeTab === 'tamanos' && (
          <div style={{ background: '#fff', padding: 24 }}>
            <SectionHeader>Agregar Tamaño</SectionHeader>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <Label>Nombre</Label>
                <input className="so" style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  placeholder="ej: 2 Plazas"
                  value={tamanoForm.nombre}
                  onChange={e => setTamanoForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Dimensiones</Label>
                <input className="so" style={{ width: '100%', padding: '9px 12px', fontSize: 13 }}
                  placeholder="ej: 180 × 90 × 78 cm"
                  value={tamanoForm.dimensiones}
                  onChange={e => setTamanoForm(f => ({ ...f, dimensiones: e.target.value }))} />
              </div>
              <button className="bcot" style={{ width: 'auto', padding: '9px 20px', opacity: savingTamano ? .6 : 1 }}
                onClick={addTamano} disabled={savingTamano}>
                {savingTamano ? 'Agregando…' : 'Agregar tamaño'}
              </button>
            </div>

            <SectionHeader>Tamaños configurados</SectionHeader>
            {configuraciones.length === 0 ? (
              <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.05em' }}>
                No hay tamaños aún. Agrega el primero arriba.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {configuraciones.map(cfg => (
                  <div key={cfg.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 10, alignItems: 'center', padding: '12px 16px', border: '1px solid var(--sand)', background: cfg.activo ? '#fff' : '#faf9f7' }}>
                    <input
                      className="so"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      defaultValue={cfg.nombre}
                      onBlur={e => { if (e.target.value !== cfg.nombre) updateTamanoField(cfg.id, 'nombre', e.target.value) }}
                    />
                    <input
                      className="so"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      defaultValue={cfg.dimensiones ?? ''}
                      placeholder="Dimensiones"
                      onBlur={e => { if (e.target.value !== (cfg.dimensiones ?? '')) updateTamanoField(cfg.id, 'dimensiones', e.target.value) }}
                    />
                    <button
                      onClick={() => toggleTamanoActivo(cfg)}
                      style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--sand)', cursor: 'pointer', fontSize: 10, letterSpacing: '.1em', color: cfg.activo ? 'var(--charcoal)' : 'var(--taupe)', whiteSpace: 'nowrap' }}>
                      {cfg.activo ? 'Activo' : 'Inactivo'}
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--taupe)', whiteSpace: 'nowrap' }}>orden: {cfg.orden}</span>
                    <button onClick={() => deleteTamano(cfg.id)}
                      style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── PRECIOS TAB ── */}
        {editing && activeTab === 'precios' && (
          <div style={{ background: '#fff', padding: 24 }}>
            <SectionHeader>Matriz de Precios</SectionHeader>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 20px', letterSpacing: '.05em' }}>
              Guardar en cada celda al salir del campo
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
                        {GRADOS.map(g => (
                          <td key={g} style={{ padding: '6px 10px', borderBottom: '1px solid var(--sand)', textAlign: 'center' }}>
                            <PriceCell
                              initialValue={(priceMatrix[cfg.id] ?? {})[g] ?? ''}
                              onSave={val => savePriceCell(cfg.id, g, val)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── TELAS TAB ── */}
        {editing && activeTab === 'telas' && (
          <div style={{ background: '#fff', padding: 24 }}>
            <SectionHeader>Telas disponibles</SectionHeader>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 20px', letterSpacing: '.05em' }}>
              Si no seleccionas ninguna, todas las telas activas serán disponibles para este producto.
            </p>

            {allTelas.length === 0 ? (
              <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--taupe)', letterSpacing: '.05em' }}>
                No hay telas activas configuradas.
              </p>
            ) : (
              <>
                {GRADOS.map(g => {
                  const telas = telasGrouped[g]
                  if (!telas?.length) return null
                  return (
                    <div key={g} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span className="grado-pill">{g}</span>
                        <span style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--charcoal)' }}>
                          Grado {g}
                        </span>
                        <button type="button"
                          onClick={() => {
                            const allSelected = telas.every(t => selectedTelaIds.has(t.id))
                            setSelectedTelaIds(prev => {
                              const next = new Set(prev)
                              telas.forEach(t => allSelected ? next.delete(t.id) : next.add(t.id))
                              return next
                            })
                          }}
                          style={{ fontSize: 10, background: 'none', border: '1px solid var(--sand)', padding: '2px 10px', cursor: 'pointer', color: 'var(--taupe)', letterSpacing: '.1em' }}>
                          {telas.every(t => selectedTelaIds.has(t.id)) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {telas.map(t => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--charcoal)' }}>
                            <input type="checkbox"
                              checked={selectedTelaIds.has(t.id)}
                              onChange={() => setSelectedTelaIds(prev => {
                                const next = new Set(prev)
                                next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                                return next
                              })} />
                            {t.nombre}
                            {t.descripcion && (
                              <span style={{ fontSize: 10, color: 'var(--taupe)' }}>{t.descripcion}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {telasGrouped['Sin grado']?.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--charcoal)' }}>Sin grado</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {telasGrouped['Sin grado'].map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--charcoal)' }}>
                          <input type="checkbox"
                            checked={selectedTelaIds.has(t.id)}
                            onChange={() => setSelectedTelaIds(prev => {
                              const next = new Set(prev)
                              next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                              return next
                            })} />
                          {t.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button className="bcot" style={{ width: 'auto', padding: '12px 28px', opacity: savingTelas ? .6 : 1 }}
                onClick={saveTelasSelection} disabled={savingTelas}>
                {savingTelas ? 'Guardando…' : 'Guardar selección de telas'}
              </button>
              <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={reset}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LIST ── */}
      <div style={{ background: '#fff', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Imagen</TH><TH>Nombre</TH><TH>Categoría</TH><TH>Badge</TH><TH>Activo</TH><TH>Orden</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--taupe)', fontSize: 12 }}>
                  No hay productos aún
                </td>
              </tr>
            ) : productos.map(p => {
              const thumb = p.imagenes?.find(i => i.es_principal) ?? p.imagenes?.[0]
              return (
                <tr key={p.id}>
                  <TD>
                    {thumb
                      ? <img src={thumb.url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: 48, height: 48, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--taupe)' }}>—</div>
                    }
                  </TD>
                  <TD>
                    <strong style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>{p.nombre}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--taupe)' }}>{p.subtitulo}</span>
                  </TD>
                  <TD style={{ color: 'var(--taupe)' }}>{p.categoria?.nombre ?? '—'}</TD>
                  <TD style={{ color: 'var(--gold)' }}>{p.badge ?? '—'}</TD>
                  <TD>{p.activo ? '✓' : '—'}</TD>
                  <TD style={{ color: 'var(--taupe)' }}>{p.orden}</TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="la" onClick={() => edit(p)}>Editar</button>
                      <button className="la" style={{ borderColor: '#c0392b', color: '#c0392b' }}
                        onClick={() => del(p.id)}>Eliminar</button>
                    </div>
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
