// src/admin/catalogo/AdminProducts.jsx
//
// Página única "Productos" con 7 pestañas, calcando brendell-admin-mockup.html:
// Información general / Modelos / Medidas por modelo / Precios / Telas y categorías /
// Colecciones / Colores. No hay pantalla separada de "Categorías" — se crean in-line
// desde el selector de Tipo (categoría) del producto, igual que las categorías de tela
// (tela_grados) se crean in-line desde la pestaña "Telas y categorías".
import { useEffect, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import NuevoProductoDrawer from './NuevoProductoDrawer'
import MedidaModal from './MedidaModal'
import { IsometricoPicker, GaleriaPicker, uploadProductoImage } from './ProductoImageUpload'

const ORIENTACION_SLUGS = ['escuadras-l', 'chaise-lounge']
const BUCKET_TELAS = 'telas'

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// SVG en vez del emoji de bote de basura — ese emoji no se renderiza en algunos
// navegadores/sistemas (queda invisible), así que el botón de eliminar "desaparecía".
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

const TAB_PATHS = [
  { key: 'general', path: '/admin/productos', label: 'Información general' },
  { key: 'modelos', path: '/admin/productos/modelos', label: 'Modelos' },
  { key: 'medidas', path: '/admin/productos/medidas', label: 'Medidas por modelo' },
  { key: 'precios', path: '/admin/productos/precios', label: 'Precios' },
  { key: 'telas', path: '/admin/productos/telas', label: 'Telas y categorías' },
  { key: 'colecciones', path: '/admin/productos/colecciones', label: 'Colecciones' },
  { key: 'colores', path: '/admin/productos/colores', label: 'Colores' },
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

// ---------- Gestionar categorías (renombrar / activar-desactivar, sin salir de Productos) ----------
function GestionCategoriasModal({ open, categorias, onClose, onChanged }) {
  if (!open) return null
  const toggleActivo = async (row) => {
    await supabase.from('categorias').update({ activo: !row.activo }).eq('id', row.id)
    onChanged()
  }
  const rename = async (row, nombre) => {
    if (!nombre.trim() || nombre === row.nombre) return
    await supabase.from('categorias').update({ nombre }).eq('id', row.id)
    onChanged()
  }
  return (
    <div className="adm-modal-overlay adm-open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-modal-box">
        <div className="adm-modal-header">
          <div className="adm-modal-title">Gestionar categorías</div>
          <button type="button" className="adm-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-body">
          <table className="adm-table">
            <thead><tr><th>Nombre</th><th>Activa</th><th></th></tr></thead>
            <tbody>
              {categorias.length === 0 ? (
                <tr><td colSpan={3} className="adm-empty-note">No hay categorías aún</td></tr>
              ) : categorias.map(c => (
                <tr key={c.id}>
                  <td>
                    <input className="adm-input" style={{ width: '100%' }} defaultValue={c.nombre}
                      onBlur={e => rename(c, e.target.value)} />
                  </td>
                  <td>{c.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                  <td className="adm-cell-actions">
                    <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(c)}>{c.activo ? '⏸' : '▶'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn adm-btn-dark" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ---------- TAB: Modelos ----------
function Modelos({ productos, categorias, configCounts, imageCounts, onEdit, onDelete }) {
  const eliminar = async (p) => {
    const detalle = []
    if (configCounts[p.id]) detalle.push(`${configCounts[p.id]} medida(s)`)
    if (imageCounts[p.id]) detalle.push(`${imageCounts[p.id]} imagen(es)`)
    const aviso = detalle.length
      ? `"${p.nombre}" tiene ${detalle.join(' y ')} asociadas — también se borrarán. `
      : ''
    if (!confirm(`${aviso}¿Eliminar "${p.nombre}" definitivamente? Si prefieres solo ocultarlo del sitio, mejor desactívalo desde Información general.`)) return
    try {
      await supabase.from('producto_precios').delete().eq('producto_id', p.id)
      await supabase.from('producto_imagenes').delete().eq('producto_id', p.id)
      await supabase.from('producto_configuraciones').delete().eq('producto_id', p.id)
      const { error } = await supabase.from('productos').delete().eq('id', p.id)
      if (error) throw error
      onDelete()
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
    }
  }
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
                  <button type="button" className="adm-icon-btn" onClick={() => eliminar(p)}><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- TAB: Medidas por modelo ----------
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

  const eliminarMedida = async (cfg) => {
    if (!confirm(`¿Eliminar la medida "${cfg.nombre}"? También se borran sus precios asociados.`)) return
    try {
      await supabase.from('producto_precios').delete().eq('configuracion_id', cfg.id)
      const { error } = await supabase.from('producto_configuraciones').delete().eq('id', cfg.id)
      if (error) throw error
      load()
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
    }
  }

  const isIncompleto = (cfg) => (preciosSet[cfg.id]?.size ?? 0) < 4

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => onSelectProducto(e.target.value)}>
          <option value="">Selecciona un producto…</option>
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
                    <button type="button" className="adm-icon-btn" onClick={() => eliminarMedida(cfg)}><TrashIcon /></button>
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

// ---------- TAB: Información general ----------
function InformacionGeneral({ productos, categorias, selectedId, onSelectProducto, onProductoSaved, onCreateCategoria, onManageCategorias }) {
  const producto = productos.find(p => p.id === selectedId) ?? null

  const [form, setForm] = useState({ nombre: '', categoria_id: '', orden: 0, descripcion: '', activo: true })
  const [specs, setSpecs] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [saving, setSaving] = useState(false)

  const [imagenes, setImagenes] = useState([])
  const [isoFile, setIsoFile] = useState(null)
  const [isoPreview, setIsoPreview] = useState(null)
  const [pendingImages, setPendingImages] = useState([])

  const [creatingCategoria, setCreatingCategoria] = useState(false)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('')

  // Recarga el formulario con los últimos datos guardados de este producto —
  // se usa al seleccionar/cambiar de producto y también en "Limpiar formulario"
  // (descarta cualquier cambio sin guardar, sin borrar el producto).
  const resetForm = async () => {
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
    setCreatingCategoria(false)
    const [specsRes, orientRes, imgRes] = await Promise.all([
      supabase.from('producto_specs').select('*').eq('producto_id', producto.id).order('orden'),
      supabase.from('producto_orientaciones').select('*').eq('producto_id', producto.id).order('orden'),
      supabase.from('producto_imagenes').select('*').eq('producto_id', producto.id).order('orden'),
    ])
    setSpecs((specsRes.data ?? []).map(s => ({ id: s.id, titulo: s.titulo, contenido: typeof s.contenido === 'string' ? s.contenido : '' })))
    setOrientaciones((orientRes.data ?? []).map(o => ({ id: o.id, nombre: o.nombre })))
    setImagenes(imgRes.data ?? [])
  }

  useEffect(() => { resetForm() }, [producto?.id])

  // Vacía los campos en pantalla (nombre, descripción, specs, orientaciones,
  // imágenes pendientes) sin tocar la base de datos. Solo se guarda si después
  // le dan a "Guardar cambios" — por eso la confirmación lo advierte.
  const limpiarFormulario = () => {
    setForm(f => ({ ...f, nombre: '', descripcion: '' }))
    setSpecs([])
    setOrientaciones([])
    setIsoFile(null)
    setIsoPreview(null)
    setPendingImages([])
    setCreatingCategoria(false)
  }

  if (!producto) {
    return (
      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-title" style={{ marginBottom: 4 }}>¿Qué quieres editar?</div>
          <div className="adm-card-sub" style={{ marginBottom: 14 }}>
            Elige un producto existente, o usa "+ Nuevo producto" arriba a la derecha para crear uno desde cero.
          </div>
          <select
            className="adm-select" style={{ width: 320 }} value=""
            onChange={e => { if (e.target.value) onSelectProducto(e.target.value) }}
          >
            <option value="">Selecciona un producto…</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} · {categorias.find(c => c.id === p.categoria_id)?.nombre ?? '—'}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const categoriaActual = categorias.find(c => c.id === form.categoria_id)
  const needsOrientaciones = ORIENTACION_SLUGS.includes(categoriaActual?.slug)

  const confirmNuevaCategoria = async () => {
    const nombre = nuevaCategoriaNombre.trim()
    if (!nombre) { setCreatingCategoria(false); return }
    const id = await onCreateCategoria(nombre)
    if (id) set('categoria_id', id)
    setCreatingCategoria(false)
    setNuevaCategoriaNombre('')
  }

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

  const eliminarProducto = async () => {
    if (!confirm(`¿Eliminar "${producto.nombre}" definitivamente? Se borran también sus medidas, precios, imágenes, specs y orientaciones. Si prefieres solo ocultarlo, mejor apaga "Producto activo" y guarda.`)) return
    setSaving(true)
    try {
      await supabase.from('producto_precios').delete().eq('producto_id', producto.id)
      await supabase.from('producto_imagenes').delete().eq('producto_id', producto.id)
      await supabase.from('producto_configuraciones').delete().eq('producto_id', producto.id)
      await supabase.from('producto_specs').delete().eq('producto_id', producto.id)
      await supabase.from('producto_orientaciones').delete().eq('producto_id', producto.id)
      const { error } = await supabase.from('productos').delete().eq('id', producto.id)
      if (error) throw error
      onProductoSaved()
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
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
                {creatingCategoria ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="adm-input" style={{ flex: 1 }} autoFocus
                      placeholder="Nombre de la nueva categoría"
                      value={nuevaCategoriaNombre}
                      onChange={e => setNuevaCategoriaNombre(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmNuevaCategoria() }}
                    />
                    <button type="button" className="adm-icon-btn" onClick={confirmNuevaCategoria}>✓</button>
                    <button type="button" className="adm-icon-btn" onClick={() => { setCreatingCategoria(false); setNuevaCategoriaNombre('') }}>✕</button>
                  </div>
                ) : (
                  <select
                    className="adm-select" style={{ width: '100%' }} value={form.categoria_id}
                    onChange={e => {
                      if (e.target.value === '__new__') { setCreatingCategoria(true); return }
                      set('categoria_id', e.target.value)
                    }}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    <option value="__new__">+ Crear nueva categoría…</option>
                  </select>
                )}
                {!creatingCategoria && (
                  <div className="adm-form-hint" style={{ marginTop: 4 }}>
                    <span style={{ color: '#2563EB', cursor: 'pointer' }} onClick={onManageCategorias}>Gestionar categorías</span>
                  </div>
                )}
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
                      <button type="button" className="adm-icon-btn" onClick={() => removeSpec(i)}><TrashIcon /></button>
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
                        <button type="button" className="adm-icon-btn" onClick={() => removeOrientacion(i)}><TrashIcon /></button>
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
        <button
          type="button"
          className="adm-btn"
          disabled={saving}
          onClick={() => { if (confirm('Esto vacía el nombre, descripción, specs y orientaciones en pantalla (no borra nada en la base de datos todavía). Si después le das "Guardar cambios" así vacío, sí sobreescribe el producto. ¿Continuar?')) limpiarFormulario() }}
        >
          Limpiar formulario
        </button>
        <button type="button" className="adm-btn" style={{ color: '#DC2626', borderColor: '#FCA5A5' }} onClick={eliminarProducto} disabled={saving}>
          Eliminar producto
        </button>
      </div>
    </div>
  )
}

// ---------- TAB: Precios ----------
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

function Precios({ productos, categorias, grados, selectedId, onSelectProducto }) {
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
          <option value="">Selecciona un producto…</option>
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
            <div className="adm-empty-note">Este producto no tiene medidas activas — agrégalas en la pestaña Medidas por modelo.</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr><th>Medida</th>{grados.map(g => <th key={g.codigo}>Grado {g.codigo}</th>)}</tr>
              </thead>
              <tbody>
                {configuraciones.map(cfg => (
                  <tr key={cfg.id}>
                    <td>{cfg.nombre}</td>
                    {grados.map(g => (
                      <td key={g.codigo}>
                        <PriceCell
                          initialValue={matrix[cfg.id]?.[g.codigo] ?? ''}
                          onSave={val => saveCell(cfg.id, g.codigo, val)}
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

// ---------- TAB: Telas y categorías ----------
function TelasYCategorias({ grados, telas, onReloadGrados, onReloadTelas }) {
  const [grado, setGrado] = useState('')
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [addingGrado, setAddingGrado] = useState(false)
  const [nuevoGrado, setNuevoGrado] = useState({ codigo: '', nombre: '' })

  useEffect(() => { if (!grado && grados[0]) setGrado(grados[0].codigo) }, [grados])

  const totales = grados.map(g => {
    const enGrado = telas.filter(t => t.grado === g.codigo)
    const nColores = enGrado.reduce((sum, t) => sum + (t.colores?.[0]?.count ?? 0), 0)
    return { ...g, colecciones: enGrado.length, colores: nColores }
  })
  const totalColecciones = totales.reduce((s, t) => s + t.colecciones, 0)
  const totalColores = totales.reduce((s, t) => s + t.colores, 0)
  const rows = telas.filter(t => t.grado === grado)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ nombre: '', descripcion: '' }); setEditingId(null) }

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('telas').update({ nombre: form.nombre, descripcion: form.descripcion }).eq('id', editingId)
      } else {
        await supabase.from('telas').insert({ nombre: form.nombre, descripcion: form.descripcion, grado, activo: true })
      }
      reset()
      onReloadTelas()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (tela) => { setEditingId(tela.id); setForm({ nombre: tela.nombre ?? '', descripcion: tela.descripcion ?? '' }) }
  const toggleActivo = async (tela) => { await supabase.from('telas').update({ activo: !tela.activo }).eq('id', tela.id); onReloadTelas() }

  const crearGrado = async () => {
    const codigo = nuevoGrado.codigo.trim().toUpperCase()
    if (!codigo || !nuevoGrado.nombre.trim()) return alert('Código y nombre son obligatorios.')
    try {
      await supabase.from('tela_grados').insert({ codigo, nombre: nuevoGrado.nombre.trim(), orden: grados.length + 1 })
      setAddingGrado(false)
      setNuevoGrado({ codigo: '', nombre: '' })
      onReloadGrados()
    } catch (err) {
      alert(`Error al crear categoría: ${err.message}`)
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <div className="adm-card-title">Categorías de telas</div>
            <div className="adm-card-sub">Cada categoría tiene su propio precio en la matriz de Precios.</div>
          </div>
          <button type="button" className="adm-btn-sm adm-dark" onClick={() => setAddingGrado(v => !v)}>+ Agregar categoría</button>
        </div>

        {addingGrado && (
          <div className="adm-field-row" style={{ marginBottom: 16 }}>
            <div className="adm-field">
              <label className="adm-label">Código (ej. D)</label>
              <input className="adm-input" style={{ width: '100%' }} maxLength={4} value={nuevoGrado.codigo}
                onChange={e => setNuevoGrado(g => ({ ...g, codigo: e.target.value }))} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Nombre</label>
              <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. D — Ultra premium" value={nuevoGrado.nombre}
                onChange={e => setNuevoGrado(g => ({ ...g, nombre: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
              <button type="button" className="adm-btn adm-btn-dark" onClick={crearGrado}>Crear</button>
            </div>
          </div>
        )}

        <table className="adm-table">
          <thead><tr><th>Categoría</th><th>Colecciones</th><th>Colores</th></tr></thead>
          <tbody>
            {totales.map(t => (
              <tr key={t.codigo} style={{ cursor: 'pointer' }} onClick={() => setGrado(t.codigo)}>
                <td><span className="grado-pill" style={{ marginRight: 8 }}>{t.codigo}</span>{t.nombre}</td>
                <td>{t.colecciones}</td>
                <td>{t.colores}</td>
              </tr>
            ))}
            <tr className="adm-total-row"><td>Total</td><td>{totalColecciones}</td><td>{totalColores}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="adm-grid-2">
        <div>
          <div className="adm-card">
            <div className="adm-card-title" style={{ marginBottom: 4 }}>{editingId ? 'Editar colección' : 'Nueva colección'}</div>
            <div className="adm-card-sub">Categoría: <b style={{ color: '#111827' }}>{grado}</b></div>
            <div className="adm-field">
              <label className="adm-label">Nombre</label>
              <input className="adm-input" style={{ width: '100%' }} placeholder="Ej. Lino Belga" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Descripción</label>
              <input className="adm-input" style={{ width: '100%' }} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar colección'}
              </button>
              {editingId && <button type="button" className="adm-btn" onClick={reset}>Cancelar</button>}
            </div>
          </div>
        </div>

        <div>
          <div className="adm-card">
            <div className="adm-card-header">
              <div className="adm-card-title">Colecciones · Categoría {grado}</div>
            </div>
            <table className="adm-table">
              <thead><tr><th>Nombre</th><th># Colores</th><th>Activa</th><th></th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="adm-empty-note">No hay colecciones en esta categoría</td></tr>
                ) : rows.map(t => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td>{t.colores?.[0]?.count ?? 0}</td>
                    <td>{t.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                    <td className="adm-cell-actions">
                      <button type="button" className="adm-icon-btn" onClick={() => startEdit(t)}>✎</button>
                      <button type="button" className="adm-icon-btn" onClick={() => toggleActivo(t)}>{t.activo ? '⏸' : '▶'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="adm-form-hint" style={{ marginTop: 10 }}>Para administrar los colores de una colección, ve a la pestaña Colores.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- TAB: Colecciones (vista global, todas las categorías juntas) ----------
function Colecciones({ grados, telas, onReloadTelas }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', grado: '', descripcion: '' })
  const [saving, setSaving] = useState(false)

  const openNew = () => { setEditing(null); setForm({ nombre: '', grado: grados[0]?.codigo ?? '', descripcion: '' }); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t.id); setForm({ nombre: t.nombre ?? '', grado: t.grado, descripcion: t.descripcion ?? '' }); setModalOpen(true) }
  const close = () => setModalOpen(false)

  const save = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (editing) {
        await supabase.from('telas').update({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion }).eq('id', editing)
      } else {
        await supabase.from('telas').insert({ nombre: form.nombre, grado: form.grado, descripcion: form.descripcion, activo: true })
      }
      close()
      onReloadTelas()
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (t) => {
    if (!confirm(`¿Eliminar "${t.nombre}"? Si tiene colores u otros datos asociados, mejor desactívala.`)) return
    try {
      const { error } = await supabase.from('telas').delete().eq('id', t.id)
      if (error) throw error
      onReloadTelas()
    } catch {
      alert('No se pudo eliminar (tiene colores u otros datos asociados). Desactívala en vez de borrarla.')
    }
  }

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header">
          <div>
            <div className="adm-card-title">Todas las colecciones</div>
            <div className="adm-card-sub">Nombre comercial de la tela dentro de su categoría (grado).</div>
          </div>
          <button type="button" className="adm-btn-sm adm-dark" onClick={openNew}>+ Nueva colección</button>
        </div>
        <table className="adm-table">
          <thead><tr><th>Colección</th><th>Grado</th><th>Descripción</th><th># Colores</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            {telas.length === 0 ? (
              <tr><td colSpan={6} className="adm-empty-note">No hay colecciones aún</td></tr>
            ) : telas.map(t => (
              <tr key={t.id}>
                <td>{t.nombre}</td>
                <td><span className="grado-pill">{t.grado}</span></td>
                <td style={{ color: '#6B7280' }}>{t.descripcion ?? '—'}</td>
                <td>{t.colores?.[0]?.count ?? 0}</td>
                <td>{t.activo ? '✅' : <span style={{ color: '#D97706' }}>⏸</span>}</td>
                <td className="adm-cell-actions">
                  <button type="button" className="adm-icon-btn" onClick={() => openEdit(t)}>✎</button>
                  <button type="button" className="adm-icon-btn" onClick={() => eliminar(t)}><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`adm-modal-overlay ${modalOpen ? 'adm-open' : ''}`} onClick={e => { if (e.target === e.currentTarget) close() }}>
        {modalOpen && (
          <div className="adm-modal-box">
            <div className="adm-modal-header">
              <div className="adm-modal-title">{editing ? 'Editar colección' : 'Nueva colección'}</div>
              <button type="button" className="adm-drawer-close" onClick={close}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-label">Nombre</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Grado</label>
                <select className="adm-select" style={{ width: '100%' }} value={form.grado} onChange={e => setForm(f => ({ ...f, grado: e.target.value }))}>
                  {grados.map(g => <option key={g.codigo} value={g.codigo}>{g.codigo} — {g.nombre}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Descripción</label>
                <input className="adm-input" style={{ width: '100%' }} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>Cancelar</button>
              <button type="button" className="adm-btn adm-btn-dark" onClick={save} disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear colección'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- TAB: Colores ----------
function Colores({ grados, telas, onReloadTelas }) {
  const [selectedTelaId, setSelectedTelaId] = useState(null)
  const [colores, setColores] = useState([])
  const [pending, setPending] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [editingColor, setEditingColor] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingColor, setSavingColor] = useState(false)
  const inputRef = useRef()

  useEffect(() => { setSelectedTelaId(prev => prev ?? telas[0]?.id ?? null) }, [telas])
  const selectedTela = telas.find(t => t.id === selectedTelaId) ?? null

  const loadColores = async (telaId) => {
    if (!telaId) { setColores([]); return }
    const { data } = await supabase.from('tela_colores').select('*').eq('tela_id', telaId).order('orden')
    setColores(data ?? [])
  }
  useEffect(() => { loadColores(selectedTelaId); setPending([]); setEditingColor(null) }, [selectedTelaId])

  const addFiles = (files) => {
    const items = Array.from(files).map(file => ({
      localId: Math.random().toString(36).slice(2), file, previewUrl: URL.createObjectURL(file),
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
        const { error } = await supabase.storage.from(BUCKET_TELAS).upload(path, item.file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from(BUCKET_TELAS).getPublicUrl(path)
          await supabase.from('tela_colores').insert({
            tela_id: selectedTela.id, nombre: item.nombre, imagen_url: urlData.publicUrl, orden: startOrden + i, activo: true,
          })
        }
      }
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPending([])
      loadColores(selectedTela.id)
      onReloadTelas()
    } catch (err) {
      alert(`Error al subir colores: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const toggleColorActivo = async (color) => { await supabase.from('tela_colores').update({ activo: !color.activo }).eq('id', color.id); loadColores(selectedTelaId) }
  const deleteColor = async (id) => {
    if (!confirm('¿Eliminar este color?')) return
    await supabase.from('tela_colores').delete().eq('id', id)
    if (editingColor === id) setEditingColor(null)
    loadColores(selectedTelaId); onReloadTelas()
  }

  const openEdit = (color) => {
    setEditingColor(color.id)
    setEditForm({
      nombre: color.nombre ?? '', codigo_hex: color.codigo_hex ?? '', composicion: color.composicion ?? '',
      pais_origen: color.pais_origen ?? '', martindale: color.martindale ?? '', resistencia_luz: color.resistencia_luz ?? '',
      pilling: color.pilling ?? '', facil_limpieza: color.facil_limpieza ?? false, repelente_liquidos: color.repelente_liquidos ?? false,
    })
  }
  const setEditField = (k, v) => setEditForm(f => ({ ...f, [k]: v }))
  const saveEdit = async () => {
    setSavingColor(true)
    try {
      await supabase.from('tela_colores').update({
        nombre: editForm.nombre,
        codigo_hex: editForm.codigo_hex || null,
        composicion: editForm.composicion || null,
        pais_origen: editForm.pais_origen || null,
        martindale: editForm.martindale === '' ? null : parseInt(editForm.martindale),
        resistencia_luz: editForm.resistencia_luz || null,
        pilling: editForm.pilling || null,
        facil_limpieza: editForm.facil_limpieza,
        repelente_liquidos: editForm.repelente_liquidos,
      }).eq('id', editingColor)
      setEditingColor(null)
      loadColores(selectedTelaId)
    } catch (err) {
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSavingColor(false)
    }
  }

  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }

  return (
    <div className="adm-content">
      <div className="adm-card">
        <div className="adm-card-header"><div className="adm-card-title">Selecciona una colección</div></div>
        <select className="adm-select" style={{ width: 320 }} value={selectedTelaId ?? ''} onChange={e => setSelectedTelaId(e.target.value)}>
          {grados.map(g => {
            const grupo = telas.filter(t => t.grado === g.codigo)
            if (grupo.length === 0) return null
            return (
              <optgroup key={g.codigo} label={`Categoría ${g.codigo}`}>
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
                    <div key={item.localId} className="adm-img-thumb" style={{ background: `url(${item.previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8 }}>
                      <span className="adm-principal-tag" style={{ background: '#6B7280' }}>Pendiente</span>
                      <button type="button" className="adm-icon-btn" onClick={() => removePending(item.localId)}><TrashIcon /></button>
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
              <div className="adm-swatch-grid">
                {colores.map(color => (
                  <div key={color.id} className="adm-swatch-card">
                    <div className="adm-swatch-edit">
                      <button type="button" className="adm-icon-btn" onClick={() => openEdit(color)}>✎</button>
                      <button type="button" className="adm-icon-btn" onClick={() => deleteColor(color.id)}><TrashIcon /></button>
                    </div>
                    <div
                      className="adm-swatch-circle"
                      style={{ background: color.imagen_url ? `url(${color.imagen_url}) center/cover` : (color.codigo_hex || '#F3F4F6'), opacity: color.activo ? 1 : 0.4 }}
                    />
                    <div className="adm-swatch-name">{color.nombre}</div>
                    <div className="adm-swatch-code">{color.codigo_hex ?? (color.activo ? '' : 'inactivo')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editingColor && editForm && (
            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title">Editar color: {editForm.nombre}</div>
                <button type="button" className="adm-btn-sm adm-dark" onClick={saveEdit} disabled={savingColor}>{savingColor ? 'Guardando…' : '💾 Guardar'}</button>
              </div>
              <div className="adm-grid-2">
                <div>
                  <div className="adm-field"><label className="adm-label">Nombre del color</label>
                    <input className="adm-input" style={{ width: '100%' }} value={editForm.nombre} onChange={e => setEditField('nombre', e.target.value)} /></div>
                  <div className="adm-field-row">
                    <div className="adm-field"><label className="adm-label">Código hex (swatch)</label>
                      <input className="adm-input" style={{ width: '100%' }} value={editForm.codigo_hex} onChange={e => setEditField('codigo_hex', e.target.value)} /></div>
                    <div className="adm-field"><label className="adm-label">Vista previa</label>
                      <div className="adm-swatch-circle" style={{ background: editForm.codigo_hex || '#F3F4F6', margin: 0 }} /></div>
                  </div>
                  <div className="adm-field"><label className="adm-label">Composición</label>
                    <input className="adm-input" style={{ width: '100%' }} value={editForm.composicion} onChange={e => setEditField('composicion', e.target.value)} /></div>
                  <div className="adm-field"><label className="adm-label">País de origen</label>
                    <input className="adm-input" style={{ width: '100%' }} value={editForm.pais_origen} onChange={e => setEditField('pais_origen', e.target.value)} /></div>
                </div>
                <div>
                  <div className="adm-field-row">
                    <div className="adm-field"><label className="adm-label">Martindale (ciclos)</label>
                      <input className="adm-input" type="number" style={{ width: '100%' }} value={editForm.martindale ?? ''} onChange={e => setEditField('martindale', e.target.value)} /></div>
                    <div className="adm-field"><label className="adm-label">Resistencia a la luz</label>
                      <input className="adm-input" style={{ width: '100%' }} value={editForm.resistencia_luz} onChange={e => setEditField('resistencia_luz', e.target.value)} /></div>
                  </div>
                  <div className="adm-field"><label className="adm-label">Pilling</label>
                    <input className="adm-input" style={{ width: '100%' }} value={editForm.pilling} onChange={e => setEditField('pilling', e.target.value)} /></div>
                  <div className="adm-toggle-row"><div className="adm-toggle-label">Fácil limpieza</div>
                    <button type="button" className={`adm-switch ${editForm.facil_limpieza ? '' : 'adm-off'}`} onClick={() => setEditField('facil_limpieza', !editForm.facil_limpieza)} /></div>
                  <div className="adm-toggle-row"><div className="adm-toggle-label">Repelente a líquidos</div>
                    <button type="button" className={`adm-switch ${editForm.repelente_liquidos ? '' : 'adm-off'}`} onClick={() => setEditField('repelente_liquidos', !editForm.repelente_liquidos)} /></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Hub ----------
export default function AdminProducts() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [grados, setGrados] = useState([])
  const [telas, setTelas] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [configCounts, setConfigCounts] = useState({})
  const [imageCounts, setImageCounts] = useState({})
  const navigate = useNavigate()

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*').order('orden'),
      supabase.from('categorias').select('*').order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
    // Ya no precarga el primer producto de la lista (Luna) por default — eso
    // hacía que "Información general" siempre dijera "Editando: Luna" al entrar
    // o refrescar, aunque no fuera lo que se quería editar. Ahora se queda vacío
    // hasta que el usuario elige un producto o crea uno nuevo.
  }

  const loadGrados = async () => {
    const { data } = await supabase.from('tela_grados').select('*').eq('activo', true).order('orden')
    setGrados(data ?? [])
  }

  const loadTelas = async () => {
    const { data } = await supabase.from('telas').select('*, colores:tela_colores(count)').order('grado').order('orden')
    setTelas(data ?? [])
  }

  useEffect(() => { load(); loadGrados(); loadTelas() }, [])

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

  const createCategoria = async (nombre) => {
    try {
      const { data, error } = await supabase.from('categorias')
        .insert({ nombre, slug: slugify(nombre), orden: categorias.length + 1, activo: true })
        .select().single()
      if (error) throw error
      await load()
      return data.id
    } catch (err) {
      alert(`Error al crear categoría: ${err.message}`)
      return null
    }
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
              onCreateCategoria={createCategoria}
              onManageCategorias={() => setManageCatOpen(true)}
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
              onDelete={load}
            />
          }
        />
        <Route
          path="medidas"
          element={<Medidas productos={productos} categorias={categorias} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
        <Route
          path="precios"
          element={<Precios productos={productos} categorias={categorias} grados={grados} selectedId={selectedId} onSelectProducto={setSelectedId} />}
        />
        <Route
          path="telas"
          element={<TelasYCategorias grados={grados} telas={telas} onReloadGrados={loadGrados} onReloadTelas={loadTelas} />}
        />
        <Route
          path="colecciones"
          element={<Colecciones grados={grados} telas={telas} onReloadTelas={loadTelas} />}
        />
        <Route
          path="colores"
          element={<Colores grados={grados} telas={telas} onReloadTelas={loadTelas} />}
        />
      </Routes>

      <NuevoProductoDrawer
        open={drawerOpen}
        categorias={categorias}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />
      <GestionCategoriasModal open={manageCatOpen} categorias={categorias} onClose={() => setManageCatOpen(false)} onChanged={load} />
    </div>
  )
}
