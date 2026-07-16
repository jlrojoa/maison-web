// src/admin/catalogo/AdminPrices.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS = ['AA', 'A', 'B', 'C']

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

export default function AdminPrices() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [configuraciones, setConfiguraciones] = useState([])
  const [matrix, setMatrix] = useState({})

  const producto = productos.find(p => p.id === selectedId) ?? null

  const loadProductos = async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*').order('orden'),
      supabase.from('categorias').select('*').order('orden'),
    ])
    setProductos(p.data ?? [])
    setCategorias(c.data ?? [])
    setSelectedId(prev => prev ?? (p.data ?? [])[0]?.id ?? null)
  }

  useEffect(() => { loadProductos() }, [])

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
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Precios</div>
          <div className="adm-breadcrumb">Inicio &nbsp;›&nbsp; <b>Precios</b></div>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card">
          <div className="adm-card-header"><div className="adm-card-title">Selecciona un modelo</div></div>
          <select className="adm-select" style={{ width: 320 }} value={selectedId ?? ''} onChange={e => setSelectedId(e.target.value)}>
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
              <div className="adm-empty-note">Este producto no tiene medidas activas — agrégalas en Productos → Medidas.</div>
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
    </div>
  )
}
