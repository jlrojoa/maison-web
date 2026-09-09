import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../../lib/supabase'
import './sales.css'

const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
]

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
  const markersRef = useRef([])

  const [filtros, setFiltros] = useState({ tipo: '', estado: '', municipio: '', colonia: '', textoLibre: '' })
  const [resultados, setResultados] = useState([])
  const [agregados, setAgregados] = useState(new Set())
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    mapRef.current = L.map(mapDivRef.current).setView([23.6345, -102.5528], 5) // centro de México
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)
    return () => mapRef.current?.remove()
  }, [])

  const pintarMarcadores = (results) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
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
      markersRef.current.push(marker)
      bounds.push([r.lat, r.lng])
    })
    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
  }

  const buscar = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResultados([])
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

  const setF = (k, v) => setFiltros(prev => ({ ...prev, [k]: v }))

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
                {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>CIUDAD / MUNICIPIO</div>
              <input className="adm-select" style={{ width: '100%' }} placeholder="ej. Puebla" value={filtros.municipio} onChange={e => setF('municipio', e.target.value)} />
            </div>
            <div>
              <div className="sls-pipeline-label" style={{ marginBottom: 4 }}>COLONIA</div>
              <input className="adm-select" style={{ width: '100%' }} placeholder="ej. Polanco" value={filtros.colonia} onChange={e => setF('colonia', e.target.value)} />
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
            <div ref={mapDivRef} style={{ height: 520, width: '100%' }} />
          </div>

          <div className="adm-card" style={{ margin: 0, maxHeight: 520, overflowY: 'auto' }}>
            <div className="adm-card-header"><div className="adm-card-title">Resultados {resultados.length > 0 && `(${resultados.length})`}</div></div>
            {resultados.length === 0 && !loading && (
              <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>Ajusta los filtros y dale a Buscar.</div>
            )}
            {resultados.map(r => (
              <div key={r.google_place_id} className="sls-list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div className="sls-list-title">{r.nombre}</div>
                    <div className="sls-list-sub">{r.direccion}</div>
                  </div>
                  {r.rating != null && <div style={{ fontSize: 12, color: '#B45309', whiteSpace: 'nowrap' }}>★ {r.rating} ({r.rating_count})</div>}
                </div>
                <div style={{ fontSize: 11.5, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {r.telefono && <span>☎ {r.telefono}</span>}
                  {r.sitio_web && <a href={r.sitio_web} target="_blank" rel="noreferrer" style={{ color: '#111827' }}>Sitio web ↗</a>}
                </div>
                <button
                  type="button"
                  className="adm-btn"
                  style={{ alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px' }}
                  disabled={agregados.has(r.google_place_id)}
                  onClick={() => agregar(r)}
                >
                  {agregados.has(r.google_place_id) ? '✓ Agregado' : '+ Agregar a Prospectos'}
                </button>
                {!agregados.has(r.google_place_id) && (
                  <select
                    className="adm-select"
                    style={{ fontSize: 11.5, padding: '4px 6px', alignSelf: 'flex-start', marginTop: -4 }}
                    value={scores[r.google_place_id] || ''}
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
