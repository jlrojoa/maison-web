// src/admin/catalogo/ProductoImageUpload.jsx
import { useRef } from 'react'
import { supabase } from '../../lib/supabase'

const BUCKET = 'productos'

// El bucket 'productos' ya existe (creado por migración). No intentar listarlo ni
// crearlo desde el cliente: listBuckets() regresa vacío para usuarios normales
// (RLS) y createBucket() falla con 400, ensuciando cada guardado.
export async function uploadProductoImage(file, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

// Isometric image: shows the saved image, or a local blob preview of a pending
// (not-yet-uploaded) file. Never uploads by itself — the parent's save() does.
export function IsometricoPicker({ currentUrl, pendingFile, pendingPreviewUrl, onFileSelected }) {
  const inputRef = useRef()
  const displayUrl = pendingPreviewUrl || currentUrl

  return (
    <div>
      <div
        className="adm-img-thumb"
        style={{ height: 200, marginBottom: 10, background: displayUrl ? `url(${displayUrl})` : '#F1F5F9', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <button type="button" className="adm-icon-btn" onClick={() => inputRef.current.click()}><PencilIcon /></button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFileSelected(f) }} />
      <div className="adm-form-hint">
        {pendingFile ? `${pendingFile.name} — se subirá al guardar` : 'Recomendado 1200×1200px, fondo neutro.'}
      </div>
    </div>
  )
}

// Gallery: existing (already-saved) images can be deleted immediately (removing
// a saved image doesn't need a "preview before save" gate — only NEW uploads do).
// Newly-picked files are staged as pendingImages and shown with a "Pendiente" tag
// until the parent's save() uploads them.
export function GaleriaPicker({ existingImages, pendingImages, onFilesAdded, onRemovePending, onRemoveExisting }) {
  const inputRef = useRef()

  return (
    <div className="adm-img-grid">
      {existingImages.map(img => (
        <div key={img.id} className="adm-img-thumb" style={{ background: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          {img.es_principal && <span className="adm-principal-tag">Principal</span>}
          <button type="button" className="adm-icon-btn" onClick={() => onRemoveExisting(img)}><TrashIcon /></button>
        </div>
      ))}
      {pendingImages.map(item => (
        <div key={item.localId} className="adm-img-thumb" style={{ background: `url(${item.previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.75 }}>
          <span className="adm-principal-tag" style={{ background: '#6B7280' }}>Pendiente</span>
          <button type="button" className="adm-icon-btn" onClick={() => onRemovePending(item.localId)}><TrashIcon /></button>
        </div>
      ))}
      <div className="adm-img-drop" onClick={() => inputRef.current.click()}>+ Subir</div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) onFilesAdded(files) }} />
    </div>
  )
}
