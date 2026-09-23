import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase'
import './sales.css'

const TIPOS = [
  { value: '', label: 'Todos / texto libre' },
  { value: 'mueblería', label: 'Mueblería' },
  { value: 'diseñador_interior', label: 'Diseñador de interiores' },
  { value: 'arquitecto', label: 'Arquitecto' },
  { value: 'fabrica_muebles', label: 'Fábrica de muebles' },
  { value: 'hotel', label: 'Hotel' },
]

const COLOR_TIPO = {
  'mueblería': '#111827', diseñador_interior: '#8B6F47', arquitecto: '#6B7280',
  fabrica_muebles: '#059669', hotel: '#B45309', '': '#374151',
}

const SCORES = [
  { value: 'A', label: 'A · Alto potencial' },
  { value: 'B', label: 'B · Medio' },
  { value: 'C', label: 'C · Bajo / dudoso' },
]

export default function SalesProspector() {
  const mapDivRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({}) // google_place_id -> marker
  const itemRefs = useRef({}) // google_place_id -> DOM node

  const [filtros, setFiltros] = useState({ tipo: '', estado: '', municipio: '', colonia: '', textoLibre: '' })
  const [estados, setEstados] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [colonias, setColonias] = useState([])
  const [colomex, setColomex] = useState(null) // JSON completo (todas las colonias), cargado una vez
  const [zonasPremium, setZonasPremium] = useState([]) // filas de zonas_premium, cargadas una vez
  const [verTodasColonias, setVerTodasColonias] = useState(false)

  const [resultados, setResultados] = useState([])
  const [agregados, setAgregados] = useState(new Set())
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  // "Buscar en esta zona": solo aparece cuando el usuario mueve/hace zoom al
  // mapa a mano. suppressAutoMoveRef evita que nuestros propios fitBounds/
  // setView (al pintar resultados o seleccionar un pin) lo disparen.
  //
  // OJO: no basta con poner suppressAutoMoveRef=true y esperar a que el
  // siguiente 'moveend' lo regrese a false. Leaflet NO dispara 'moveend' si
  // el setView/fitBounds resulta ser un no-op (el pin clickeado ya estaba
  // en el centro/zoom actual — típico justo después de un fitBounds). Si
  // eso pasa, el flag se queda atorado en true y el próximo movimiento real
  // del usuario también se suprime — el botón nunca aparece. Por eso la
  // supresión se limpia sola con un timeout, no depende de que 'moveend'
  // llegue a apagarla.
  const suppressAutoMoveRef = useRef(false)
  const suppressTimeoutRef = useRef(null)
  const [showBuscarZona, setShowBuscarZona] = useState(false)

  const suprimirProximoMovimiento = () => {
    suppressAutoMoveRef.current = true
    clearTimeout(suppressTimeoutRef.current)
    // 400ms > duración por defecto de las animaciones de pan/zoom de Leaflet (250ms).
    suppressTimeoutRef.current = setTimeout(() => { suppressAutoMoveRef.current = false }, 400)
  }

  // Mapa Leaflet
  useEffect(() => {
    suprimirProximoMovimiento() // el setView inicial también dispara 'moveend' (async) — no es el usuario
    mapRef.current = L.map(mapDivRef.current).setView([23.6345, -102.5528], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)
    mapRef.current.on('moveend', () => {
      if (suppressAutoMoveRef.current) return
      setShowBuscarZona(true)
    })
    return () => {
      clearTimeout(suppressTimeoutRef.current)
      mapRef.current?.remove()
    }
  }, [])

  // Estados: de la tabla mx_municipios (evita mantener una lista aparte).
  // mx_municipios tiene ~2457 filas — el .limit() del cliente NO basta,
  // PostgREST tiene su propio tope de fila (db-max-rows, 1000 por defecto en
  // Supabase) que lo ignora y corta la respuesta ahí de todos modos. Hay que
  // paginar con .range() y acumular hasta que una página venga incompleta.
  useEffect(() => {
    async function cargarEstados() {
      const porPagina = 1000
      let desde = 0
      let filas = []
      while (true) {
        const { data, error } = await supabase.from('mx_municipios').select('estado').range(desde, desde + porPagina - 1)
        if (error || !data || data.length === 0) break
        filas = filas.concat(data)
        if (data.length < porPagina) break
        desde += data.length
      }
      setEstados([...new Set(filas.map(d => d.estado))].sort())
    }
    cargarEstados()
    fetch('/data/colonias-mx.json').then(r => r.json()).then(setColomex).catch(() => {})
    supabase.from('zonas_premium').select('estado, municipio, colonia, nivel').order('colonia')
      .then(({ data }) => setZonasPremium(data ?? []))
  }, [])

  // Municipios en cascada según estado elegido
  useEffect(() => {
    if (!filtros.estado) { setMunicipios([]); return }
    supabase.from('mx_municipios').select('municipio').eq('estado', filtros.estado).order('municipio')
      .then(({ data }) => setMunicipios((data ?? []).map(d => d.municipio)))
  }, [filtros.estado])

  // Colonias en cascada según municipio elegido. Por default solo se ofrecen
  // las zonas curadas en zonas_premium (evita que aparezcan colonias sin
  // filtrar, ej. Tepito, entre miles de opciones de mx_colonias). El toggle
  // "Ver todas las colonias" cambia a la lista completa del JSON.
  useEffect(() => {
    if (!filtros.estado || !filtros.municipio) { setColonias([]); return }
    if (verTodasColonias) {
      const lista = colomex ? (colomex[`${filtros.estado}|${filtros.municipio}`] ?? []) : []
      setColonias(lista)
    } else {
      const lista = zonasPremium
        .filter(z => z.estado === filtros.estado && z.municipio === filtros.municipio)
        .map(z => z.colonia)
      setColonias(lista)
    }
  }, [filtros.estado, filtros.municipio, colomex, zonasPremium, verTodasColonias])

  // fit=false cuando los resultados vienen de "Buscar en esta zona": el
  // usuario ya dejó el mapa donde quería verlo, no se debe reencuadrar.
  const pintarMarcadores = (results, { fit = true } = {}) => {
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}
    const bounds = []
    results.forEach(r => {
      if (r.lat == null || r.lng == null) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${COLOR_TIPO[filtros.tipo] || '#374151'};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
      })
      const marker = L.marker([r.lat, r.lng], { icon }).addTo(mapRef.current)
      marker.bindPopup(`<b>${r.nombre}</b><br>${r.direccion ?? ''}`)
      marker.on('click', () => {
        setSeleccionado(r.google_place_id)
        itemRefs.current[r.google_place_id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      markersRef.current[r.google_place_id] = marker
      bounds.push([r.lat, r.lng])
    })
    if (fit && bounds.length) {
      suprimirProximoMovimiento()
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
    }
  }

  const seleccionarDesdeLista = (id) => {
    setSeleccionado(id)
    const marker = markersRef.current[id]
    if (marker) {
      suprimirProximoMovimiento()
      mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 14))
      marker.openPopup()
    }
  }

  const buscar = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResultados([])
    setSeleccionado(null)
    setShowBuscarZona(false)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/prospector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(filtros),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error en la búsqueda'); return }
      setResultados(data.results)
      pintarMarcadores(data.results)
    } catch {
      setError('No se pudo conectar con el buscador')
    } finally {
      setLoading(false)
    }
  }

  // Botón "Buscar en esta zona": ignora estado/municipio/colonia del
  // formulario y usa los límites (bounds) actuales del mapa visible.
  const buscarEnZona = async () => {
    setLoading(true)
    setError(null)
    setSeleccionado(null)
    const b = mapRef.current.getBounds()
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/prospector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          tipo: filtros.tipo,
          textoLibre: filtros.textoLibre,
          bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error en la búsqueda'); return }
      setResultados(data.results)
      pintarMarcadores(data.results, { fit: false })
      setShowBuscarZona(false)
    } catch {
      setError('No se pudo conectar con el buscador')
    } finally {
      setLoading(false)
    }
  }

  const agregar = async (r) => {
    const { error: upsertError } = await supabase.from('prospectos').upsert({
      google_place_id: r.google_place_id,
      nombre: r.nombre,
      tipo: filtros.tipo || 'otro',
      direccion: r.direccion,
      estado: r.estado,
      municipio: r.municipio,
      colonia: r.colonia,
      codigo_postal: r.codigo_postal,
      telefono: r.telefono,
      sitio_web: r.sitio_web,
      rating: r.rating,
      lat: r.lat,
      lng: r.lng,
      fuente: 'google_places',
      score: scores[r.google_place_id] || null,
    }, { onConflict: 'google_place_id' })

    if (!upsertError) setAgregados(prev => new Set(prev).add(r.google_place_id))
  }

  const setF = (k, v) => {
    setFiltros(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'estado') { next.municipio = ''; next.colonia = '' }
      if (k === 'municipio') next.colonia = ''
      return next
    })
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Prospector</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Prospector</b></div>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-card" style={{ marginBottom: 20 }}>
          <form onSubmit={buscar} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>TIPO DE NEGOCIO</div>
              <select className="adm-select" style={{ width: '100%' }} value={filtros.tipo} onChange={e => setF('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>ESTADO</div>
              <select className="adm-select" style={{ width: '100%' }} value={filtros.estado} onChange={e => setF('estado', e.target.value)}>
                <option value="">Todos</option>
                {estados.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>MUNICIPIO</div>
              <select className="adm-select" style={{ width: '100%' }} value={filtros.municipio} onChange={e => setF('municipio', e.target.value)} disabled={!filtros.estado}>
                <option value="">{filtros.estado ? 'Todos' : 'Elige un estado primero'}</option>
                {municipios.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>COLONIA</div>
              <select className="adm-select" style={{ width: '100%' }} value={filtros.colonia} onChange={e => setF('colonia', e.target.value)} disabled={!filtros.municipio}>
                <option value="">{filtros.municipio ? 'Todas' : 'Elige un municipio primero'}</option>
                {colonias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="sls-colonia-toggle">
                <input type="checkbox" checked={verTodasColonias} onChange={e => setVerTodasColonias(e.target.checked)} />
                Ver todas las colonias
              </label>
              {!verTodasColonias && filtros.municipio && colonias.length === 0 && (
                <div className="sls-colonia-empty-hint">Sin zonas premium en este municipio — prueba "Ver todas las colonias".</div>
              )}
            </div>
            <button type="submit" className="adm-btn adm-btn-dark" disabled={loading}>{loading ? 'Buscando…' : 'Buscar'}</button>
          </form>
          <input
            className="adm-select" style={{ width: '100%', marginTop: 10 }}
            placeholder="Texto libre opcional (ej. “diseño de interiores boho”, “hotel boutique”)"
            value={filtros.textoLibre} onChange={e => setF('textoLibre', e.target.value)}
          />
          {error && <div style={{ color: '#DC2626', fontSize: 12.5, marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
          <div className="adm-card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
            <div className="sls-map-wrap">
              <div ref={mapDivRef} style={{ height: 520, width: '100%' }} />
              {showBuscarZona && (
                <button
                  type="button"
                  className="sls-map-search-area"
                  onClick={buscarEnZona}
                  disabled={loading}
                >
                  {loading ? 'Buscando…' : '🔍 Buscar en esta zona'}
                </button>
              )}
            </div>
          </div>

          <div className="adm-card" style={{ margin: 0, maxHeight: 520, overflowY: 'auto' }}>
            <div className="adm-card-header"><div className="adm-card-title">Resultados {resultados.length > 0 && `(${resultados.length})`}</div></div>
            {resultados.length === 0 && !loading && (
              <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>Ajusta los filtros y dale a Buscar.</div>
            )}
            {resultados.map(r => (
              <div
                key={r.google_place_id}
                ref={el => { itemRefs.current[r.google_place_id] = el }}
                className="sls-list-item"
                onClick={() => seleccionarDesdeLista(r.google_place_id)}
                style={{
                  flexDirection: 'column', alignItems: 'stretch', gap: 6, cursor: 'pointer',
                  background: seleccionado === r.google_place_id ? '#F3F4F6' : 'transparent',
                  borderRadius: 8, padding: '10px 8px', margin: '0 -8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div className="sls-list-title">{r.nombre}</div>
                    <div className="sls-list-sub">{r.direccion}</div>
                  </div>
                  {r.rating != null && <div style={{ fontSize: 12, color: '#B45309', whiteSpace: 'nowrap' }}>★ {r.rating} ({r.rating_count})</div>}
                </div>
                <div style={{ fontSize: 11.5, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {r.telefono && <span>☎ {r.telefono}</span>}
                  {r.sitio_web && <a href={r.sitio_web} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#111827' }}>Sitio web ↗</a>}
                </div>
                <button
                  type="button"
                  className="adm-btn"
                  style={{ alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px' }}
                  disabled={agregados.has(r.google_place_id)}
                  onClick={e => { e.stopPropagation(); agregar(r) }}
                >
                  {agregados.has(r.google_place_id) ? '✓ Agregado' : '+ Agregar a Prospectos'}
                </button>
                {!agregados.has(r.google_place_id) && (
                  <select
                    className="adm-select"
                    style={{ fontSize: 11.5, padding: '4px 6px', alignSelf: 'flex-start', marginTop: -4 }}
                    value={scores[r.google_place_id] || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setScores(prev => ({ ...prev, [r.google_place_id]: e.target.value }))}
                  >
                    <option value="">Calificar antes de agregar (opcional)</option>
                    {SCORES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
