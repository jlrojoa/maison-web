// src/admin/catalogo/ProductoImageUpload.jsx
import { useRef } from 'react'
import { supabase } from '../../lib/supabase'

const BUCKET = 'productos'
let bucketEnsured = false

async function ensureBucket() {
  if (bucketEnsured) return
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets ?? []).some(b => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
  bucketEnsured = true
}

export async function uploadProductoImage(file, path) {
  await ensureBucket()
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
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
        style={{ height: 200, marginBottom: 10, background: displayUrl ? `url(${displayUrl})` : 'linear-gradient(135deg,#D4C4B0,#E8DCC4)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <button type="button" className="adm-icon-btn" onClick={() => inputRef.current.click()}>✎</button>
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
        <div key={img.id} className="adm-img-thumb" style={{ background: `url(${img.url})` }}>
          {img.es_principal && <span className="adm-principal-tag">Principal</span>}
          <button type="button" className="adm-icon-btn" onClick={() => onRemoveExisting(img)}>🗑</button>
        </div>
      ))}
      {pendingImages.map(item => (
        <div key={item.localId} className="adm-img-thumb" style={{ background: `url(${item.previewUrl})`, opacity: 0.75 }}>
          <span className="adm-principal-tag" style={{ background: '#6B7280' }}>Pendiente</span>
          <button type="button" className="adm-icon-btn" onClick={() => onRemovePending(item.localId)}>🗑</button>
        </div>
      ))}
      <div className="adm-img-drop" onClick={() => inputRef.current.click()}>+ Subir</div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) onFilesAdded(files) }} />
    </div>
  )
}
