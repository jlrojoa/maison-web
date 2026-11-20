import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmtMx } from '../cotizaciones/calc'
import {
  PERIODOS, ESTADOS, rangoPeriodo, enRango, resumen, cambioPct, porEstado, porMes,
  ranking, atencion, porOrigen, estadoKey, fechaCot, clienteDe,
} from './dashboardCalc'
import './dashboard.css'

// Todo lo que muestra el Dashboard se lee de la base real; cada bloque se carga por separado
// para que si uno falla (permiso, tabla vacía) el resto siga funcionando.
const todo = (q) => q.range(0, 4999).then(r => { if (r.error) throw r.error; return r.data ?? [] })

async function leerDatos() {
  const fuentes = {
    cotizaciones: () => todo(supabase.from('cotizaciones').select('id,folio,status,origen,total,created_at,emitida_at,vence_at,distribuidor_email,nombre_proyecto,cliente_nombre,cliente_datos').order('created_at', { ascending: false })),
    items: () => todo(supabase.from('cotizacion_items').select('cotizacion_id,producto_nombre,textil_nombre,cantidad,es_libre')),
    distribuidores: () => todo(supabase.from('distribuidores').select('email,nombre,empresa,nombre_comercial,activo')),
    leads: () => todo(supabase.from('leads').select('id,created_at')),
    prospectos: () => todo(supabase.from('prospectos').select('etapa')),
    ordenes: () => todo(supabase.from('ordenes_produccion').select('status')),
    productos: () => todo(supabase.from('productos').select('id,imagen_portada_url,isometrico_url').eq('activo', true)),
    precios: () => todo(supabase.from('producto_precios').select('producto_id,precio')),
    imagenes: () => todo(supabase.from('producto_imagenes').select('producto_id')),
    telas: () => todo(supabase.from('telas').select('id,grado').eq('activo', true)),
    colores: () => todo(supabase.from('tela_colores').select('id').eq('activo', true)),
  }
  const claves = Object.keys(fuentes)
  const res = await Promise.allSettled(claves.map(k => fuentes[k]()))
  const datos = {}; const fallos = []
  res.forEach((r, i) => { if (r.status === 'fulfilled') datos[claves[i]] = r.value; else { datos[claves[i]] = null; fallos.push(claves[i]) } })
  return { datos, fallos }
}

const fmtFecha = (d) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(d))
const diasHasta = (f, ahora) => Math.ceil((new Date(f).getTime() - ahora.getTime()) / 86400000)
const folioDe = (c) => (c.folio ? `BR-${c.folio}` : 'BORRADOR')
const corto = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : fmtMx(n))

function Kpi({ icon, label, valor, nota, tono }) {
  return (
    <div className="adm-stat-card dsh-kpi">
      <div className="adm-stat-icon">{icon}</div>
      <div className="adm-stat-num">{valor}</div>
      <div className="adm-stat-label">{label}</div>
      {nota != null && <div className={`dsh-nota ${tono ?? ''}`}>{nota}</div>}
    </div>
  )
}

function Bloque({ titulo, sub, children, accion }) {
  return (
    <section className="adm-card dsh-bloque">
      <div className="adm-card-header">
        <div><div className="adm-card-title">{titulo}</div>{sub && <div className="adm-card-sub">{sub}</div>}</div>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Vacio({ children }) { return <div className="adm-empty-note">{children}</div> }

function Barras({ filas, formato = (v) => v, colorDe }) {
  const max = Math.max(1, ...filas.map(f => f.valor))
  return (
    <div className="dsh-barras">
      {filas.map(f => (
        <div key={f.clave ?? f.etiqueta} className="dsh-fila">
          <div className="dsh-fila-et" title={f.etiqueta}>{f.etiqueta}</div>
          <div className="dsh-pista"><div className="dsh-relleno" style={{ width: `${(f.valor / max) * 100}%`, background: colorDe?.(f) ?? '#111827' }} /></div>
          <div className="dsh-fila-val">{formato(f.valor)}{f.extra != null && <span className="dsh-extra"> · {f.extra}</span>}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [estado, setEstado] = useState({ cargando: true, datos: null, fallos: [] })
  const [periodo, setPeriodo] = useState('90d')
  const [ahora] = useState(() => new Date())

  useEffect(() => {
    let vivo = true
    leerDatos().then(r => vivo && setEstado({ cargando: false, ...r })).catch(() => vivo && setEstado({ cargando: false, datos: null, fallos: ['todo'] }))
    return () => { vivo = false }
  }, [])

  const d = estado.datos
  const calc = useMemo(() => {
    if (!d?.cotizaciones) return null
    const cots = d.cotizaciones
    const r = rangoPeriodo(periodo, ahora)
    const enPeriodo = cots.filter(c => enRango(c, r.desde, r.hasta))
    const previo = r.previoDesde ? cots.filter(c => enRango(c, r.previoDesde, r.previoHasta)) : null
    const act = resumen(enPeriodo)
    const prev = previo ? resumen(previo) : null
    const ids = new Set(enPeriodo.filter(c => c.status !== 'borrador').map(c => c.id))
    const items = (d.items ?? []).filter(i => ids.has(i.cotizacion_id))
    return {
      act, prev, enPeriodo,
      cambio: prev ? cambioPct(act.total, prev.total) : null,
      estados: porEstado(enPeriodo, ahora),
      meses: porMes(cots, 12, ahora),
      muebles: ranking(items, 'producto_nombre', 6),
      telas: ranking(items, 'textil_nombre', 6),
      origen: porOrigen(enPeriodo),
      atn: atencion(cots, ahora),
      recientes: cots.slice(0, 8),
    }
  }, [d, periodo, ahora])

  const catalogo = useMemo(() => {
    if (!d?.productos) return null
    const preciosPor = new Map()
    for (const p of d.precios ?? []) { const a = preciosPor.get(p.producto_id) ?? []; a.push(Number(p.precio)); preciosPor.set(p.producto_id, a) }
    const conImg = new Set((d.imagenes ?? []).map(i => i.producto_id))
    const sinPrecio = d.productos.filter(p => !preciosPor.has(p.id))
    const relleno = d.productos.filter(p => { const a = preciosPor.get(p.id); return a?.length && a.every(x => x === 5000) })
    return {
      activos: d.productos.length, sinPrecio: sinPrecio.length, relleno: relleno.length,
      sinFoto: d.productos.filter(p => !p.imagen_portada_url && !conImg.has(p.id)).length,
      sinIso: d.productos.filter(p => !p.isometrico_url).length,
      telas: d.telas?.length ?? null, colores: d.colores?.length ?? null,
    }
  }, [d])

  const distNombre = useMemo(() => {
    const m = new Map()
    for (const x of d?.distribuidores ?? []) m.set(x.email, x.nombre_comercial || x.empresa || x.nombre || x.email)
    return m
  }, [d])

  const prospectosPorEtapa = useMemo(() => {
    const m = new Map(); for (const p of d?.prospectos ?? []) m.set(p.etapa || 'Sin etapa', (m.get(p.etapa || 'Sin etapa') ?? 0) + 1)
    return [...m.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor)
  }, [d])
  const leads30 = (d?.leads ?? []).filter(l => ahora.getTime() - new Date(l.created_at).getTime() <= 30 * 86400000).length
  const ordenes = useMemo(() => {
    const m = new Map(); for (const o of d?.ordenes ?? []) m.set(o.status || 'Sin estatus', (m.get(o.status || 'Sin estatus') ?? 0) + 1)
    return [...m.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor }))
  }, [d])

  const periodoLabel = PERIODOS.find(p => p.key === periodo)?.label.toLowerCase()
  const cotizacionesOk = !!calc

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <div className="adm-page-title">Dashboard</div>
          <div className="adm-breadcrumb">Resumen del negocio</div>
        </div>
        <div className="adm-topbar-actions">
          <select className="adm-select dsh-periodo" value={periodo} onChange={e => setPeriodo(e.target.value)} aria-label="Periodo">
            {PERIODOS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Link to="/admin/cotizaciones/nueva" className="adm-btn adm-btn-dark">+ Nueva cotización</Link>
          <a href="/" target="_blank" rel="noreferrer" className="adm-btn">↗ Vista pública</a>
        </div>
      </div>

      <div className="adm-content">
        {estado.cargando && <div className="adm-empty-note">Cargando cifras…</div>}
        {!estado.cargando && estado.fallos.length > 0 && (
          <div className="dsh-aviso">No se pudieron leer algunos datos ({estado.fallos.join(', ')}). Lo demás sí se muestra.</div>
        )}

        {cotizacionesOk && (
          <>
            <div className="dsh-kpis">
              <Kpi icon="💰" label={`Cotizado · ${periodoLabel}`} valor={fmtMx(calc.act.total)}
                nota={calc.cambio == null ? null : `${calc.cambio >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(calc.cambio))}% vs periodo anterior`} tono={calc.cambio == null ? '' : calc.cambio >= 0 ? 'sube' : 'baja'} />
              <Kpi icon="📄" label="Cotizaciones emitidas" valor={calc.act.n} nota={`${fmtMx(calc.act.ticket)} promedio`} />
              <Kpi icon="🤝" label="Tasa de cierre" valor={calc.act.tasaCierre == null ? '–' : `${Math.round(calc.act.tasaCierre * 100)}%`}
                nota={`${calc.act.ganadasN} ganadas · ${fmtMx(calc.act.ganadasTotal)}`} />
              <Kpi icon="⏳" label="Esperando respuesta" valor={calc.atn.pendientesN} nota={fmtMx(calc.atn.pendientesTotal)} />
              <Kpi icon="⚠" label="Vencen en 7 días" valor={calc.atn.porVencer.length} tono={calc.atn.porVencer.length ? 'baja' : ''} nota={calc.atn.vencidas.length ? `${calc.atn.vencidas.length} ya vencidas` : null} />
              <Kpi icon="✏️" label="Borradores sin emitir" valor={(d.cotizaciones).filter(c => c.status === 'borrador').length} nota={calc.atn.borradores.length ? `${calc.atn.borradores.length} con más de 7 días` : null} />
              <Kpi icon="🎯" label="Leads · últimos 30 días" valor={d.leads ? leads30 : '–'} nota={d.prospectos ? `${d.prospectos.length} prospectos` : null} />
              <Kpi icon="🏪" label="Distribuidores activos" valor={d.distribuidores ? d.distribuidores.filter(x => x.activo).length : '–'} />
            </div>

            <div className="dsh-fila2">
              <Bloque titulo="Monto cotizado por mes" sub="Últimos 12 meses · sin borradores">
                <div className="dsh-chart" role="img" aria-label="Monto cotizado por mes">
                  {(() => {
                    const max = Math.max(1, ...calc.meses.map(m => m.total))
                    return calc.meses.map((m, i) => (
                      <div key={m.label + m.anio} className="dsh-col" title={`${m.label} ${m.anio}: ${fmtMx(m.total)} · ${m.n} cotizaciones`}>
                        <div className="dsh-col-val">{m.total ? corto(m.total) : ''}</div>
                        <div className="dsh-col-barra"><div style={{ height: `${(m.total / max) * 100}%` }} className={i === calc.meses.length - 1 ? 'actual' : ''} /></div>
                        <div className="dsh-col-et">{m.label}{(m.label === 'ene' || i === 0) ? <small>{m.anio}</small> : null}</div>
                      </div>
                    ))
                  })()}
                </div>
                {calc.meses.every(m => !m.total) && <Vacio>Todavía no hay cotizaciones emitidas en estos meses.</Vacio>}
              </Bloque>

              <Bloque titulo="Cotizaciones por estatus" sub={`En ${periodoLabel}`}>
                {calc.enPeriodo.length === 0 ? <Vacio>No hay cotizaciones en este periodo.</Vacio> : (
                  <Barras filas={calc.estados.filter(e => e.n > 0).map(e => ({ clave: e.key, etiqueta: e.label, valor: e.n, extra: fmtMx(e.total), color: e.color }))} colorDe={f => f.color} />
                )}
              </Bloque>
            </div>

            <div className="dsh-fila2">
              <Bloque titulo="Requieren atención" sub="Lo que conviene revisar hoy">
                {calc.atn.porVencer.length + calc.atn.vencidas.length + calc.atn.borradores.length === 0
                  ? <Vacio>Todo al día. No hay cotizaciones por vencer ni borradores olvidados.</Vacio>
                  : (
                    <ul className="dsh-lista">
                      {calc.atn.porVencer.slice(0, 5).map(c => (
                        <li key={c.id}><span className="dsh-chip baja">Vence en {Math.max(0, diasHasta(c.vence_at, ahora))} d</span>
                          <Link to={`/admin/cotizaciones/${c.id}`}>{folioDe(c)}</Link> <span className="dsh-mut">{clienteDe(c) || c.nombre_proyecto || 'Sin cliente'}</span><b>{fmtMx(c.total)}</b></li>
                      ))}
                      {calc.atn.vencidas.slice(0, 4).map(c => (
                        <li key={c.id}><span className="dsh-chip rojo">Venció {fmtFecha(c.vence_at)}</span>
                          <Link to={`/admin/cotizaciones/${c.id}`}>{folioDe(c)}</Link> <span className="dsh-mut">{clienteDe(c) || c.nombre_proyecto || 'Sin cliente'}</span><b>{fmtMx(c.total)}</b></li>
                      ))}
                      {calc.atn.borradores.slice(0, 4).map(c => (
                        <li key={c.id}><span className="dsh-chip gris">Borrador {fmtFecha(c.created_at)}</span>
                          <Link to={`/admin/cotizaciones/${c.id}`}>{c.nombre_proyecto || 'Sin nombre'}</Link> <span className="dsh-mut">{clienteDe(c) || ''}</span><b>{fmtMx(c.total)}</b></li>
                      ))}
                    </ul>
                  )}
              </Bloque>

              <Bloque titulo="Últimas cotizaciones" accion={<Link to="/admin/cotizaciones" className="adm-btn adm-btn-sm">Ver todas</Link>}>
                {calc.recientes.length === 0 ? <Vacio>Aún no hay cotizaciones.</Vacio> : (
                  <table className="adm-table dsh-tabla">
                    <thead><tr><th>Folio</th><th>Cliente / proyecto</th><th>Estatus</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {calc.recientes.map(c => {
                        const k = estadoKey(c, ahora); const e = ESTADOS.find(x => x.key === k)
                        return (
                          <tr key={c.id}>
                            <td><Link to={`/admin/cotizaciones/${c.id}`} className="cz-folio">{folioDe(c)}</Link><div className="dsh-mut">{fmtFecha(fechaCot(c))}</div></td>
                            <td>{clienteDe(c) || '—'}<div className="dsh-mut">{c.nombre_proyecto || ''}</div></td>
                            <td><span className="dsh-chip" style={{ background: `${e.color}22`, color: e.color }}>{e.label}</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMx(c.total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </Bloque>
            </div>

            <div className="dsh-fila3">
              <Bloque titulo="Muebles más cotizados" sub={`Piezas en ${periodoLabel}`}>
                {calc.muebles.length === 0 ? <Vacio>Sin datos en este periodo.</Vacio>
                  : <Barras filas={calc.muebles.map(m => ({ etiqueta: m.nombre, valor: m.piezas, extra: `${m.cotizaciones} cot.` }))} />}
              </Bloque>
              <Bloque titulo="Telas más cotizadas" sub={`Piezas en ${periodoLabel}`}>
                {calc.telas.length === 0 ? <Vacio>Sin datos en este periodo.</Vacio>
                  : <Barras filas={calc.telas.map(m => ({ etiqueta: m.nombre, valor: m.piezas, extra: `${m.cotizaciones} cot.` }))} colorDe={() => '#8B5CF6'} />}
              </Bloque>
              <Bloque titulo="Quién cotiza" sub={`Monto por origen en ${periodoLabel}`}>
                {calc.origen.length === 0 ? <Vacio>Sin datos en este periodo.</Vacio>
                  : <Barras filas={calc.origen.map(o => ({ etiqueta: o.admin ? o.clave : (distNombre.get(o.clave) ?? o.clave), valor: o.total, extra: `${o.n} cot.` }))} formato={corto} colorDe={f => (f.etiqueta.startsWith('Admin') ? '#111827' : '#F59E0B')} />}
              </Bloque>
            </div>
          </>
        )}

        <div className="dsh-fila2">
          <Bloque titulo="Salud del catálogo" sub="Lo que falta para cotizar sin sorpresas" accion={<Link to="/admin/productos/precios" className="adm-btn adm-btn-sm">Ir a Precios</Link>}>
            {!catalogo ? <Vacio>No se pudo leer el catálogo.</Vacio> : (
              <div className="dsh-salud">
                <div><b>{catalogo.activos}</b><span>Productos activos</span></div>
                <div><b>{catalogo.telas ?? '–'}</b><span>Telas · {catalogo.colores ?? '–'} colores</span></div>
                <div className={catalogo.sinPrecio ? 'mal' : 'bien'}><b>{catalogo.sinPrecio}</b><span>Sin ningún precio</span></div>
                <div className={catalogo.relleno ? 'mal' : 'bien'}><b>{catalogo.relleno}</b><span>Con todos sus precios en $5,000 (¿de relleno?)</span></div>
                <div className={catalogo.sinFoto ? 'mal' : 'bien'}><b>{catalogo.sinFoto}</b><span>Sin foto</span></div>
                <div className={catalogo.sinIso ? 'aviso' : 'bien'}><b>{catalogo.sinIso}</b><span>Sin isométrico</span></div>
              </div>
            )}
          </Bloque>

          <Bloque titulo="Prospección y producción" accion={<Link to="/admin/sales" className="adm-btn adm-btn-sm">Ir a Sales</Link>}>
            <div className="dsh-doble">
              <div>
                <div className="dsh-sub">Prospectos por etapa</div>
                {prospectosPorEtapa.length === 0 ? <Vacio>Sin prospectos todavía.</Vacio> : <Barras filas={prospectosPorEtapa} colorDe={() => '#3B82F6'} />}
              </div>
              <div>
                <div className="dsh-sub">Órdenes de producción</div>
                {ordenes.length === 0 ? <Vacio>Aún no hay órdenes de producción.</Vacio> : <Barras filas={ordenes} colorDe={() => '#F59E0B'} />}
              </div>
            </div>
          </Bloque>
        </div>
      </div>
    </div>
  )
}
