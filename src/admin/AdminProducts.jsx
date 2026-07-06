import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'

const EMPTY_FORM = {
  nombre: '', slug: '', subtitulo: '', descripcion: '',
  precio_base: '', badge: '', categoria_id: '', activo: true, orden: 0,
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

export default function AdminProducts() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [allTextiles, setAllTextiles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [existingImages, setExistingImages] = useState([])
  const [configs, setConfigs] = useState([])
  const [specs, setSpecs] = useState([])
  const [gradoPrecio, setGradoPrecio] = useState({ AA: '', A: '', B: '', C: '' })
  const [selectedTextileIds, setSelectedTextileIds] = useState(new Set())
  const [orientaciones, setOrientaciones] = useState([])
  const [isoFile, setIsoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const imgRef = useRef()
  const isoRef = useRef()

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos')
        .select('*, categoria:categorias(id,nombre), imagenes:producto_imagenes(id,url,es_principal)')
        .order('orden'),
      supabase.from('categorias').select('*').order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
  }

  useEffect(() => {
    load()
    supabase.from('textiles').select('id, nombre, categoria, grado').eq('activo', true).order('categoria').order('orden')
      .then(({ data }) => setAllTextiles(data ?? []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setExistingImages([])
    setConfigs([])
    setSpecs([])
    setGradoPrecio({ AA: '', A: '', B: '', C: '' })
    setSelectedTextileIds(new Set())
    setOrientaciones([])
    setIsoFile(null)
  }

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

      // 2. Upload product-level isometric
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

      // 4. Base price → producto_precios
      if (form.precio_base !== '') {
        await supabase.from('producto_precios').upsert(
          { producto_id: productId, precio: parseFloat(form.precio_base) },
          { onConflict: 'producto_id' }
        )
      }

      // 4b. Grade prices → producto_grado_precios
      await supabase.from('producto_grado_precios').delete().eq('producto_id', productId)
      const gradoRows = GRADOS
        .filter(g => gradoPrecio[g] !== '')
        .map(g => ({ producto_id: productId, grado: g, precio_extra: parseFloat(gradoPrecio[g]) || 0 }))
      if (gradoRows.length > 0) {
        await supabase.from('producto_grado_precios').insert(gradoRows)
      }

      // 5. Configurations: delete → re-insert with per-config isometric uploads
      await supabase.from('producto_configuraciones').delete().eq('producto_id', productId)
      const validConfigs = configs.filter(c => c.nombre.trim())
      if (validConfigs.length > 0) {
        // Upload per-config isometrics first
        const configsWithUrls = await Promise.all(
          validConfigs.map(async (c, i) => {
            let isometrico_url = c.isometrico_url || null
            if (c.isometrico_file) {
              const ext = c.isometrico_file.name.split('.').pop().toLowerCase()
              const path = `productos/${productId}/cfg-iso-${i}-${Date.now()}.${ext}`
              const { error: isoErr } = await supabase.storage.from('maison').upload(path, c.isometrico_file, { upsert: true })
              if (!isoErr) {
                const { data: isoData } = supabase.storage.from('maison').getPublicUrl(path)
                isometrico_url = isoData.publicUrl
              }
            }
            return { ...c, isometrico_url }
          })
        )

        const { data: insertedConfigs, error: cfgErr } = await supabase
          .from('producto_configuraciones')
          .insert(configsWithUrls.map((c, i) => ({
            producto_id: productId,
            nombre: c.nombre,
            orden: i,
            isometrico_url: c.isometrico_url || null,
          })))
          .select()
        if (cfgErr) throw cfgErr

        // Config prices → producto_config_precios
        if (insertedConfigs?.length > 0) {
          await supabase.from('producto_config_precios').insert(
            insertedConfigs.map((cfg, i) => ({
              config_id: cfg.id,
              precio_extra: parseFloat(configsWithUrls[i].precio_extra) || 0,
            }))
          )
        }
      }

      // 6. Specs: delete → re-insert
      await supabase.from('producto_specs').delete().eq('producto_id', productId)
      if (specs.length > 0) {
        await supabase.from('producto_specs').insert(
          specs.filter(s => s.titulo.trim()).map((s, i) => ({
            producto_id: productId, titulo: s.titulo, tipo: s.tipo, contenido: s.contenido, orden: i,
          }))
        )
      }

      // 7. Fabric assignment → producto_textiles
      await supabase.from('producto_textiles').delete().eq('producto_id', productId)
      if (selectedTextileIds.size > 0) {
        await supabase.from('producto_textiles').insert(
          [...selectedTextileIds].map(textil_id => ({ producto_id: productId, textil_id }))
        )
      }

      // 8. Orientations → producto_orientaciones
      await supabase.from('producto_orientaciones').delete().eq('producto_id', productId)
      const validOrient = orientaciones.filter(o => o.nombre.trim())
      if (validOrient.length > 0) {
        await supabase.from('producto_orientaciones').insert(
          validOrient.map((o, i) => ({ producto_id: productId, nombre: o.nombre, orden: i }))
        )
      }

      reset()
      load()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este producto y todos sus datos?')) return
    await Promise.all([
      supabase.from('producto_imagenes').delete().eq('producto_id', id),
      supabase.from('producto_configuraciones').delete().eq('producto_id', id),
      supabase.from('producto_specs').delete().eq('producto_id', id),
      supabase.from('producto_precios').delete().eq('producto_id', id),
      supabase.from('producto_grado_precios').delete().eq('producto_id', id),
      supabase.from('producto_textiles').delete().eq('producto_id', id),
      supabase.from('producto_orientaciones').delete().eq('producto_id', id),
    ])
    await supabase.from('productos').delete().eq('id', id)
    load()
  }

  const edit = async (p) => {
    setEditing(p.id)
    setForm({
      nombre: p.nombre ?? '',
      slug: p.slug ?? '',
      subtitulo: p.subtitulo ?? '',
      descripcion: p.descripcion ?? '',
      precio_base: '',
      badge: p.badge ?? '',
      categoria_id: p.categoria_id ?? '',
      activo: p.activo ?? true,
      orden: p.orden ?? 0,
      isometrico_url: p.isometrico_url ?? '',
    })

    const [imgs, cfgs, sps, precioRes, gradoRes, textilesRes, orientRes] = await Promise.all([
      supabase.from('producto_imagenes').select('*').eq('producto_id', p.id).order('orden'),
      supabase.from('producto_configuraciones').select('*').eq('producto_id', p.id).order('orden'),
      supabase.from('producto_specs').select('*').eq('producto_id', p.id).order('orden'),
      supabase.from('producto_precios').select('precio').eq('producto_id', p.id).single(),
      supabase.from('producto_grado_precios').select('grado, precio_extra').eq('producto_id', p.id),
      supabase.from('producto_textiles').select('textil_id').eq('producto_id', p.id),
      supabase.from('producto_orientaciones').select('*').eq('producto_id', p.id).order('orden'),
    ])

    setExistingImages(imgs.data ?? [])
    setConfigs((cfgs.data ?? []).map(c => ({
      nombre: c.nombre ?? '',
      precio_extra: '0',
      isometrico_url: c.isometrico_url ?? '',
      isometrico_file: null,
    })))
    setSpecs((sps.data ?? []).map(s => ({ titulo: s.titulo ?? '', tipo: s.tipo ?? 'text', contenido: s.contenido ?? '' })))

    if (precioRes.data?.precio != null) {
      set('precio_base', String(precioRes.data.precio))
    }

    const gp = { AA: '', A: '', B: '', C: '' }
    ;(gradoRes.data ?? []).forEach(g => { gp[g.grado] = String(g.precio_extra ?? 0) })
    setGradoPrecio(gp)

    setSelectedTextileIds(new Set((textilesRes.data ?? []).map(t => t.textil_id)))
    setOrientaciones((orientRes.data ?? []).map(o => ({ nombre: o.nombre ?? '' })))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Configuraciones helpers ──
  const addConfig = () => setConfigs(c => [...c, { nombre: '', precio_extra: '0', isometrico_url: '', isometrico_file: null }])
  const setConfig = (i, k, v) => setConfigs(c => c.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeConfig = (i) => setConfigs(c => c.filter((_, idx) => idx !== i))

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

  // ── Textiles grouped by category ──
  const textilesGrouped = allTextiles.reduce((acc, t) => {
    const cat = t.categoria ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 38, color: 'var(--ink)', marginBottom: 40 }}>Productos</h1>

      {/* ── FORM ── */}
      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 0, color: 'var(--charcoal)' }}>
          {editing ? 'Editar producto' : 'Nuevo producto'}
        </h3>

        {/* Basic fields */}
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
            <Label>Precio base (MXN)</Label>
            <input className="so" style={{ width: '100%', padding: '10px 14px' }} type="number"
              placeholder="ej: 38000"
              value={form.precio_base} onChange={e => set('precio_base', e.target.value)} />
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

        {/* Isometric — product level */}
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

        {/* Configurations */}
        <SectionHeader>Configuraciones</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {configs.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto 32px', gap: 8, alignItems: 'center' }}>
              <input className="so" style={{ padding: '9px 12px', fontSize: 13 }}
                placeholder="Nombre (ej: 2 Plazas)"
                value={c.nombre} onChange={e => setConfig(i, 'nombre', e.target.value)} />
              <input className="so" style={{ padding: '9px 12px', fontSize: 13 }}
                placeholder="Precio extra MXN" type="number"
                value={c.precio_extra} onChange={e => setConfig(i, 'precio_extra', e.target.value)} />
              <label style={{ fontSize: 10, color: 'var(--taupe)', letterSpacing: '.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <span>ISO</span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files[0] ?? null
                    setConfig(i, 'isometrico_file', file)
                    e.target.value = ''
                  }} />
                {c.isometrico_file
                  ? <span style={{ color: 'var(--charcoal)' }}>✓ {c.isometrico_file.name}</span>
                  : c.isometrico_url
                    ? <img src={c.isometrico_url} alt="iso" style={{ width: 28, height: 28, objectFit: 'contain', border: '1px solid var(--sand)' }} />
                    : <span style={{ borderBottom: '1px dashed var(--sand)', color: 'var(--taupe)' }}>Subir</span>
                }
              </label>
              <button onClick={() => removeConfig(i)}
                style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button onClick={addConfig}
            style={{ alignSelf: 'flex-start', marginTop: 4, padding: '8px 18px', background: 'none', border: '1px dashed var(--sand)', cursor: 'pointer', fontSize: 11, letterSpacing: '.15em', color: 'var(--taupe)' }}>
            + AÑADIR CONFIGURACIÓN
          </button>
        </div>

        {/* Grade prices */}
        <SectionHeader>Precio por grado de tela</SectionHeader>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 14px', letterSpacing: '.05em' }}>
          Extra sobre el precio base según el grado de la tela seleccionada. Dejar vacío si no aplica.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {GRADOS.map(g => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '.1em', color: 'var(--taupe)', width: 28, flexShrink: 0 }}>{g}</span>
              <input className="so" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
                type="number" placeholder="Extra MXN (0 = incluido)"
                value={gradoPrecio[g]}
                onChange={e => setGradoPrecio(gp => ({ ...gp, [g]: e.target.value }))} />
            </div>
          ))}
        </div>

        {/* Fabric assignment */}
        <SectionHeader>Telas disponibles</SectionHeader>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--taupe)', margin: '0 0 16px', letterSpacing: '.05em' }}>
          Si no seleccionas ninguna, el producto mostrará todas las telas activas.
        </p>
        {Object.entries(textilesGrouped).map(([cat, tels]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--charcoal)' }}>{cat}</span>
              <button type="button"
                onClick={() => {
                  const allSelected = tels.every(t => selectedTextileIds.has(t.id))
                  setSelectedTextileIds(prev => {
                    const next = new Set(prev)
                    tels.forEach(t => allSelected ? next.delete(t.id) : next.add(t.id))
                    return next
                  })
                }}
                style={{ fontSize: 10, background: 'none', border: '1px solid var(--sand)', padding: '2px 10px', cursor: 'pointer', color: 'var(--taupe)', letterSpacing: '.1em' }}>
                {tels.every(t => selectedTextileIds.has(t.id)) ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {tels.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--charcoal)' }}>
                  <input type="checkbox"
                    checked={selectedTextileIds.has(t.id)}
                    onChange={() => setSelectedTextileIds(prev => {
                      const next = new Set(prev)
                      next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                      return next
                    })} />
                  {t.nombre}
                  {t.grado && <span style={{ fontSize: 10, color: 'var(--taupe)' }}>({t.grado})</span>}
                </label>
              ))}
            </div>
          </div>
        ))}

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
