// src/admin/cotizaciones/AjustesCotizacion.jsx
//
// Datos fijos de las cotizaciones: se capturan UNA vez aquí y se copian a cada
// cotización nueva (logo, razón social, contacto, vigencia, IVA, términos…).
// Cada cotización puede cambiarlos solo para ella; las ya hechas no se mueven.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { guardarAjustes, leerAjustes } from './api'
import { uploadProductoImage } from '../catalogo/ProductoImageUpload'
import './cotizaciones.css'

const Campo = ({ label, children, hint }) => (<div className="adm-field" style={{ marginBottom: 12 }}><label className="adm-label">{label}</label>{children}{hint ? <div className="adm-form-hint">{hint}</div> : null}</div>)
const W = { width: '100%' }

export default function AjustesCotizacion() {
  const [v, setV] = useState(null)
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [sucio, setSucio] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { leerAjustes().then(d => setV({ ...d, terminos: d.terminos ?? [] })) }, [])
  useEffect(() => {
    if (!sucio) return undefined
    const f = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sucio])

  const set = (k, val) => { setV(x => ({ ...x, [k]: val })); setSucio(true) }
  const setT = (i, k, val) => { setV(x => ({ ...x, terminos: x.terminos.map((t, j) => (j === i ? { ...t, [k]: val } : t)) })); setSucio(true) }

  const subirLogo = async (file) => {
    if (!file) return
    setSubiendo(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
      set('logo_url', await uploadProductoImage(file, `cotizaciones/logo-${Date.now()}.${ext}`))
    } catch (err) { setMsg({ error: true, texto: `No se pudo subir el logo: ${err.message}` }) } finally { setSubiendo(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const guardar = async () => {
    setGuardando(true); setMsg(null)
    try {
      const limpio = { ...v, anticipo_pct: v.anticipo_pct === '' ? null : v.anticipo_pct, terminos: v.terminos.filter(t => t.titulo?.trim() || t.texto?.trim()) }
      await guardarAjustes(limpio); setV(limpio); setSucio(false)
      setMsg({ texto: 'Ajustes guardados. Las cotizaciones nuevas arrancarán con estos datos.' })
    } catch (err) { setMsg({ error: true, texto: `No se pudo guardar: ${err.message}` }) } finally { setGuardando(false) }
  }

  if (!v) return <div className="adm-content"><div className="adm-empty-note">Cargando…</div></div>
  return (
    <div>
      <div className="adm-topbar">
        <div><div className="adm-page-title">Ajustes de cotización</div><div className="adm-breadcrumb"><Link to="/admin/cotizaciones" style={{ color: 'inherit' }}>Cotizaciones</Link> › Datos fijos</div></div>
        <div className="adm-topbar-actions"><button type="button" className="adm-btn adm-btn-dark" disabled={guardando || !sucio} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar ajustes'}</button></div>
      </div>
      {msg && <div className={`cz-aviso ${msg.error ? 'cz-aviso-error' : ''}`} role="status">{msg.texto}</div>}
      <div className="adm-content" style={{ maxWidth: 900 }}>
        <div className="adm-card">
          <div className="adm-card-title">Empresa y logo</div>
          <div className="adm-card-sub">Salen en el encabezado y el pie de cada cotización.</div>
          <div className="cz-logo-fila">
            <div className="cz-logo-caja" style={{ backgroundImage: v.logo_url ? `url(${v.logo_url})` : 'none' }}>{!v.logo_url && <span>Sin logo</span>}</div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => subirLogo(e.target.files?.[0])} />
              <div className="cz-fila-botones">
                <button type="button" className="adm-btn-sm" disabled={subiendo} onClick={() => fileRef.current?.click()}>{subiendo ? 'Subiendo…' : (v.logo_url ? 'Cambiar logo' : 'Subir logo')}</button>
                {v.logo_url && <button type="button" className="adm-btn-sm" onClick={() => set('logo_url', null)}>Quitar</button>}
              </div>
              <div className="adm-form-hint">PNG o JPG, de preferencia con fondo blanco o transparente. Sin logo, el PDF usa el nombre de la empresa.</div>
            </div>
          </div>
          <div className="adm-field-row">
            <Campo label="Razón social"><input className="adm-input" style={W} value={v.razon_social ?? ''} onChange={e => set('razon_social', e.target.value)} /></Campo>
            <Campo label="RFC"><input className="adm-input" style={W} value={v.rfc ?? ''} onChange={e => set('rfc', e.target.value)} /></Campo>
          </div>
          <Campo label="Dirección"><input className="adm-input" style={W} value={v.direccion ?? ''} onChange={e => set('direccion', e.target.value)} /></Campo>
          <div className="adm-field-row">
            <Campo label="Teléfono"><input className="adm-input" style={W} value={v.telefono ?? ''} onChange={e => set('telefono', e.target.value)} /></Campo>
            <Campo label="Correo"><input className="adm-input" style={W} value={v.email ?? ''} onChange={e => set('email', e.target.value)} /></Campo>
            <Campo label="Sitio web"><input className="adm-input" style={W} value={v.sitio_web ?? ''} onChange={e => set('sitio_web', e.target.value)} /></Campo>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-title">Valores de arranque</div>
          <div className="adm-card-sub">Cada cotización nueva empieza con esto; en la cotización se puede cambiar solo para esa.</div>
          <div className="adm-field-row">
            <Campo label="Vigencia (días)"><input className="adm-input" style={W} type="number" min="1" value={v.vigencia_dias ?? ''} onChange={e => set('vigencia_dias', e.target.value)} /></Campo>
            <Campo label="IVA">
              <select className="adm-select" style={{ ...W, minWidth: 0 }} value={v.iva_modo} onChange={e => set('iva_modo', e.target.value)}>
                <option value="ninguno">No mostrar IVA</option><option value="sumar">Sumar IVA al subtotal</option><option value="incluido">Precios ya incluyen IVA</option>
              </select>
            </Campo>
            <Campo label="IVA %"><input className="adm-input" style={W} type="number" min="0" step="0.5" value={v.iva_pct ?? ''} onChange={e => set('iva_pct', e.target.value)} /></Campo>
            <Campo label="Anticipo %"><input className="adm-input" style={W} type="number" min="0" max="100" value={v.anticipo_pct ?? ''} onChange={e => set('anticipo_pct', e.target.value)} /></Campo>
          </div>
          <Campo label="Tiempo de entrega"><input className="adm-input" style={W} value={v.tiempo_entrega ?? ''} onChange={e => set('tiempo_entrega', e.target.value)} placeholder="Ej. 6 a 8 semanas a partir del anticipo" /></Campo>
          <Campo label="Condiciones de pago"><textarea className="adm-textarea" style={{ minHeight: 60 }} value={v.condiciones_pago ?? ''} onChange={e => set('condiciones_pago', e.target.value)} /></Campo>
          <Campo label="Datos para depósito o transferencia" hint="Banco, CLABE, beneficiario. En cada cotización decides si se muestran."><textarea className="adm-textarea" style={{ minHeight: 60 }} value={v.datos_bancarios ?? ''} onChange={e => set('datos_bancarios', e.target.value)} /></Campo>
          <Campo label="Texto al final del PDF (opcional)"><input className="adm-input" style={W} value={v.notas_pie ?? ''} onChange={e => set('notas_pie', e.target.value)} placeholder="Ej. Gracias por tu preferencia" /></Campo>
        </div>

        <div className="adm-card">
          <div className="adm-card-title">Términos y condiciones</div>
          <div className="adm-card-sub">Texto base que sale en todas las cotizaciones. Conviene que lo revise tu abogado.</div>
          {v.terminos.map((t, i) => (
            <div key={i} className="cz-termino">
              <input className="adm-input" style={W} value={t.titulo ?? ''} onChange={e => setT(i, 'titulo', e.target.value)} placeholder="Título" />
              <textarea className="adm-textarea" style={{ minHeight: 60 }} value={t.texto ?? ''} onChange={e => setT(i, 'texto', e.target.value)} />
              <button type="button" className="adm-icon-btn" title="Quitar" onClick={() => { setV(x => ({ ...x, terminos: x.terminos.filter((_, j) => j !== i) })); setSucio(true) }}>✕</button>
            </div>
          ))}
          <button type="button" className="adm-btn-sm" onClick={() => { setV(x => ({ ...x, terminos: [...x.terminos, { titulo: '', texto: '' }] })); setSucio(true) }}>+ Agregar término</button>
        </div>
      </div>
    </div>
  )
}
