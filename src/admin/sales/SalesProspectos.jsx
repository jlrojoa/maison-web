import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './sales.css'

const ETAPAS = ['Nuevo', 'Contactado', 'Interesado', 'Muestrario', 'Cotización', 'Negociación', 'Cliente']
const TIPOS = [
  { value: 'mueblería', label: 'Mueblería' },
  { value: 'diseñador_interior', label: 'Diseñador de interiores' },
  { value: 'arquitecto', label: 'Arquitecto' },
  { value: 'fabrica_muebles', label: 'Fábrica de muebles' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'otro', label: 'Otro' },
]
const tipoLabel = v => TIPOS.find(t => t.value === v)?.label ?? v
const SCORE_COLOR = { A: '#059669', B: '#D97706', C: '#9CA3AF' }

export default function SalesProspectos() {
  const [prospectos, setProspectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)

  const cargar = () => {
    setLoading(true)
    supabase
      .from('prospectos')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProspectos(data ?? [])
        setLoading(false)
      })
  }

  useEffect(cargar, [])

  const actualizar = async (id, campo, valor) => {
    setSavingId(id)
    setProspectos(prev => prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p)))
    await supabase.from('prospectos').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('id', id)
    setSavingId(null)
  }

  const toggleSeleccion = id => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    setSeleccionados(prev => (prev.size === prospectos.length ? new Set() : new Set(prospectos.map(p => p.id))))
  }

  const prospectosSeleccionados = prospectos.filter(p => seleccionados.has(p.id))
  const seleccionadosConEmail = prospectosSeleccionados.filter(p => p.email)

  const onEnviado = (idsEnviados) => {
    // Refleja localmente lo que el endpoint ya guardó, sin esperar un refetch.
    const hoy = new Date().toISOString()
    setProspectos(prev => prev.map(p => {
      if (!idsEnviados.includes(p.id)) return p
      return { ...p, etapa: p.etapa === 'Nuevo' ? 'Contactado' : p.etapa, updated_at: hoy }
    }))
    setSeleccionados(new Set())
    setModalOpen(false)
    cargar()
  }

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Prospectos</div>
          <div className="adm-breadcrumb">Sales Tools <b>› Prospectos</b> · {prospectos.length} registro{prospectos.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="adm-topbar-actions">
          <span style={{ fontSize: 12.5, color: '#6B7280', alignSelf: 'center', marginRight: 4 }}>
            {seleccionados.size > 0 ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}` : ''}
          </span>
          <button
            className="adm-btn adm-btn-dark"
            disabled={seleccionadosConEmail.length === 0}
            style={seleccionadosConEmail.length === 0 ? { opacity: 0.5, cursor: 'default' } : undefined}
            onClick={() => setModalOpen(true)}
          >
            Enviar correo{seleccionadosConEmail.length > 0 ? ` (${seleccionadosConEmail.length})` : ''}
          </button>
        </div>
      </div>

      <div className="adm-content">
        <div className="sls-note">
          Aquí caen dos fuentes: los mensajes reales del formulario del sitio (fuente "Sitio web") y lo que agregues desde el <b>Prospector</b>. Etapa y calificación se guardan de verdad.
          Selecciona prospectos con el checkbox para mandarles un correo (solo se envía a los que tengan email).
        </div>

        <div className="adm-card" style={{ margin: 0, overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={prospectos.length > 0 && seleccionados.size === prospectos.length}
                    onChange={toggleTodos}
                    disabled={prospectos.length === 0}
                  />
                </th>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Fuente</th>
                <th>Score</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9CA3AF' }}>Cargando…</td></tr>
              ) : prospectos.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9CA3AF' }}>No hay prospectos aún — agrega desde el Prospector</td></tr>
              ) : prospectos.map(p => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)} />
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: '#9CA3AF' }}>
                    {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" style={{ color: '#111827' }}>{p.nombre} ↗</a> : p.nombre}
                  </td>
                  <td style={{ color: '#6B7280' }}>{tipoLabel(p.tipo)}</td>
                  <td style={{ color: '#9CA3AF' }}>{[p.colonia, p.municipio, p.estado].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>{p.telefono || '—'}</td>
                  <td>
                    <input
                      className="adm-input"
                      style={{ minWidth: 0, width: 160, padding: '6px 8px', fontSize: 12.5 }}
                      type="email"
                      placeholder="sin email"
                      defaultValue={p.email ?? ''}
                      onBlur={e => {
                        const valor = e.target.value.trim() || null
                        if (valor !== p.email) actualizar(p.id, 'email', valor)
                      }}
                    />
                  </td>
                  <td><span className="sls-etapa-badge">{p.fuente === 'leads_sitio' ? 'Sitio web' : p.fuente === 'google_places' ? 'Google' : 'Manual'}</span></td>
                  <td>
                    <select
                      className="adm-select"
                      style={{ minWidth: 0, padding: '6px 8px', fontSize: 12, color: p.score ? SCORE_COLOR[p.score] : undefined, fontWeight: p.score ? 700 : 400 }}
                      value={p.score ?? ''}
                      onChange={e => actualizar(p.id, 'score', e.target.value || null)}
                    >
                      <option value="">Sin calificar</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="adm-select"
                      style={{ minWidth: 0, padding: '6px 8px', fontSize: 12, opacity: savingId === p.id ? 0.5 : 1 }}
                      value={p.etapa}
                      onChange={e => actualizar(p.id, 'etapa', e.target.value)}
                    >
                      {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EnviarCorreoModal
        open={modalOpen}
        prospectos={prospectosSeleccionados}
        onClose={() => setModalOpen(false)}
        onEnviado={onEnviado}
      />
    </div>
  )
}

function EnviarCorreoModal({ open, prospectos, onClose, onEnviado }) {
  const [catalogos, setCatalogos] = useState([])
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [catalogoId, setCatalogoId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    supabase
      .from('catalogos')
      .select('id, titulo, nombre_archivo, tipo')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data }) => {
        const lista = data ?? []
        setCatalogos(lista)
        // Por defecto la presentación (tipo "aviso"), si existe; si no, el primero de la lista.
        const presentacion = lista.find(c => c.tipo === 'aviso') ?? lista[0]
        setCatalogoId(presentacion?.id ?? '')
      })
  }, [open])

  useEffect(() => {
    if (!open) {
      setAsunto('')
      setMensaje('')
      setEnviando(false)
      setError(null)
    }
  }, [open])

  const conEmail = prospectos.filter(p => p.email)
  const sinEmail = prospectos.filter(p => !p.email)

  const enviar = async () => {
    if (!asunto.trim() || !mensaje.trim() || conEmail.length === 0) return
    setEnviando(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/prospector-enviar-correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          prospectoIds: conEmail.map(p => p.id),
          asunto: asunto.trim(),
          mensaje: mensaje.trim(),
          catalogoId: catalogoId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'No se pudo enviar el correo')
        setEnviando(false)
        return
      }
      onEnviado(data.enviados ?? conEmail.map(p => p.id))
    } catch (err) {
      setError('Error de red al enviar')
      setEnviando(false)
    }
  }

  return (
    <div className={`adm-modal-overlay ${open ? 'adm-open' : ''}`} onClick={e => { if (e.target === e.currentTarget && !enviando) onClose() }}>
      <div className="adm-modal-box" style={{ width: 480 }}>
        <div className="adm-modal-header">
          <div className="adm-modal-title">Enviar correo a prospectos</div>
        </div>
        <div className="adm-modal-body">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Destinatarios ({conEmail.length})
            </div>
            <div style={{ maxHeight: 110, overflowY: 'auto', border: '1px solid #F3F4F6', borderRadius: 8, padding: '8px 10px' }}>
              {conEmail.map(p => (
                <div key={p.id} style={{ fontSize: 12.5, padding: '2px 0' }}>
                  {p.nombre} <span style={{ color: '#9CA3AF' }}>· {p.email}</span>
                </div>
              ))}
              {conEmail.length === 0 && <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>Ninguno de los seleccionados tiene email.</div>}
            </div>
            {sinEmail.length > 0 && (
              <div style={{ fontSize: 11, color: '#D97706', marginTop: 6 }}>
                {sinEmail.length} sin email — no recibirán este correo: {sinEmail.map(p => p.nombre).join(', ')}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Adjunto</div>
            <select className="adm-select" style={{ width: '100%' }} value={catalogoId} onChange={e => setCatalogoId(e.target.value)}>
              <option value="">Sin adjunto</option>
              {catalogos.map(c => (
                <option key={c.id} value={c.id}>{c.titulo}{c.nombre_archivo ? ` (${c.nombre_archivo})` : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Asunto</div>
            <input className="adm-input" style={{ width: '100%' }} value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Presentación Brendell" />
          </div>

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Mensaje</div>
            <textarea
              className="adm-textarea"
              style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Escribe el mensaje que verán los prospectos..."
            />
          </div>

          {error && <div style={{ fontSize: 12.5, color: '#DC2626', marginTop: 12 }}>{error}</div>}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn" onClick={onClose} disabled={enviando}>Cancelar</button>
          <button
            className="adm-btn adm-btn-dark"
            onClick={enviar}
            disabled={enviando || !asunto.trim() || !mensaje.trim() || conEmail.length === 0}
            style={(enviando || !asunto.trim() || !mensaje.trim() || conEmail.length === 0) ? { opacity: 0.5, cursor: 'default' } : undefined}
          >
            {enviando ? 'Enviando…' : `Enviar a ${conEmail.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
