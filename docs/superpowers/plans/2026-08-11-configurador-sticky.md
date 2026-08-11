# Configurador v2 (sticky + pasos colapsables) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the sticky-image + collapsible-steps configurador layout for Camas (con Familia/Cabecera/Pata), Sofás e Individuales, Escuadras y Chaise Lounge, sin tocar Modulares/Mesas/Butacas ni el flujo legado.

**Architecture:** `Configurador.jsx` sigue siendo el entry point (Paso 0 sin cambios). Dos componentes nuevos (`CamasConfigurador`, `GenericStickyConfigurador`) se montan condicionalmente según `tipoSel.slug`, construidos sobre dos hooks compartidos (`useProductoConfig`, `useCotizacion`) y tres componentes presentacionales compartidos (`StepCard`, `StickyViewer`, `CotizacionModal`). El JSX/estado legado se deja intacto — se duplica lógica en vez de refactorizarlo, a propósito, para no arriesgar Modulares/Mesas/Butacas.

**Tech Stack:** React 18 + Vite, react-router-dom v7, Supabase JS v2 (`@supabase/supabase-js`). CSS plano (sin framework). Sin framework de testing en el repo — la verificación de cada tarea es: build limpio + verificación manual en el navegador con el servidor `vite dev` corriendo (mismo método usado en todo este proyecto hasta ahora).

## Global Constraints

- No tocar `Configurador.css`, ni ningún JSX/estado del flujo legado (Paso 1–4 actuales) dentro de `Configurador.jsx`. Solo se agrega código nuevo antes del `return` legado.
- No tocar `src/pages/Configurador.jsx` fuera de: nuevos imports, el cálculo de `initialProducto`, y los dos bloques de `if` con `return` temprano.
- Paleta de colores de los componentes nuevos debe usar los mismos tokens que ya usa `Configurador.css` (`#0F172A` ink, `#E2E8F0` borde, `#64748B` texto muted, `#F1F5F9` fondo neutro) — no copiar la paleta del mockup HTML tal cual.
- Prefijo de clases CSS nuevas: `cfg2-` (para no chocar con `.cfg-*` del layout legado, que sigue vivo en el mismo archivo para Modulares/Mesas/Butacas).
- Breakpoint mobile: `1080px` (igual que el mockup).
- Ningún archivo nuevo debe superar ~200 líneas; si un componente crece más de eso, es señal de que hace falta partirlo — avisar antes de seguir en vez de forzarlo.
- Spec de referencia (fuente de verdad de todas las decisiones de producto): `docs/superpowers/specs/2026-08-10-configurador-sticky-design.md`.

---

## File Structure

```
src/pages/configurador/
  format.js                       NUEVO — fmt() de precio, compartido
  useProductoConfig.js            NUEVO — hook: tamaños/telas/galería/precio de 1 producto
  useCotizacion.js                NUEVO — hook: modal Crear cotización / Guardar borrador
  StepCard.jsx                    NUEVO — tarjeta numerada colapsable
  StickyViewer.jsx                NUEVO — columna de imagen sticky + miniaturas
  CotizacionModal.jsx             NUEVO — modal (extraído del legado)
  ConfiguradorSticky.css          NUEVO — estilos del layout nuevo (prefijo cfg2-)
  CamasConfigurador.jsx           NUEVO — Familia → Cabecera → Pata → Tamaño → Tela
  GenericStickyConfigurador.jsx   NUEVO — Modelo → Tamaño → Tela

src/pages/Configurador.jsx        MODIFICADO — branching + cálculo de initialProducto
```

---

### Task 1: `format.js` + `useProductoConfig` + `useCotizacion`

**Files:**
- Create: `src/pages/configurador/format.js`
- Create: `src/pages/configurador/useProductoConfig.js`
- Create: `src/pages/configurador/useCotizacion.js`

**Interfaces:**
- Produces: `fmt(valorNumerico) => string` desde `format.js`.
- Produces: `useProductoConfig(producto, distribuidor) => { configuraciones, medidaSel, setMedidaSel, telas, telasDelGrado, gradoSel, selectGrado(grado), telaSel, selectTela(telaId), colorSel, setColorSel, galeria, activeImgUrl, setActiveImgUrl, precioLookup }` desde `useProductoConfig.js`. `producto` es `null` o un objeto con al menos `{ id, isometrico_url }`.
- Produces: `useCotizacion({ distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup }) => { cotizModo, cotizForm, setCotizForm, cotizSaving, cotizResultado, puedeGuardar, abrirCotizModal(modo), cerrarCotizModal(), confirmarCotizacion() }` desde `useCotizacion.js`.

- [ ] **Step 1: Crear `format.js`**

```js
// src/pages/configurador/format.js
export const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
```

- [ ] **Step 2: Crear `useProductoConfig.js`**

```js
// src/pages/configurador/useProductoConfig.js
//
// Dado un producto (con id e isometrico_url), carga sus tamaños, telas,
// galería y precio, con TODO arrancando en un valor por defecto (a diferencia
// del flujo legado en Configurador.jsx, que arranca en null y bloquea cada
// paso hasta que el usuario elige). Ver spec:
// docs/superpowers/specs/2026-08-10-configurador-sticky-design.md
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const GRADOS_ORDEN = ['AA', 'A', 'B', 'C']

export function useProductoConfig(producto, distribuidor) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [medidaSel, setMedidaSel] = useState(null)

  const [telas, setTelas] = useState([])
  const [gradoSel, setGradoSel] = useState(null)
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)

  const [galeria, setGaleria] = useState([])
  const [activeImgUrl, setActiveImgUrl] = useState(null)

  const [precios, setPrecios] = useState([])

  // Dependencia en producto?.id (no en el objeto producto) para no recargar
  // si el objeto se recalcula (ej. useMemo del padre) pero sigue siendo el
  // mismo producto.
  useEffect(() => {
    if (!producto) {
      setConfiguraciones([]); setMedidaSel(null)
      setTelas([]); setGradoSel(null); setTelaSel(null); setColorSel(null)
      setGaleria([]); setActiveImgUrl(null)
      return
    }
    let ignore = false
    async function load() {
      const [cfgRes, telasRes, imgRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', producto.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
        supabase.from('producto_imagenes').select('*')
          .eq('producto_id', producto.id).order('orden'),
      ])
      if (ignore) return

      const cfgs = cfgRes.data ?? []
      setConfiguraciones(cfgs)
      setMedidaSel(cfgs[0] ?? null)

      const telasConColores = (telasRes.data ?? []).map(t => ({
        ...t,
        colores: (t.colores ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden),
      }))
      setTelas(telasConColores)

      const gradoDefault = GRADOS_ORDEN.find(g => telasConColores.some(t => t.grado === g)) ?? null
      const telaDefault = telasConColores.find(t => t.grado === gradoDefault) ?? null
      setGradoSel(gradoDefault)
      setTelaSel(telaDefault)
      setColorSel(telaDefault?.colores?.[0] ?? null)

      const imgs = imgRes.data ?? []
      setGaleria(imgs)
      setActiveImgUrl(producto.isometrico_url ?? imgs[0]?.url ?? null)
    }
    load()
    return () => { ignore = true }
  }, [producto?.id])

  useEffect(() => {
    if (!distribuidor || !producto || !medidaSel) { setPrecios([]); return }
    let ignore = false
    async function load() {
      const { data } = await supabase.from('producto_precios').select('grado, precio')
        .eq('producto_id', producto.id).eq('configuracion_id', medidaSel.id)
      if (!ignore) setPrecios(data ?? [])
    }
    load()
    return () => { ignore = true }
  }, [distribuidor, producto?.id, medidaSel?.id])

  const precioLookup = useMemo(() => {
    const row = precios.find(p => p.grado === telaSel?.grado)
    return row ? row.precio : null
  }, [precios, telaSel])

  const selectGrado = (grado) => {
    setGradoSel(grado)
    const t = telas.find(x => x.grado === grado) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }

  const selectTela = (telaId) => {
    const t = telas.find(x => x.id === telaId) ?? null
    setTelaSel(t)
    setColorSel(t?.colores?.[0] ?? null)
  }

  const telasDelGrado = telas.filter(t => t.grado === gradoSel)

  return {
    configuraciones, medidaSel, setMedidaSel,
    telas, telasDelGrado, gradoSel, selectGrado, telaSel, selectTela, colorSel, setColorSel,
    galeria, activeImgUrl, setActiveImgUrl,
    precioLookup,
  }
}
```

- [ ] **Step 3: Crear `useCotizacion.js`**

```js
// src/pages/configurador/useCotizacion.js
//
// Extraccion 1:1 de la logica de cotizacion que ya existe en Configurador.jsx
// (Paso 4 legado), parametrizada para poder usarse desde los componentes
// nuevos. Mismas tablas (cotizaciones, cotizacion_items), misma RPC
// (emitir_cotizacion). Sin cambios de comportamiento, solo de ubicacion.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function useCotizacion({ distribuidor, producto, medidaSel, telaSel, colorSel, precioLookup }) {
  const [cotizModo, setCotizModo] = useState(null) // null | 'borrador' | 'emitir'
  const [cotizForm, setCotizForm] = useState({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
  const [cotizSaving, setCotizSaving] = useState(false)
  const [cotizResultado, setCotizResultado] = useState(null)

  const puedeGuardar = !!(distribuidor && producto && medidaSel && telaSel && colorSel && precioLookup != null)

  const abrirCotizModal = (modo) => {
    if (!puedeGuardar) return
    setCotizForm({ cliente_nombre: '', cliente_email: '', cliente_telefono: '', markup_pct: '0' })
    setCotizResultado(null)
    setCotizModo(modo)
  }

  const cerrarCotizModal = () => { if (!cotizSaving) setCotizModo(null) }

  const confirmarCotizacion = async () => {
    if (!cotizForm.cliente_nombre.trim()) return alert('El nombre del cliente es obligatorio.')
    setCotizSaving(true)
    try {
      const markup = parseFloat(cotizForm.markup_pct) || 0
      const precioCliente = Math.round(precioLookup * (1 + markup / 100))

      const { data: cot, error: cotErr } = await supabase.from('cotizaciones').insert({
        distribuidor_email: distribuidor.email,
        nombre_proyecto: `${producto.nombre} · ${medidaSel.nombre}`,
        status: 'borrador',
        total: precioCliente,
        markup_pct: markup,
        cliente_nombre: cotizForm.cliente_nombre.trim(),
        cliente_email: cotizForm.cliente_email.trim() || null,
        cliente_telefono: cotizForm.cliente_telefono.trim() || null,
      }).select().single()
      if (cotErr) throw cotErr

      const { error: itemErr } = await supabase.from('cotizacion_items').insert({
        cotizacion_id: cot.id,
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        imagen_url: producto.isometrico_url ?? null,
        configuracion_nombre: medidaSel.nombre,
        medidas: medidaSel.dimensiones ?? null,
        textil_nombre: `${telaSel.nombre} (${telaSel.grado}) · ${colorSel.nombre}`,
        precio_unitario: precioLookup,
        precio_cliente: precioCliente,
        cantidad: 1,
      })
      if (itemErr) throw itemErr

      if (cotizModo === 'emitir') {
        const { error: emitErr } = await supabase.rpc('emitir_cotizacion', { cotizacion_uuid: cot.id })
        if (emitErr) throw emitErr
      }

      setCotizResultado({ folio: cot.folio, modo: cotizModo })
    } catch (err) {
      alert(`Error al guardar la cotización: ${err.message}`)
    } finally {
      setCotizSaving(false)
    }
  }

  return {
    cotizModo, cotizForm, setCotizForm, cotizSaving, cotizResultado,
    puedeGuardar, abrirCotizModal, cerrarCotizModal, confirmarCotizacion,
  }
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build termina sin errores (no hay todavía ningún componente que importe estos hooks, así que esto solo confirma que la sintaxis es válida).

- [ ] **Step 5: Commit**

```bash
git add src/pages/configurador/format.js src/pages/configurador/useProductoConfig.js src/pages/configurador/useCotizacion.js
git commit -m "feat: hooks compartidos useProductoConfig/useCotizacion del configurador v2"
```

---

### Task 2: `StepCard`, `StickyViewer`, `CotizacionModal`

**Files:**
- Create: `src/pages/configurador/StepCard.jsx`
- Create: `src/pages/configurador/StickyViewer.jsx`
- Create: `src/pages/configurador/CotizacionModal.jsx`

**Interfaces:**
- Consumes: `fmt` de `./format.js`.
- Produces: `StepCard({ number, title, value, defaultOpen, children })` (default export).
- Produces: `StickyViewer({ activeImgUrl, thumbnails, onSelectThumbnail, altText })` (default export). `thumbnails` es un array de `{ id, url, alt }`.
- Produces: `CotizacionModal({ cotizModo, cotizResultado, cotizForm, setCotizForm, cotizSaving, precioLookup, onConfirm, onClose })` (default export).

- [ ] **Step 1: Crear `StepCard.jsx`**

```jsx
// src/pages/configurador/StepCard.jsx
import { useState } from 'react'

export default function StepCard({ number, title, value, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`cfg2-step ${open ? 'cfg2-open' : ''}`}>
      <div className="cfg2-step-head" onClick={() => setOpen(o => !o)}>
        <div className="cfg2-step-num">{number}</div>
        <div className="cfg2-step-title">{title}</div>
        {value && <div className="cfg2-step-value">{value}</div>}
        <div className="cfg2-step-edit">✎</div>
      </div>
      {open && <div className="cfg2-step-body">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Crear `StickyViewer.jsx`**

```jsx
// src/pages/configurador/StickyViewer.jsx
export default function StickyViewer({ activeImgUrl, thumbnails, onSelectThumbnail, altText }) {
  return (
    <div className="cfg2-viewer">
      <div className={`cfg2-stage ${activeImgUrl ? 'cfg2-has-img' : ''}`}>
        {activeImgUrl && <img src={activeImgUrl} alt={altText} />}
      </div>
      {thumbnails.length > 0 && (
        <div className="cfg2-thumbs">
          {thumbnails.map(t => (
            <button
              key={t.id}
              type="button"
              className={`cfg2-thumb ${activeImgUrl === t.url ? 'cfg2-active' : ''}`}
              onClick={() => onSelectThumbnail(t.url)}
            >
              <img src={t.url} alt={t.alt || altText} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Crear `CotizacionModal.jsx`**

```jsx
// src/pages/configurador/CotizacionModal.jsx
import { fmt } from './format'

export default function CotizacionModal({
  cotizModo, cotizResultado, cotizForm, setCotizForm, cotizSaving,
  precioLookup, onConfirm, onClose,
}) {
  if (!cotizModo) return null

  return (
    <div className="cfg-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !cotizSaving) onClose() }}>
      <div className="cfg-modal-box">
        {cotizResultado ? (
          <>
            <h3 className="cfg-modal-title">
              {cotizResultado.modo === 'emitir' ? '¡Cotización emitida!' : 'Guardada en Mi Espacio'}
            </h3>
            <p className="cfg-modal-text">
              {cotizResultado.folio
                ? <>Folio <b>BR-{cotizResultado.folio}</b>. Vigente 15 días. Puedes verla, descargarla y compartirla desde Mi Espacio.</>
                : <>Quedó guardada como borrador. Termínala y emítela cuando quieras desde Mi Espacio.</>}
            </p>
            <div className="cfg-buttons">
              <a href="/mi-espacio" className="cfg-btn cfg-btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>Ir a Mi Espacio</a>
              <button type="button" className="cfg-btn cfg-btn-secondary" onClick={onClose}>Seguir configurando</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="cfg-modal-title">{cotizModo === 'emitir' ? 'Crear cotización' : 'Guardar borrador'}</h3>
            <p className="cfg-modal-text">Este documento es el que le compartes a tu cliente final.</p>
            <label className="cfg-dropdown-label">Nombre del cliente *</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_nombre} onChange={e => setCotizForm(f => ({ ...f, cliente_nombre: e.target.value }))} />
            <label className="cfg-dropdown-label">Email del cliente</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_email} onChange={e => setCotizForm(f => ({ ...f, cliente_email: e.target.value }))} />
            <label className="cfg-dropdown-label">Teléfono del cliente</label>
            <input className="cfg-dropdown" value={cotizForm.cliente_telefono} onChange={e => setCotizForm(f => ({ ...f, cliente_telefono: e.target.value }))} />
            <label className="cfg-dropdown-label">Tu margen (%)</label>
            <input className="cfg-dropdown" type="number" value={cotizForm.markup_pct} onChange={e => setCotizForm(f => ({ ...f, markup_pct: e.target.value }))} />
            <div className="cfg-summary-price-row" style={{ marginBottom: 16 }}>
              <span>Precio para tu cliente</span>
              <span>{fmt(Math.round(precioLookup * (1 + (parseFloat(cotizForm.markup_pct) || 0) / 100)))}</span>
            </div>
            <div className="cfg-buttons">
              <button type="button" className="cfg-btn cfg-btn-primary" disabled={cotizSaving} onClick={onConfirm}>
                {cotizSaving ? 'Guardando…' : cotizModo === 'emitir' ? 'Confirmar y emitir' : 'Guardar borrador'}
              </button>
              <button type="button" className="cfg-btn cfg-btn-secondary" disabled={cotizSaving} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

Nota: `CotizacionModal` reutiliza las clases `.cfg-modal-*`, `.cfg-dropdown*`, `.cfg-buttons`, `.cfg-btn*`, `.cfg-summary-price-row` que ya existen en `Configurador.css` — ese archivo se sigue importando (vía `Configurador.jsx`, que ya lo importa hoy) así que estas clases están disponibles sin tocar `Configurador.css`.

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/pages/configurador/StepCard.jsx src/pages/configurador/StickyViewer.jsx src/pages/configurador/CotizacionModal.jsx
git commit -m "feat: componentes compartidos StepCard/StickyViewer/CotizacionModal del configurador v2"
```

---

### Task 3: `ConfiguradorSticky.css`

**Files:**
- Create: `src/pages/configurador/ConfiguradorSticky.css`

**Interfaces:**
- Produces: todas las clases `cfg2-*` que usan `CamasConfigurador.jsx` y `GenericStickyConfigurador.jsx` (tareas 4 y 5).

- [ ] **Step 1: Crear el archivo de estilos**

```css
/* src/pages/configurador/ConfiguradorSticky.css */
/* Layout nuevo (sticky + pasos colapsables) para Camas, Sofás e Individuales,
   Escuadras y Chaise Lounge. Prefijo cfg2- para no chocar con Configurador.css
   (layout viejo, sigue usándose para Modulares/Mesas/Butacas). Paleta igual a
   la de Configurador.css, no la del mockup HTML. */

.cfg2-wrap {
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 126px 24px 140px;
  align-items: start;
}

/* ===== Visor de imagen sticky ===== */
.cfg2-viewer { position: sticky; top: 126px; }
.cfg2-stage {
  background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 10px;
  aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.cfg2-stage.cfg2-has-img { background: #fff; }
.cfg2-stage img { width: 100%; height: 100%; object-fit: contain; }

.cfg2-thumbs { display: flex; gap: 8px; overflow-x: auto; margin-top: 12px; }
.cfg2-thumb {
  width: 72px; height: 72px; flex-shrink: 0; padding: 0; cursor: pointer;
  background: #fff; border: 1.5px solid #E2E8F0; border-radius: 8px; overflow: hidden;
}
.cfg2-thumb.cfg2-active { border-color: #0F172A; }
.cfg2-thumb img { width: 100%; height: 100%; object-fit: contain; }

/* ===== Panel de pasos ===== */
.cfg2-panel { display: flex; flex-direction: column; gap: 9px; }
.cfg2-step { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
.cfg2-step-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; }
.cfg2-step-num {
  width: 22px; height: 22px; border-radius: 50%; background: #E2E8F0; color: #64748B;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none;
}
.cfg2-step.cfg2-open .cfg2-step-num { background: #0F172A; color: #fff; }
.cfg2-step-title { font-size: 13px; font-weight: 600; flex: 1; }
.cfg2-step-value { font-size: 12.5px; color: #64748B; font-weight: 500; }
.cfg2-step-edit { font-size: 11px; color: #64748B; }
.cfg2-step-body { padding: 0 16px 16px; }

/* ===== Familia: 7 tarjetas con foto en escala de grises ===== */
.cfg2-fams { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cfg2-fam {
  border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 8px; cursor: pointer;
  text-align: center; background: #fff;
}
.cfg2-fam:hover { border-color: #CBD5E1; }
.cfg2-fam.cfg2-on { border-color: #0F172A; box-shadow: 0 0 0 2.5px rgba(15,23,42,.08); }
.cfg2-fam-ph {
  background: #F1F5F9; border-radius: 6px; aspect-ratio: 16 / 10; margin-bottom: 6px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
/* Escala de grises: las 7 familias no comparten tela/color real (verificado
   contra las fotos importadas de Shopify, ver spec) — se comparan por diseño
   de cabecera, no por color. El color real se elige después, en Tela. */
.cfg2-fam-ph img { width: 100%; height: 100%; object-fit: contain; filter: grayscale(1); }
.cfg2-fam span { font-size: 11px; font-weight: 600; }

.cfg2-hint { font-size: 11.5px; color: #64748B; margin-top: 10px; }

/* ===== Chips (Cabecera, Pata, Tamaño, Grado) ===== */
.cfg2-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.cfg2-chip {
  padding: 9px 14px; border: 1.5px solid #E2E8F0; border-radius: 8px;
  font-size: 12.5px; font-weight: 500; cursor: pointer; background: #fff;
}
.cfg2-chip:hover { border-color: #CBD5E1; }
.cfg2-chip.cfg2-on { border-color: #0F172A; background: #0F172A; color: #fff; }
.cfg2-chip.cfg2-off { opacity: .35; cursor: not-allowed; text-decoration: line-through; }

.cfg2-lbl {
  font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: #64748B; margin: 14px 0 8px;
}
.cfg2-lbl:first-child { margin-top: 0; }

.cfg2-swatches { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 4px; }
.cfg2-sw {
  width: 36px; height: 36px; border-radius: 9px; cursor: pointer; padding: 0;
  border: 2px solid transparent; box-shadow: inset 0 0 0 1px rgba(0,0,0,.09);
}
.cfg2-sw.cfg2-on { border-color: #0F172A; }

/* ===== Modelo (GenericStickyConfigurador) ===== */
.cfg2-models { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.cfg2-model {
  border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px; cursor: pointer;
  text-align: center; background: #fff;
}
.cfg2-model:hover { border-color: #CBD5E1; }
.cfg2-model.cfg2-on { border-color: #0F172A; box-shadow: 0 0 0 2.5px rgba(15,23,42,.08); }
.cfg2-model-ph {
  background: #F1F5F9; border-radius: 6px; aspect-ratio: 16 / 10; margin-bottom: 6px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.cfg2-model-ph img { width: 100%; height: 100%; object-fit: contain; }
.cfg2-model span { font-size: 11px; font-weight: 600; }

/* ===== Barra de precio fija ===== */
.cfg2-bar {
  position: sticky; bottom: 0; margin-top: 12px;
  background: #fff; border: 1px solid #E2E8F0; border-radius: 14px 14px 0 0;
  padding: 14px 18px; display: flex; align-items: center; gap: 14px;
  box-shadow: 0 -6px 26px rgba(15,23,42,.07);
}
.cfg2-bar-msg { font-size: 12px; color: #64748B; text-align: center; flex: 1; }
.cfg2-bar-price { flex: 1; }
.cfg2-bar-price small { font-size: 10.5px; color: #64748B; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; display: block; }
.cfg2-bar-price strong { font-size: 20px; font-weight: 700; }
.cfg2-bar-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Comportamiento mobile: la imagen deja de ser sticky (vuelve al flujo
   normal, se ve pero se desplaza con la pagina); la barra de precio SI se
   mantiene fija, a todo el ancho de la pantalla. */
@media (max-width: 1080px) {
  .cfg2-wrap { grid-template-columns: 1fr; padding-top: 126px; }
  .cfg2-viewer { position: relative; top: 0; }
  .cfg2-bar { position: fixed; left: 0; right: 0; bottom: 0; margin: 0; border-radius: 0; z-index: 40; }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build sin errores (todavía nadie importa este CSS, así que solo valida sintaxis).

- [ ] **Step 3: Commit**

```bash
git add src/pages/configurador/ConfiguradorSticky.css
git commit -m "feat: estilos del layout sticky+colapsable del configurador v2"
```

---

### Task 4: `GenericStickyConfigurador` + wiring en `Configurador.jsx` (Sofás/Escuadras/Chaise Lounge)

**Files:**
- Create: `src/pages/configurador/GenericStickyConfigurador.jsx`
- Modify: `src/pages/Configurador.jsx:202-258` (agregar cálculo de `initialProducto` y el primer `if` de branching, antes del `return` legado)

**Interfaces:**
- Consumes: `useProductoConfig`, `useCotizacion`, `StepCard`, `StickyViewer`, `CotizacionModal`, `fmt` (de las Tareas 1–3).
- Produces: `GenericStickyConfigurador({ productos, distribuidor, initialProducto })` (default export). `productos` es el array ya filtrado por categoría que `Configurador.jsx` ya carga hoy (`productos` state). `initialProducto` es `null` o un producto de ese mismo array.

- [ ] **Step 1: Crear `GenericStickyConfigurador.jsx`**

```jsx
// src/pages/configurador/GenericStickyConfigurador.jsx
import { useState } from 'react'
import { useProductoConfig } from './useProductoConfig'
import { useCotizacion } from './useCotizacion'
import StepCard from './StepCard'
import StickyViewer from './StickyViewer'
import CotizacionModal from './CotizacionModal'
import { fmt } from './format'
import './ConfiguradorSticky.css'

export default function GenericStickyConfigurador({ productos, distribuidor, initialProducto }) {
  const [modeloSel, setModeloSel] = useState(initialProducto ?? productos[0] ?? null)

  const cfg = useProductoConfig(modeloSel, distribuidor)
  const cotiz = useCotizacion({
    distribuidor, producto: modeloSel, medidaSel: cfg.medidaSel,
    telaSel: cfg.telaSel, colorSel: cfg.colorSel, precioLookup: cfg.precioLookup,
  })

  if (productos.length === 0) {
    return <div className="cfg-message">Aún no hay modelos cargados en esta categoría. Se agregan desde el panel de administración → Productos.</div>
  }

  const cover = modeloSel?.isometrico_url
    ? [{ id: 'cover', url: modeloSel.isometrico_url, alt: modeloSel.nombre }]
    : []
  const thumbnails = [...cover, ...cfg.galeria]

  return (
    <div className="cfg2-wrap">
      <StickyViewer
        activeImgUrl={cfg.activeImgUrl}
        thumbnails={thumbnails}
        onSelectThumbnail={cfg.setActiveImgUrl}
        altText={modeloSel?.nombre}
      />

      <div className="cfg2-panel">
        <StepCard number={1} title="Modelo" value={modeloSel?.nombre}>
          <div className="cfg2-models">
            {productos.map(prod => (
              <div
                key={prod.id}
                className={`cfg2-model ${modeloSel?.id === prod.id ? 'cfg2-on' : ''}`}
                onClick={() => setModeloSel(prod)}
              >
                <div className="cfg2-model-ph">
                  {prod.isometrico_url && <img src={prod.isometrico_url} alt={prod.nombre} />}
                </div>
                <span>{prod.nombre}</span>
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={2} title="Tamaño" value={cfg.medidaSel?.nombre}>
          <div className="cfg2-chips">
            {cfg.configuraciones.map(c => (
              <div
                key={c.id}
                className={`cfg2-chip ${cfg.medidaSel?.id === c.id ? 'cfg2-on' : ''}`}
                onClick={() => cfg.setMedidaSel(c)}
              >
                {c.nombre}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={3} title="Tela" value={cfg.telaSel ? `Grado ${cfg.gradoSel} · ${cfg.colorSel?.nombre ?? ''}` : null}>
          <div className="cfg2-lbl">Grado</div>
          <div className="cfg2-chips">
            {['AA', 'A', 'B', 'C'].map(g => (
              <div key={g} className={`cfg2-chip ${cfg.gradoSel === g ? 'cfg2-on' : ''}`} onClick={() => cfg.selectGrado(g)}>{g}</div>
            ))}
          </div>
          <div className="cfg2-lbl">Catálogo</div>
          <select className="cfg-dropdown" value={cfg.telaSel?.id ?? ''} onChange={e => cfg.selectTela(e.target.value)}>
            {cfg.telasDelGrado.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>)}
          </select>
          <div className="cfg2-swatches">
            {(cfg.telaSel?.colores ?? []).map(color => (
              <button
                key={color.id} type="button"
                className={`cfg2-sw ${cfg.colorSel?.id === color.id ? 'cfg2-on' : ''}`}
                style={{ background: color.codigo_hex || '#E2E8F0' }}
                title={color.nombre}
                onClick={() => cfg.setColorSel(color)}
              />
            ))}
          </div>
        </StepCard>
      </div>

      <div className="cfg2-bar">
        {!distribuidor ? (
          <div className="cfg2-bar-msg">🔒 Inicia sesión para ver precios como distribuidor</div>
        ) : (
          <>
            <div className="cfg2-bar-price">
              <small>Precio distribuidor</small>
              <strong>{cfg.precioLookup != null ? fmt(cfg.precioLookup) : 'No disponible'}</strong>
            </div>
            <div className="cfg2-bar-actions">
              <button type="button" className="cfg-btn cfg-btn-primary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('emitir')}>Crear cotización</button>
              <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('borrador')}>Guardar en mi espacio</button>
            </div>
          </>
        )}
      </div>

      <CotizacionModal
        cotizModo={cotiz.cotizModo}
        cotizResultado={cotiz.cotizResultado}
        cotizForm={cotiz.cotizForm}
        setCotizForm={cotiz.setCotizForm}
        cotizSaving={cotiz.cotizSaving}
        precioLookup={cfg.precioLookup}
        onConfirm={cotiz.confirmarCotizacion}
        onClose={cotiz.cerrarCotizModal}
      />
    </div>
  )
}
```

- [ ] **Step 2: Modificar `Configurador.jsx` — agregar import y branching**

En la parte de imports (arriba del archivo, junto a `import './Configurador.css'`), agregar:

```js
import GenericStickyConfigurador from './configurador/GenericStickyConfigurador'
```

Justo después de la línea `const medidaTelaActivo = !!modeloSel` (línea 256 actual) y **antes** de `return (` (línea 258 actual, que abre el JSX legado), insertar:

```jsx
  const modeloParam = searchParams.get('modelo')
  const initialProducto = useMemo(
    () => (modeloParam ? productos.find(p => p.slug === modeloParam) ?? null : null),
    [modeloParam, productos]
  )

  const STICKY_CATEGORIA_SLUGS = ['sofas', 'escuadras-l', 'chaise-lounge']

  if (tipoSel && STICKY_CATEGORIA_SLUGS.includes(tipoSel.slug) && !productosLoading) {
    return (
      <div className="cfg-page">
        <Nav solid />
        <GenericStickyConfigurador productos={productos} distribuidor={distribuidor} initialProducto={initialProducto} />
      </div>
    )
  }
```

`useMemo` ya está importado en este archivo (primera línea de imports). El `if` sale ANTES del `return` legado, así que Modulares/Mesas/Butacas (que no matchean `STICKY_CATEGORIA_SLUGS`) siguen cayendo exactamente en el JSX legado sin ningún cambio de comportamiento. El chequeo `!productosLoading` evita que `GenericStickyConfigurador` se monte con `productos` todavía vacío mientras el fetch está en curso — así `initialProducto` (usado como valor inicial de `useState` dentro del componente, que solo se lee una vez al montar) siempre llega ya resuelto.

- [ ] **Step 3: Levantar el servidor dev**

Run: `npm run dev`
Expected: arranca sin errores en consola.

- [ ] **Step 4: Verificar en el navegador — categorías nuevas**

Navegar a `http://localhost:<puerto>/configurador?tipo=sofas` (y repetir con `?tipo=escuadras-l`, `?tipo=chaise-lounge`):
- La imagen queda en una columna a la izquierda, sticky (no se mueve al hacer scroll del panel de pasos).
- Los 3 pasos (Modelo, Tamaño, Tela) aparecen expandidos con un valor ya elegido por defecto — no hay pasos deshabilitados/grises.
- Clic en el header de cualquier paso lo colapsa/expande.
- La barra de abajo muestra "Precio no disponible" (sin sesión de distribuidor: mensaje de login) — correcto, ya que `producto_precios` está vacío hoy.
- Achicar la ventana por debajo de 1080px: la imagen deja de quedarse fija (se desplaza con la página), la barra de precio sí se mantiene fija abajo a todo el ancho.

- [ ] **Step 5: Verificar en el navegador — regresión de categorías viejas**

Navegar a `http://localhost:<puerto>/configurador?tipo=modulares` y `?tipo=mesas`: deben verse exactamente igual que antes de este cambio (layout viejo, con Paso 1–4 y candados). Confirmar leyendo el DOM o comparando visualmente con una captura previa si hay dudas.

- [ ] **Step 6: Commit**

```bash
git add src/pages/configurador/GenericStickyConfigurador.jsx src/pages/Configurador.jsx
git commit -m "feat: GenericStickyConfigurador para Sofas/Escuadras/Chaise Lounge"
```

---

### Task 5: `CamasConfigurador` + wiring en `Configurador.jsx`

**Files:**
- Create: `src/pages/configurador/CamasConfigurador.jsx`
- Modify: `src/pages/Configurador.jsx` (segundo `if` de branching, junto al de la Tarea 4)

**Interfaces:**
- Consumes: mismo set que `GenericStickyConfigurador` (Tarea 4) + `supabase` directo (para la consulta batch de fotos de portada por familia).
- Produces: `CamasConfigurador({ productos, distribuidor, initialProducto })` (default export).

- [ ] **Step 1: Crear `CamasConfigurador.jsx`**

```jsx
// src/pages/configurador/CamasConfigurador.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProductoConfig } from './useProductoConfig'
import { useCotizacion } from './useCotizacion'
import StepCard from './StepCard'
import StickyViewer from './StickyViewer'
import CotizacionModal from './CotizacionModal'
import { fmt } from './format'
import './ConfiguradorSticky.css'

const CABECERAS_ORDEN = ['Liso', 'Capitón', 'Líneas', 'Rayas']
const PATAS_ORDEN = ['Estándar', 'Pata Praga']

export default function CamasConfigurador({ productos, distribuidor, initialProducto }) {
  const familias = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (!seen.has(p.familia)) { seen.add(p.familia); list.push(p.familia) }
    }
    return list
  }, [productos])

  // Foto de portada por familia: el producto "Liso + Estándar" de cada
  // familia (si existe, si no el primero de esa familia), su imagen
  // es_principal (o la primera por orden si ninguna es_principal). Una sola
  // consulta batch para las 7, no una por tarjeta.
  const [familiaCovers, setFamiliaCovers] = useState({})

  useEffect(() => {
    if (familias.length === 0) return
    let ignore = false
    async function load() {
      const repByFamilia = {}
      for (const fam of familias) {
        repByFamilia[fam] = productos.find(p => p.familia === fam && p.cabecera === 'Liso' && p.pata === 'Estándar')
          ?? productos.find(p => p.familia === fam)
      }
      const repIds = Object.values(repByFamilia).filter(Boolean).map(p => p.id)
      if (repIds.length === 0) return

      const { data } = await supabase.from('producto_imagenes').select('producto_id, url, es_principal, orden')
        .in('producto_id', repIds).order('orden')
      if (ignore) return

      const byProductoId = {}
      ;(data ?? []).forEach(row => {
        const current = byProductoId[row.producto_id]
        if (!current || (row.es_principal && !current.es_principal)) byProductoId[row.producto_id] = row
      })

      const covers = {}
      for (const fam of familias) {
        const rep = repByFamilia[fam]
        covers[fam] = rep ? (byProductoId[rep.id]?.url ?? null) : null
      }
      setFamiliaCovers(covers)
    }
    load()
    return () => { ignore = true }
  }, [familias, productos])

  const [familiaSel, setFamiliaSel] = useState(initialProducto?.familia ?? familias[0] ?? null)

  const cabecerasDisponibles = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (p.familia === familiaSel && !seen.has(p.cabecera)) { seen.add(p.cabecera); list.push(p.cabecera) }
    }
    return list
  }, [productos, familiaSel])

  const patasDisponibles = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const p of productos) {
      if (p.familia === familiaSel && !seen.has(p.pata)) { seen.add(p.pata); list.push(p.pata) }
    }
    return list
  }, [productos, familiaSel])

  const [cabeceraSel, setCabeceraSel] = useState(
    (initialProducto?.familia === familiaSel && initialProducto?.cabecera) || cabecerasDisponibles[0] || null
  )
  const [pataSel, setPataSel] = useState(
    (initialProducto?.familia === familiaSel && initialProducto?.pata) || patasDisponibles[0] || null
  )

  // Al cambiar de familia, cabecera/pata se recalculan de una (no se puede
  // esperar al proximo render: si el valor actual ya no existe en la nueva
  // familia, hay que corregirlo ya mismo, no dejarlo en un estado invalido).
  const selectFamilia = (fam) => {
    setFamiliaSel(fam)
    const cabs = []
    const patas = []
    for (const p of productos) {
      if (p.familia !== fam) continue
      if (!cabs.includes(p.cabecera)) cabs.push(p.cabecera)
      if (!patas.includes(p.pata)) patas.push(p.pata)
    }
    setCabeceraSel(prev => (cabs.includes(prev) ? prev : cabs[0] ?? null))
    setPataSel(prev => (patas.includes(prev) ? prev : patas[0] ?? null))
  }

  const productoActivo = useMemo(() => {
    return productos.find(p => p.familia === familiaSel && p.cabecera === cabeceraSel && p.pata === pataSel)
      ?? productos.find(p => p.familia === familiaSel)
      ?? null
  }, [productos, familiaSel, cabeceraSel, pataSel])

  const cfg = useProductoConfig(productoActivo, distribuidor)
  const cotiz = useCotizacion({
    distribuidor, producto: productoActivo, medidaSel: cfg.medidaSel,
    telaSel: cfg.telaSel, colorSel: cfg.colorSel, precioLookup: cfg.precioLookup,
  })

  if (productos.length === 0) {
    return <div className="cfg-message">Aún no hay modelos cargados en Camas. Se agregan desde el panel de administración → Productos.</div>
  }

  const cover = productoActivo?.isometrico_url
    ? [{ id: 'cover', url: productoActivo.isometrico_url, alt: productoActivo.nombre }]
    : []
  const thumbnails = [...cover, ...cfg.galeria]

  return (
    <div className="cfg2-wrap">
      <StickyViewer
        activeImgUrl={cfg.activeImgUrl}
        thumbnails={thumbnails}
        onSelectThumbnail={cfg.setActiveImgUrl}
        altText={productoActivo?.nombre}
      />

      <div className="cfg2-panel">
        <StepCard number={1} title="Familia" value={familiaSel}>
          <div className="cfg2-fams">
            {familias.map(fam => (
              <div
                key={fam}
                className={`cfg2-fam ${familiaSel === fam ? 'cfg2-on' : ''}`}
                onClick={() => selectFamilia(fam)}
              >
                <div className="cfg2-fam-ph">
                  {familiaCovers[fam] && <img src={familiaCovers[fam]} alt={fam} />}
                </div>
                <span>{fam}</span>
              </div>
            ))}
          </div>
          <div className="cfg2-hint">Vista de diseño — colores disponibles al seleccionar.</div>
        </StepCard>

        <StepCard number={2} title="Cabecera" value={cabeceraSel}>
          <div className="cfg2-chips">
            {CABECERAS_ORDEN.map(c => (
              <div
                key={c}
                className={`cfg2-chip ${cabeceraSel === c ? 'cfg2-on' : ''} ${!cabecerasDisponibles.includes(c) ? 'cfg2-off' : ''}`}
                onClick={() => cabecerasDisponibles.includes(c) && setCabeceraSel(c)}
              >
                {c}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={3} title="Pata" value={pataSel}>
          <div className="cfg2-chips">
            {PATAS_ORDEN.map(p => (
              <div
                key={p}
                className={`cfg2-chip ${pataSel === p ? 'cfg2-on' : ''} ${!patasDisponibles.includes(p) ? 'cfg2-off' : ''}`}
                onClick={() => patasDisponibles.includes(p) && setPataSel(p)}
              >
                {p}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={4} title="Tamaño" value={cfg.medidaSel?.nombre}>
          <div className="cfg2-chips">
            {cfg.configuraciones.map(c => (
              <div
                key={c.id}
                className={`cfg2-chip ${cfg.medidaSel?.id === c.id ? 'cfg2-on' : ''}`}
                onClick={() => cfg.setMedidaSel(c)}
              >
                {c.nombre}
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard number={5} title="Tela" value={cfg.telaSel ? `Grado ${cfg.gradoSel} · ${cfg.colorSel?.nombre ?? ''}` : null}>
          <div className="cfg2-lbl">Grado</div>
          <div className="cfg2-chips">
            {['AA', 'A', 'B', 'C'].map(g => (
              <div key={g} className={`cfg2-chip ${cfg.gradoSel === g ? 'cfg2-on' : ''}`} onClick={() => cfg.selectGrado(g)}>{g}</div>
            ))}
          </div>
          <div className="cfg2-lbl">Catálogo</div>
          <select className="cfg-dropdown" value={cfg.telaSel?.id ?? ''} onChange={e => cfg.selectTela(e.target.value)}>
            {cfg.telasDelGrado.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.colores.length} colores)</option>)}
          </select>
          <div className="cfg2-swatches">
            {(cfg.telaSel?.colores ?? []).map(color => (
              <button
                key={color.id} type="button"
                className={`cfg2-sw ${cfg.colorSel?.id === color.id ? 'cfg2-on' : ''}`}
                style={{ background: color.codigo_hex || '#E2E8F0' }}
                title={color.nombre}
                onClick={() => cfg.setColorSel(color)}
              />
            ))}
          </div>
        </StepCard>
      </div>

      <div className="cfg2-bar">
        {!distribuidor ? (
          <div className="cfg2-bar-msg">🔒 Inicia sesión para ver precios como distribuidor</div>
        ) : (
          <>
            <div className="cfg2-bar-price">
              <small>Precio distribuidor</small>
              <strong>{cfg.precioLookup != null ? fmt(cfg.precioLookup) : 'No disponible'}</strong>
            </div>
            <div className="cfg2-bar-actions">
              <button type="button" className="cfg-btn cfg-btn-primary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('emitir')}>Crear cotización</button>
              <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!cotiz.puedeGuardar} onClick={() => cotiz.abrirCotizModal('borrador')}>Guardar en mi espacio</button>
            </div>
          </>
        )}
      </div>

      <CotizacionModal
        cotizModo={cotiz.cotizModo}
        cotizResultado={cotiz.cotizResultado}
        cotizForm={cotiz.cotizForm}
        setCotizForm={cotiz.setCotizForm}
        cotizSaving={cotiz.cotizSaving}
        precioLookup={cfg.precioLookup}
        onConfirm={cotiz.confirmarCotizacion}
        onClose={cotiz.cerrarCotizModal}
      />
    </div>
  )
}
```

- [ ] **Step 2: Modificar `Configurador.jsx` — agregar import y segundo branch**

Junto al import agregado en la Tarea 4:

```js
import CamasConfigurador from './configurador/CamasConfigurador'
```

Justo **antes** del `if` de `STICKY_CATEGORIA_SLUGS` agregado en la Tarea 4 (el orden entre los dos `if` no importa porque los slugs no se pisan, pero va primero por ser el caso más específico):

```jsx
  if (tipoSel?.slug === 'camas' && !productosLoading) {
    return (
      <div className="cfg-page">
        <Nav solid />
        <CamasConfigurador productos={productos} distribuidor={distribuidor} initialProducto={initialProducto} />
      </div>
    )
  }
```

- [ ] **Step 3: Verificar en el navegador**

Con el servidor dev corriendo, navegar a `http://localhost:<puerto>/configurador?tipo=camas`:
- 7 tarjetas de Familia, en escala de grises, con el texto "Vista de diseño — colores disponibles al seleccionar." debajo.
- Clic en "Alejandra": chips de Cabecera muestra las 4 opciones habilitadas, Pata muestra las 2 habilitadas.
- Clic en "Pont" u "Odisey": chips de Cabecera solo "Liso" habilitado (el resto tachado/atenuado y no clicable), Pata solo "Estándar" habilitado.
- Cambiar de familia con una combinación de cabecera/pata que ya no existe en la nueva familia corrige el chip seleccionado automáticamente al primero disponible.
- La imagen sticky no se mueve al hacer scroll de los pasos; por debajo de 1080px deja de ser sticky pero sigue visible, y la barra de precio se mantiene fija.
- Probar `http://localhost:<puerto>/configurador?tipo=camas&modelo=alejandra-capiton-pata-praga`: al cargar, Familia=Alejandra, Cabecera=Capitón, Pata=Pata Praga ya vienen seleccionados.

- [ ] **Step 4: Commit**

```bash
git add src/pages/configurador/CamasConfigurador.jsx src/pages/Configurador.jsx
git commit -m "feat: CamasConfigurador (Familia/Cabecera/Pata) del configurador v2"
```

---

### Task 6: Regresión final y cotización end-to-end

**Files:** ninguno nuevo — solo verificación manual con el servidor dev corriendo y, si algo falla, correcciones puntuales en los archivos de las Tareas 1–5.

- [ ] **Step 1: Regresión de las 6 categorías**

Con sesión de distribuidor real iniciada (usar la misma cuenta ya usada en este proyecto), navegar una por una:
- `?tipo=camas`, `?tipo=sofas`, `?tipo=escuadras-l`, `?tipo=chaise-lounge`: layout nuevo, precio visible (o "No disponible" si no hay fila en `producto_precios` para esa combinación — hoy no hay ninguna, así que es el resultado esperado).
- `?tipo=modulares`, `?tipo=mesas`: layout viejo sin cambios.

- [ ] **Step 2: Flujo de cotización end-to-end**

En `?tipo=camas` (o cualquiera de las 4 nuevas), con sesión de distribuidor: click en "Crear cotización" → llenar nombre de cliente → confirmar. Verificar que:
- Aparece la pantalla de "¡Cotización emitida!" con folio `BR-xxxx`.
- La cotización aparece en `/mi-espacio`.

Repetir con "Guardar en mi espacio" (modo borrador) y confirmar que queda como borrador en `/mi-espacio`.

- [ ] **Step 3: Sin sesión**

Cerrar sesión, repetir la visita a `?tipo=camas`: la barra muestra "Inicia sesión para ver precios como distribuidor", sin botones de cotización.

- [ ] **Step 4: Build de producción**

Run: `npm run build`
Expected: build sin errores ni warnings nuevos.

- [ ] **Step 5: Commit final (si hubo correcciones en este task)**

```bash
git add -A
git commit -m "fix: ajustes de regresion del configurador v2"
```

(Si el Task 6 no requirió ningún cambio de código, no hay nada que commitear — es un paso de verificación.)

---

## Self-Review

**Cobertura del spec:**
- Layout sticky+colapsable en las 4 categorías, sin candados → Tasks 4–5.
- Familia/Cabecera/Pata solo en Camas, disponibilidad calculada de los datos (no matriz manual) → Task 5.
- Escala de grises + leyenda en las 7 tarjetas → Task 5, Step 1 (`filter: grayscale(1)` en CSS, Task 3; texto "Vista de diseño..." en JSX, Task 5).
- Barra de precio fija reemplaza el Paso 4, gating de precio por sesión → Tasks 4–5.
- Mobile: viewer deja de ser sticky, barra sigue fija, breakpoint 1080px → Task 3 (CSS), verificado en Tasks 4–5 Step de browser check.
- Modulares/Mesas/Butacas intactos → Tasks 4–5 (el `if` de branching no los toca) + verificación explícita en Task 4 Step 5 y Task 6 Step 1.
- Preload `?modelo=` → Task 4 Step 2 (`initialProducto`), verificado en Task 5 Step 3.
- `useProductoConfig`/`useCotizacion`/`StepCard`/`StickyViewer`/`CotizacionModal` compartidos → Tasks 1–2.

**Placeholders:** ninguno — todo el código de cada Step está completo y es el código real a escribir, no pseudocódigo.

**Consistencia de tipos/nombres:** revisado — `useProductoConfig` devuelve `{configuraciones, medidaSel, setMedidaSel, telas, telasDelGrado, gradoSel, selectGrado, telaSel, selectTela, colorSel, setColorSel, galeria, activeImgUrl, setActiveImgUrl, precioLookup}` y ambos componentes (Tasks 4 y 5) usan exactamente esos nombres. `useCotizacion` devuelve `{cotizModo, cotizForm, setCotizForm, cotizSaving, cotizResultado, puedeGuardar, abrirCotizModal, cerrarCotizModal, confirmarCotizacion}`, usado igual en ambos. `StepCard`/`StickyViewer`/`CotizacionModal` tienen la misma firma de props en su definición (Task 2) y en su uso (Tasks 4–5).
