import { forwardRef, useImperativeHandle, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ImageUpload = forwardRef(function ImageUpload(
  { bucket = 'maison', existingImages = [], onExistingDeleted },
  ref
) {
  const [pending, setPending] = useState([])
  const [principal, setPrincipal] = useState(() => {
    const p = existingImages.find(i => i.es_principal)
    return p ? { type: 'existing', id: p.id } : null
  })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  useImperativeHandle(ref, () => ({
    async uploadAll(folder) {
      const results = []
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i]
        const ext = item.file.name.split('.').pop().toLowerCase()
        const path = `${folder}/${Date.now()}-${i}.${ext}`
        const { error } = await supabase.storage.from(bucket).upload(path, item.file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
          results.push({
            url: urlData.publicUrl,
            alt: item.file.name.replace(/\.[^.]+$/, ''),
            es_principal: principal?.type === 'pending' && principal.id === item.localId,
            orden: existingImages.length + i,
          })
        }
      }
      // Auto-mark first as principal if nothing else is
      if (existingImages.length === 0 && results.length > 0 && !results.some(r => r.es_principal)) {
        results[0].es_principal = true
      }
      setPending([])
      return results
    },
    getPrincipalExistingId() {
      return principal?.type === 'existing' ? principal.id : null
    },
  }))

  const addFiles = (files) => {
    const items = Array.from(files).map(file => ({
      localId: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPending(prev => {
      const next = [...prev, ...items]
      // Auto-set principal if this is the very first image added
      setPrincipal(cur => {
        if (!cur && existingImages.length === 0 && prev.length === 0 && items.length > 0) {
          return { type: 'pending', id: items[0].localId }
        }
        return cur
      })
      return next
    })
  }

  const removePending = (localId) => {
    setPending(prev => prev.filter(p => p.localId !== localId))
    setPrincipal(cur => (cur?.type === 'pending' && cur.id === localId) ? null : cur)
  }

  const deleteExisting = async (img) => {
    try {
      const url = new URL(img.url)
      const marker = `/object/public/${bucket}/`
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        await supabase.storage.from(bucket).remove([url.pathname.slice(idx + marker.length)])
      }
    } catch {}
    await supabase.from('producto_imagenes').delete().eq('id', img.id)
    setPrincipal(cur => {
      if (cur?.type === 'existing' && cur.id === img.id) {
        const remaining = existingImages.filter(i => i.id !== img.id)
        if (remaining.length > 0) return { type: 'existing', id: remaining[0].id }
        if (pending.length > 0) return { type: 'pending', id: pending[0].localId }
        return null
      }
      return cur
    })
    onExistingDeleted(img.id)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const thumbStyle = (isPrincipal) => ({
    width: 96, height: 96, objectFit: 'cover', display: 'block',
    border: isPrincipal ? '2px solid var(--gold)' : '2px solid var(--sand)',
  })

  const delBtnStyle = {
    position: 'absolute', top: 4, right: 4,
    background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff',
    width: 22, height: 22, cursor: 'pointer', fontSize: 13, lineHeight: '22px', textAlign: 'center',
  }

  return (
    <div>
      {(existingImages.length > 0 || pending.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          {existingImages.map(img => {
            const isPrincipal = principal?.type === 'existing' && principal.id === img.id
            return (
              <div key={img.id} style={{ position: 'relative', width: 96 }}>
                <img src={img.url} alt={img.alt ?? ''} style={thumbStyle(isPrincipal)} />
                <button style={delBtnStyle} onClick={() => deleteExisting(img)}>×</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, cursor: 'pointer' }}>
                  <input type="radio" name="img-principal" checked={isPrincipal}
                    onChange={() => setPrincipal({ type: 'existing', id: img.id })} />
                  <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--taupe)', textTransform: 'uppercase' }}>Principal</span>
                </label>
              </div>
            )
          })}

          {pending.map(item => {
            const isPrincipal = principal?.type === 'pending' && principal.id === item.localId
            return (
              <div key={item.localId} style={{ position: 'relative', width: 96 }}>
                <img src={item.previewUrl} alt="preview" style={{ ...thumbStyle(isPrincipal), opacity: .8 }} />
                <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 8, textAlign: 'center', padding: '2px 0', letterSpacing: '.1em' }}>
                  PENDIENTE
                </div>
                <button style={delBtnStyle} onClick={() => removePending(item.localId)}>×</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, cursor: 'pointer' }}>
                  <input type="radio" name="img-principal" checked={isPrincipal}
                    onChange={() => setPrincipal({ type: 'pending', id: item.localId })} />
                  <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--taupe)', textTransform: 'uppercase' }}>Principal</span>
                </label>
              </div>
            )
          })}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--sand)'}`,
          padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(184,151,106,.06)' : 'transparent', transition: 'all .2s',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--taupe)', letterSpacing: '.15em' }}>
          {dragging ? 'SOLTAR AQUÍ' : 'ARRASTRA IMÁGENES O HAZ CLIC PARA SELECCIONAR'}
        </div>
        <div style={{ fontSize: 10, color: '#ccc', marginTop: 5 }}>JPG · PNG · WEBP · múltiples archivos</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
})

export default ImageUpload
