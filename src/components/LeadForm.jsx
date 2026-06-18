import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { nombre: '', email: '', telefono: '', mensaje: '' }

export default function LeadForm() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    const { error } = await supabase.from('leads').insert(form)
    if (error) {
      setStatus('error')
    } else {
      setStatus('ok')
      setForm(EMPTY)
    }
  }

  return (
    <section id="ct" style={{ background: 'var(--cream)', padding: '96px 52px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p className="sl rv">Contacto</p>
        <h2 className="st rv d1">Hablemos de <em>tu proyecto</em></h2>
        <form onSubmit={submit} style={{ marginTop: 42 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <input
              className="so" style={{ width: '100%', padding: '12px 16px' }}
              placeholder="Nombre" required
              value={form.nombre} onChange={e => set('nombre', e.target.value)}
            />
            <input
              className="so" style={{ width: '100%', padding: '12px 16px' }}
              placeholder="Email" type="email" required
              value={form.email} onChange={e => set('email', e.target.value)}
            />
          </div>
          <input
            className="so" style={{ width: '100%', padding: '12px 16px', marginBottom: 16 }}
            placeholder="Teléfono (opcional)"
            value={form.telefono} onChange={e => set('telefono', e.target.value)}
          />
          <textarea
            className="so" style={{ width: '100%', padding: '12px 16px', marginBottom: 24, minHeight: 120, resize: 'vertical' }}
            placeholder="Cuéntanos tu proyecto…"
            value={form.mensaje} onChange={e => set('mensaje', e.target.value)}
          />
          <button type="submit" className="bcot" disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando…' : 'Enviar Consulta'}
          </button>
          {status === 'ok' && (
            <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)', fontSize: 13, marginTop: 12 }}>
              Mensaje recibido. Te contactamos en 24h.
            </p>
          )}
          {status === 'error' && (
            <p style={{ color: '#c0392b', fontFamily: 'var(--sans)', fontSize: 13, marginTop: 12 }}>
              Error al enviar. Por favor inténtalo de nuevo.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
