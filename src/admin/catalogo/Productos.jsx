// src/admin/catalogo/Productos.jsx
import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NuevoProductoDrawer from './NuevoProductoDrawer'
import MedidaModal from './MedidaModal'
import { IsometricoPicker, GaleriaPicker, uploadProductoImage } from './ProductoImageUpload'

const ORIENTACION_SLUGS = ['escuadras-l', 'chaise-lounge']
const GRADOS = ['AA', 'A', 'B', 'C']

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TAB_PATHS = [
  { key: 'general', path: '/admin/productos', label: 'Información general' },
  { key: 'modelos', path: '/admin/productos/modelos', label: 'Modelos' },
  { key: 'medidas', path: '/admin/productos/medidas', label: 'Medidas por modelo' },
  { key: 'precios', path: '/admin/productos/precios', label: 'Precios' },
]

function Tabbar() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div className="adm-tabbar">
      {TAB_PATHS.map(t => (
        <button
          key={t.key}
          type="button"
          className={`adm-tab ${location.pathname === t.path ? 'adm-active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function PriceCell({ initialValue, onSave }) {
  const [val, setVal] = useState(initialValue)
  useEffect(() => { setVal(initialValue) }, [initialValue])
  return (
    <input
      className="adm-input"
      style={{ width: 100, textAlign: 'right' }}
      value={val}
      onChange={e => setVal(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={() => onSave(val)}
      placeholder="—"
    />
  )
}

function Modelos({ productos, categorias, configCounts, imageCounts, onEdit }) {
  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <div className="adm-card-title">Todos los modelos</div>
            <div className="adm-card-sub">Un modelo puede repetirse en distinto tipo (ej. Cubo en Sofás y en Escuadra).</div>
          </div>
        </div>
        <table className="adm-table">
          <thead>
            <tr><th></th><th>Modelo</th><th>Tipo</th><th># Medidas</th><th># Imágenes</th><th>Activo</th><th></th></tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr><td colSpan={7} className="adm-empty-note">No hay modelos aún</td></tr>
            ) : productos.map(p => (
              <tr key={p.id}>
                <td className="adm-drag">⠿</td>
                <td>{p.nombre}</td>
                <td>{categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</td>
                <td>{configCounts[p.id] ?? 0}</td>
                <td>{imageCounts[p.id] ?? 0}</td>
                <td>{p.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸ inactivo</span>}</td>
                <td className="adm-cell-actions">
                  <button type="button" className="adm-icon-btn" onClick={() => onEdit(p.id)}>✎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Medidas({ productos, categorias, selectedId, onSelectProducto }) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [preciosSet, setPreciosSet] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const producto = productos.find(p => p.id === selectedId) ?? null

  const load = async () => {
    if (!producto) { setConfiguraciones([]); setPreciosSet({}); return }
    const [cfgRes, precRes] = await Promise.all([
      supabase.from('producto_configuraciones').select('*').eq('producto_id', producto.id).order('orden'),
      supabase.from('producto_precios').select('configuracion_id, grado').eq('producto_id', producto.id),
    ])
    setConfiguraciones(cfgRes.data ?? [])
    const set = {}
    ;(precRes.data ?? []).forEach(r => {
      if (!set[r.configuracion_id]) set[r.configuracion_id] = new Set()
      set[r.configuracion_id].add(r.grado)
    })
    setPreciosSet(set)
  }

  useEffect(() => { load() }, [producto?.id])

  const toggleActivo = async (cfg) => {
    await supabase.from('producto_configuraciones').update({ activo: !cfg.activo }).eq('id', cfg.id)
    load()
  }

  const updateField = async (id, field, value) => {
    await supabase.from('producto_configuraciones').update({ [field]: value }).eq('id', id)
    load()
  }

  const isIncompleto = (cfg) => (preciosSet[cfg.id]?.size ?? 0) < 4

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => onSelectProducto(e.target.value)}>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>
          ))}
        </select>
      </div>

      {producto && (
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Medidas de: {producto.nombre} · {categorias.find(c => c.id === producto.categoria_id)?.nombre ?? '—'}</div>
              <div className="adm-card-sub">Cada medida puede tener su propia imagen isométrica.</div>
            </div>
            <button type="button" className="adm-btn-sm adm-dark" onClick={() => setModalOpen(true)}>+ Agregar medida</button>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Etiqueta</th><th>Dimensiones</th><th>Isométrico</th><th>Activo</th><th></th></tr>
            </thead>
            <tbody>
              {configuraciones.length === 0 ? (
                <tr><td colSpan={6} className="adm-empty-note">No hay medidas aún</td></tr>
              ) : configuraciones.map(cfg => (
                <tr key={cfg.id}>
                  <td className="adm-drag">⠿</td>
                  <td>
                    <input className="adm-input" defaultValue={cfg.nombre}
                      onBlur={e => { if (e.target.value !== cfg.nombre) updateField(cfg.id, 'nombre', e.target.value) }} />
                    {isIncompleto(cfg) && (
                      <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>⚠ incompleto — falta precio en algún grado</div>
                    )}
                  </td>
                  <td>
                    <input className="adm-input" defaultValue={cfg.dimensiones ?? ''}
                      onBlur={e => { if (e.target.value !== (cfg.dimensiones ?? '')) updateField(cfg.id, 'dimensiones', e.target.value) }} />
                  </td>
                  <td>
                    <div className="adm-img-thumb" style={{ width: 56, height: 44, background: cfg.isometrico_url ? `url(${cfg.isometrico_url})` : '#F3F4F6' }} />
                  </td>
                  <td>{cfg.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(cfg)}>{cfg.activo ? '⏸' : '▶'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MedidaModal open={modalOpen} producto={producto} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); load() }} />
    </div>
  )
}

function Precios({ productos, categorias, selectedId, onSelectProducto }) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [matrix, setMatrix] = useState({})
  const producto = productos.find(p => p.id === selectedId) ?? null

  const load = async () => {
    if (!producto) { setConfiguraciones([]); setMatrix({}); return }
    const [cfgRes, precRes] = await Promise.all([
      supabase.from('producto_configuraciones').select('*').eq('producto_id', producto.id).eq('activo', true).order('orden'),
      supabase.from('producto_precios').select('configuracion_id, grado, precio').eq('producto_id', producto.id),
    ])
    setConfiguraciones(cfgRes.data ?? [])
    const m = {}
    ;(precRes.data ?? []).forEach(r => {
      if (!m[r.configuracion_id]) m[r.configuracion_id] = {}
      m[r.configuracion_id][r.grado] = String(r.precio)
    })
    setMatrix(m)
  }

  useEffect(() => { load() }, [producto?.id])

  const saveCell = async (configuracionId, grado, value) => {
    try {
      const trimmed = value.trim()
      if (trimmed === '') {
        await supabase.from('producto_precios').delete()
          .eq('producto_id', producto.id).eq('configuracion_id', configuracionId).eq('grado', grado)
      } else {
        const precio = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
        if (isNaN(precio)) return
        await supabase.from('producto_precios').upsert(
          { producto_id: producto.id, configuracion_id: configuracionId, grado, precio },
          { onConflict: 'producto_id,configuracion_id,grado' }
        )
      }
      load()
    } catch (err) {
      alert(`Error al guardar precio: ${err.message}`)
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => onSelectProducto(e.target.value)}>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>
          ))}
        </select>
      </div>

      {producto && (
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <div className="adm-card-title">Matriz de precios: {producto.nombre} · {categorias.find(c => c.id === producto.categoria_id)?.nombre ?? '—'}</div>
              <div className="adm-card-sub">Precio mayoreo MXN, IVA incluido. Un valor por Medida × Grado de tela. Guarda al salir de cada celda.</div>
            </div>
          </div>
          {configuraciones.length === 0 ? (
            <div className="adm-empty-note">Este producto no tiene medidas activas — agrégalas en la pestaña Medidas.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Medida</th>{GRADOS.map(g => <th key={g}>Grado {g}</th>)}</tr>
              </thead>
              <tbody>
                {configuraciones.map(cfg => (
                  <tr key={cfg.id}>
                    <td>{cfg.nombre}</td>
                    {GRADOS.map(g => (
                      <td key={g}>
                        <PriceCell
                          initialValue={matrix[cfg.id]?.[g] ?? ''}
                          onSave={val => saveCell(cfg.id, g, val)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function InformacionGeneral({ productos, categorias, selectedId, onSelectProducto, onProductoSaved }) {
  const producto = productos.find(p => p.id === selectedId) ?? null

  const [form, setForm] = useState({ nombre: '', categoria_id: '', orden: 0, descripcion: '', activo: true })
  const [specs, setSpecs] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [saving, setSaving] = useState(false)

  const [imagenes, setImagenes] = useState([])
  const [isoFile, setIsoFile] = useState(null)
  const [isoPreview, setIsoPreview] = useState(null)
  const [pendingImages, setPendingImages] = useState([])

  useEffect(() => {
    if (!producto) return
    setForm({
      nombre: producto.nombre ?? '',
      categoria_id: producto.categoria_id ?? '',
      orden: producto.orden ?? 0,
      descripcion: producto.descripcion ?? '',
      activo: producto.activo ?? true,
    })
    setIsoFile(null)
    setIsoPreview(null)
    setPendingImages([])
    async function loadDetail() {
      const [specsRes, orientRes, imgRes] = await Promise.all([
        supabase.from('producto_specs').select('*').eq('producto_id', producto.id).order('orden'),
        supabase.from('producto_orientaciones').select('*').eq('producto_id', producto.id).order('orden'),
        supabase.from('producto_imagenes').select('*').eq('producto_id', producto.id).order('orden'),
      ])
      setSpecs((specsRes.data ?? []).map(s => ({ id: s.id, titulo: s.titulo, contenido: typeof s.contenido === 'string' ? s.contenido : '' })))
      setOrientaciones((orientRes.data ?? []).map(o => ({ id: o.id, nombre: o.nombre })))
      setImagenes(imgRes.data ?? [])
    }
    loadDetail()
  }, [producto?.id])

  if (!producto) {
    return <div className="adm-content"><div className="adm-empty-note">Selecciona o crea un producto para editar su información.</div></div>
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const categoriaActual = categorias.find(c => c.id === form.categoria_id)
  const needsOrientaciones = ORIENTACION_SLUGS.includes(categoriaActual?.slug)

  const addSpec = () => setSpecs(s => [...s, { id: null, titulo: '', contenido: '' }])
  const setSpecField = (i, k, v) => setSpecs(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeSpec = (i) => setSpecs(s => s.filter((_, idx) => idx !== i))

  const addOrientacion = () => setOrientaciones(o => [...o, { id: null, nombre: '' }])
  const setOrientacionField = (i, v) => setOrientaciones(o => o.map((x, idx) => idx === i ? { ...x, nombre: v } : x))
  const removeOrientacion = (i) => setOrientaciones(o => o.filter((_, idx) => idx !== i))

  const reloadImagenes = async () => {
    const { data } = await supabase.from('producto_imagenes').select('*').eq('producto_id', producto.id).order('orden')
    setImagenes(data ?? [])
  }

  const onIsoSelected = (file) => { setIsoFile(file); setIsoPreview(URL.createObjectURL(file)) }

  const onFilesAdded = (files) => {
    const items = files.map(file => ({ localId: Math.random().toString(36).slice(2), file, previewUrl: URL.createObjectURL(file) }))
    setPendingImages(prev => [...prev, ...items])
  }
  const onRemovePending = (localId) => setPendingImages(prev => prev.filter(p => p.localId !== localId))
  const onRemoveExisting = async (img) => {
    await supabase.from('producto_imagenes').delete().eq('id', img.id)
    reloadImagenes()
  }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      await supabase.from('productos').update({
        nombre: form.nombre,
        categoria_id: form.categoria_id || null,
        orden: parseInt(form.orden) || 0,
        descripcion: form.descripcion,
        activo: form.activo,
      }).eq('id', producto.id)

      if (isoFile) {
        const ext = isoFile.name.split('.').pop().toLowerCase()
        const url = await uploadProductoImage(isoFile, `productos/iso-${producto.id}-${Date.now()}.${ext}`)
        await supabase.from('productos').update({ isometrico_url: url }).eq('id', producto.id)
        setIsoFile(null)
        setIsoPreview(null)
      }

      if (pendingImages.length > 0) {
        const startOrden = imagenes.length
        for (let i = 0; i < pendingImages.length; i++) {
          const item = pendingImages[i]
          const ext = item.file.name.split('.').pop().toLowerCase()
          const path = `productos/${producto.id}/${Date.now()}-${i}.${ext}`
          const url = await uploadProductoImage(item.file, path)
          await supabase.from('producto_imagenes').insert({
            producto_id: producto.id,
            url,
            alt: item.file.name.replace(/\.[^.]+$/, ''),
            orden: startOrden + i,
            es_principal: imagenes.length === 0 && i === 0,
          })
        }
        setPendingImages([])
        await reloadImagenes()
      }

      await supabase.from('producto_specs').delete().eq('producto_id', producto.id)
      const validSpecs = specs.filter(s => s.titulo.trim())
      if (validSpecs.length > 0) {
        await supabase.from('producto_specs').insert(
          validSpecs.map((s, i) => ({ producto_id: producto.id, titulo: s.titulo, tipo: 'texto', contenido: s.contenido, orden: i }))
        )
      }

      await supabase.from('producto_orientaciones').delete().eq('producto_id', producto.id)
      const validOrient = orientaciones.filter(o => o.nombre.trim())
      if (validOrient.length > 0) {
        await supabase.from('producto_orientaciones').insert(
          validOrient.map((o, i) => ({ producto_id: producto.id, nombre: o.nombre, orden: i }))
        )
      }

      onProductoSaved()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-empty-note" style={{ marginBottom: 16 }}>
        Editando: <b style={{ color: '#111827' }}>{producto.nombre} · {categoriaActual?.nombre ?? '—'}</b>
        &nbsp;·&nbsp;
        <select
          className="adm-select"
          style={{ minWidth: 'auto', fontSize: 12.5, padding: '2px 6px', border: 'none', color: '#2563EB', background: 'none' }}
          value={producto.id}
          onChange={e => onSelectProducto(e.target.value)}
        >
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>)}
        </select>
      </div>

      <div className="adm-grid-2">
        <div>
          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 16 }}>Datos del producto</div>
            <div className="adm-field">
              <label className="adm-label">Nombre del modelo</label>
              <input className="adm-input" style={{ width: '100%' }} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label className="adm-label">Tipo (categoría)</label>
                <select className="adm-select" style={{ width: '100%' }} value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Orden de aparición</label>
                <input className="adm-input" type="number" style={{ width: '100%' }} value={form.orden} onChange={e => set('orden', e.target.value)} />
              </div>
            </div>
            <div className="adm-field">
              <label className="adm-label">Descripción</label>
              <textarea className="adm-textarea" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div className="adm-toggle-row">
              <div>
                <div className="adm-toggle-label">Producto activo</div>
                <div className="adm-toggle-desc">Visible en Colecciones y en el configurador</div>
              </div>
              <button type="button" className={`adm-switch ${form.activo ? '' : 'adm-off'}`} onClick={() => set('activo', !form.activo)} />
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 4 }}>Especificaciones técnicas</div>
            <div className="adm-card-sub">Ficha técnica libre — aparece en el configurador si se agrega.</div>
            <table className="adm-table">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i}>
                    <td style={{ width: '40%' }}>
                      <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Estructura" value={s.titulo} onChange={e => setSpecField(i, 'titulo', e.target.value)} />
                    </td>
                    <td>
                      <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Madera de pino tratada" value={s.contenido} onChange={e => setSpecField(i, 'contenido', e.target.value)} />
                    </td>
                    <td className="adm-cell-actions">
                      <button type="button" className="adm-icon-btn" onClick={() => removeSpec(i)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="adm-btn-sm" style={{ marginTop: 14 }} onClick={addSpec}>+ Agregar especificación</button>
          </div>
        </div>

        <div>
          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 4 }}>Imagen principal</div>
            <div className="adm-card-sub">Se usa en tarjetas de Colecciones y carousel del configurador.</div>
            <IsometricoPicker
              currentUrl={producto.isometrico_url}
              pendingFile={isoFile}
              pendingPreviewUrl={isoPreview}
              onFileSelected={onIsoSelected}
            />
          </div>

          <div className="adm-card">
            <div className="adm-card-header">
              <div className="adm-card-title">Galería de imágenes</div>
            </div>
            <div className="adm-card-sub">Aparecen como thumbnails debajo del carousel. Se suben al guardar.</div>
            <GaleriaPicker
              existingImages={imagenes}
              pendingImages={pendingImages}
              onFilesAdded={onFilesAdded}
              onRemovePending={onRemovePending}
              onRemoveExisting={onRemoveExisting}
            />
          </div>

          {needsOrientaciones && (
            <div className="adm-card">
              <div className="adm-card-title" style={{ marginBottom: 4 }}>Orientaciones</div>
              <div className="adm-card-sub">Aplica a Escuadra y Chaise Lounge (izquierda/derecha). Orientación no afecta precio.</div>
              <table className="adm-table">
                <tbody>
                  {orientaciones.map((o, i) => (
                    <tr key={i}>
                      <td><input className="adm-input" style={{ width: '100%' }} value={o.nombre} onChange={e => setOrientacionField(i, e.target.value)} /></td>
                      <td className="adm-cell-actions">
                        <button type="button" className="adm-icon-btn" onClick={() => removeOrientacion(i)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="adm-btn-sm" style={{ marginTop: 14 }} onClick={addOrientacion}>+ Agregar orientación</button>
              <div className="adm-form-hint" style={{ marginTop: 10 }}>Solo aparece este campo si el Tipo del producto es Escuadra o Chaise Lounge.</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [configCounts, setConfigCounts] = useState({})
  const [imageCounts, setImageCounts] = useState({})
  const navigate = useNavigate()

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*').order('orden'),
      supabase.from('categorias').select('*').eq('activo', true).order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
    setSelectedId(prev => prev ?? (p.data ?? [])[0]?.id ?? null)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    async function loadCounts() {
      const [cfgRes, imgRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('producto_id'),
        supabase.from('producto_imagenes').select('producto_id'),
      ])
      const cfgMap = {}
      ;(cfgRes.data ?? []).forEach(r => { cfgMap[r.producto_id] = (cfgMap[r.producto_id] ?? 0) + 1 })
      setConfigCounts(cfgMap)
      const imgMap = {}
      ;(imgRes.data ?? []).forEach(r => { imgMap[r.producto_id] = (imgMap[r.producto_id] ?? 0) + 1 })
      setImageCounts(imgMap)
    }
    loadCounts()
  }, [productos])

  const handleCreated = (nuevo) => {
    setDrawerOpen(false)
    setSelectedId(nuevo.id)
    load()
    navigate('/admin/productos')
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Productos</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Productos</b></div>
        </div>
        <div className="adm-topbar-actions">
          <button type="button" className="adm-btn adm-btn-dark" onClick={() => setDrawerOpen(true)}>+ Nuevo producto</button>
        </div>
      </div>

      <Tabbar />

      <Routes>
        <Route
          index
          element={
            <InformacionGeneral
              productos={productos}
              categorias={categorias}
              selectedId={selectedId}
              onSelectProducto={setSelectedId}
              onProductoSaved={load}
            />
          }
        />
        <Route
          path="modelos"
          element={
            <Modelos
              productos={productos}
              categorias={categorias}
              configCounts={configCounts}
              imageCounts={imageCounts}
              onEdit={(id) => { setSelectedId(id); navigate('/admin/productos') }}
            />
          }
        />
        <Route
          path="medidas"
          element={<Medidas productos={productos} categorias={categorias} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
        <Route
          path="precios"
          element={<Precios productos={productos} categorias={categorias} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
      </Routes>

      <NuevoProductoDrawer
        open={drawerOpen}
        categorias={categorias}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
