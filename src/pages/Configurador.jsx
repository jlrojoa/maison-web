// src/pages/Configurador.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import './Configurador.css'

const GRADOS = ['AA', 'A', 'B', 'C']
const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function Configurador() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null

  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])

  const [tipoSel, setTipoSel] = useState(null)
  const [modeloSel, setModeloSel] = useState(null)

  const [configuraciones, setConfiguraciones] = useState([])
  const [medidaSel, setMedidaSel] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('categorias').select('*').eq('activo', true).order('orden')
      setCategorias(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!tipoSel) { setProductos([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('productos').select('*')
        .eq('categoria_id', tipoSel.id).eq('activo', true).order('orden')
      if (!ignore) setProductos(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [tipoSel])

  useEffect(() => {
    if (!modeloSel) { setConfiguraciones([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('producto_configuraciones').select('*')
        .eq('producto_id', modeloSel.id).eq('activo', true).order('orden')
      if (!ignore) setConfiguraciones(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [modeloSel])

  const selectTipo = (cat) => {
    setTipoSel(cat)
    setModeloSel(null)
    setMedidaSel(null)
  }

  const selectModelo = (prod) => {
    setModeloSel(prod)
    setMedidaSel(null)
  }

  const selectMedida = (cfg) => setMedidaSel(cfg)

  const modeloActivo = !!tipoSel
  const medidaTelaActivo = !!modeloSel

  return (
    <div className="cfg-page">
      <header className="cfg-header">
        <div className="cfg-header-content">
          <div className="cfg-logo">Brendell</div>
          <span className="cfg-auth-status">
            {distribuidor ? '👤 Distribuidor logueado' : '📍 Sin sesión'}
          </span>
        </div>
      </header>

      <div className="cfg-container">
        <h1 className="cfg-h1">Configura tu Sofá</h1>
        <p className="cfg-subtitle">Personaliza seleccionando tipo, modelo, medida y tela que mejor se adapte a tu espacio.</p>

        <div className="cfg-grid-2col">
          {/* LEFT */}
          <div>
            <div className="cfg-carousel">
              {modeloSel?.isometrico_url && <img src={modeloSel.isometrico_url} alt={modeloSel.nombre} />}
            </div>
            <div className="cfg-thumbnails">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="cfg-thumbnail" />)}
            </div>
            {medidaSel && (
              <div>
                <div className="cfg-isometric-container">
                  <div className="cfg-isometric-image">
                    {medidaSel.isometrico_url
                      ? <img src={medidaSel.isometrico_url} alt={medidaSel.nombre} />
                      : 'Sin imagen isométrica'}
                  </div>
                </div>
                <p className="cfg-iso-caption">
                  {medidaSel.nombre}{medidaSel.dimensiones ? ` — ${medidaSel.dimensiones}` : ''}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* PASO 0 */}
            <div className="cfg-step">
              <div className="cfg-step-header">
                <div className="cfg-step-number">0.</div>
                <div className="cfg-step-title">¿Qué tipo buscas?</div>
              </div>
              <div className="cfg-options-grid">
                {categorias.map(cat => (
                  <div
                    key={cat.id}
                    className={`cfg-option ${tipoSel?.id === cat.id ? 'cfg-active' : ''}`}
                    onClick={() => selectTipo(cat)}
                  >
                    <div className="cfg-option-icon">{cat.nombre?.[0]}</div>
                    <div className="cfg-option-label">{cat.nombre}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PASO 1 */}
            <div className={`cfg-step ${!modeloActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">1.</div>
                <div className="cfg-step-title">Selecciona el modelo</div>
              </div>
              <div className="cfg-options-grid">
                {productos.map(prod => (
                  <div
                    key={prod.id}
                    className={`cfg-option ${modeloSel?.id === prod.id ? 'cfg-active' : ''}`}
                    onClick={() => modeloActivo && selectModelo(prod)}
                  >
                    <div className="cfg-option-thumb">
                      {prod.isometrico_url && <img src={prod.isometrico_url} alt={prod.nombre} />}
                    </div>
                    <div className="cfg-option-label">{prod.nombre}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PASO 2 */}
            <div className={`cfg-step ${!medidaTelaActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">2.</div>
                <div className="cfg-step-title">Selecciona la medida</div>
              </div>
              <div
                className="cfg-options-grid"
                style={{ gridTemplateColumns: `repeat(${configuraciones.length || 1}, 1fr)` }}
              >
                {configuraciones.map(cfg => (
                  <div
                    key={cfg.id}
                    className={`cfg-option ${medidaSel?.id === cfg.id ? 'cfg-active' : ''}`}
                    onClick={() => medidaTelaActivo && selectMedida(cfg)}
                  >
                    <div className="cfg-option-dim">{cfg.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
