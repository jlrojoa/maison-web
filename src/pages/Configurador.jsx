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

  const [telas, setTelas] = useState([])
  const [gradoSel, setGradoSel] = useState('AA')
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)

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
    if (!modeloSel) { setConfiguraciones([]); setTelas([]); setTelaSel(null); setColorSel(null); return }
    let ignore = false
    async function load() {
      const [cfgRes, telasRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', modeloSel.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
      ])
      if (ignore) return
      setConfiguraciones(cfgRes.data ?? [])

      const telasConColores = (telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))
      setTelas(telasConColores)
      setGradoSel('AA')
      setTelaSel(telasConColores.find(t => t.grado === 'AA') ?? null)
      setColorSel(null)
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

  const selectGrado = (grado) => {
    setGradoSel(grado)
    setTelaSel(telas.find(t => t.grado === grado) ?? null)
    setColorSel(null)
  }

  const selectTela = (telaId) => {
    setTelaSel(telas.find(t => t.id === telaId) ?? null)
    setColorSel(null)
  }

  const selectColor = (color) => setColorSel(color)

  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

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

            {/* PASO 3 */}
            <div className={`cfg-step ${!medidaTelaActivo ? 'cfg-disabled' : ''}`}>
              <div className="cfg-step-header">
                <div className="cfg-step-number">3.</div>
                <div className="cfg-step-title">Selecciona la tela</div>
              </div>

              <div className="cfg-tabs">
                {GRADOS.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`cfg-tab ${gradoSel === g ? 'cfg-active' : ''}`}
                    onClick={() => medidaTelaActivo && selectGrado(g)}
                  >
                    Categoría {g}
                  </button>
                ))}
              </div>

              <label className="cfg-dropdown-label">Seleccionar catálogo</label>
              <select
                className="cfg-dropdown"
                disabled={!medidaTelaActivo}
                value={telaSel?.id ?? ''}
                onChange={e => selectTela(e.target.value)}
              >
                <option value="">Elige un catálogo</option>
                {telasDelGrado.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>
                ))}
              </select>

              <div className="cfg-colors-grid">
                {(telaSel?.colores ?? []).map(color => (
                  <button
                    key={color.id}
                    type="button"
                    className={`cfg-color-swatch ${colorSel?.id === color.id ? 'cfg-active' : ''}`}
                    style={{ background: color.codigo_hex || '#E2E8F0' }}
                    title={color.nombre}
                    onClick={() => selectColor(color)}
                  />
                ))}
              </div>

              {colorSel && (
                <div className="cfg-specs">
                  <div className="cfg-specs-header">
                    <div className="cfg-specs-swatch" style={{ background: colorSel.codigo_hex || '#E2E8F0' }} />
                    <div>
                      <h4 className="cfg-specs-name">{telaSel?.nombre} · {colorSel.nombre}</h4>
                      <p className="cfg-specs-cat">Categoría {telaSel?.grado}</p>
                    </div>
                  </div>
                  <div className="cfg-specs-list">
                    {colorSel.composicion && (
                      <div className="cfg-specs-row"><span>Composición</span><span>{colorSel.composicion}</span></div>
                    )}
                    {colorSel.martindale != null && (
                      <div className="cfg-specs-row"><span>Martindale</span><span>{colorSel.martindale}</span></div>
                    )}
                    {colorSel.resistencia_luz && (
                      <div className="cfg-specs-row"><span>Resistencia a la luz</span><span>{colorSel.resistencia_luz}</span></div>
                    )}
                    {colorSel.pilling && (
                      <div className="cfg-specs-row"><span>Pilling</span><span>{colorSel.pilling}</span></div>
                    )}
                    <div className="cfg-specs-row"><span>Fácil limpieza</span><span>{colorSel.facil_limpieza ? 'Sí' : 'No'}</span></div>
                    <div className="cfg-specs-row"><span>Repelente a líquidos</span><span>{colorSel.repelente_liquidos ? 'Sí' : 'No'}</span></div>
                    {colorSel.pais_origen && (
                      <div className="cfg-specs-row"><span>País de origen</span><span>{colorSel.pais_origen}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
