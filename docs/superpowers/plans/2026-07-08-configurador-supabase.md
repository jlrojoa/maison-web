# Configurador Brendell → Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React page at `/configurador` that replicates `BrendellConfiguradorSinCascada.html` pixel-for-pixel in behavior/layout, wired to real Supabase data (categorias → productos → producto_configuraciones → telas/tela_colores → producto_precios), per `TASK1-instrucciones-claude-code.txt`.

**Architecture:** One self-contained page component (`src/pages/Configurador.jsx`) + one scoped CSS file (`src/pages/Configurador.css`) ported 1:1 from the mockup's inline `<style>` block, with all class names prefixed `cfg-` so they never collide with the site's existing `index.css`. The page does **not** use the Maison brand system (no `--serif`, no `--gold`, no `Nav`/`Footer`) — the mockup has its own header/design language and the task explicitly forbids importing the site's serif/gold/dark aesthetic. Auth-gating for prices/buttons reuses the existing `useDistribuidor()` context (`distribuidor` truthy = logged in), matching the pattern already used in `Colecciones.jsx` and `ProductDetail.jsx`. One new route is added to `App.jsx` — no other existing route/page is touched.

**Tech Stack:** React 18 + react-router-dom v7 (`useSearchParams`), `@supabase/supabase-js` client already configured at `src/lib/supabase.js`, existing `DistribuidorContext`.

**Deviation from the standard TDD template:** This repo has no test runner configured (`package.json` has no vitest/jest/testing-library — confirmed by inspection) and adding one is out of scope for this single task ("UN task a la vez"). Verification steps below use `npm run dev` + manual browser checks against the specific behaviors listed in the task instructions, per the project's own guidance for UI work. Every task ends with a concrete, observable check instead of a unit test run.

**Real data confirmed via Supabase MCP (project `smnjbqjvqomopeulsuvp`) — used to sanity-check the UI against real rows:**
- `categorias`: 7 rows (sofas, camas, escuadras-l, chaise-lounge, modulares, butacas, mesas) — no icon column.
- `productos`: 4 rows, one (`Cubo`, slug `cubo`) has a real `isometrico_url`; the other 3 have `isometrico_url = null`.
- `producto_configuraciones`: 7 rows across the 4 productos, all with `isometrico_url = null` and populated `dimensiones` text.
- `telas`: exactly 4 rows, one per grado (AA=Lino Basic, A=Terranova, B=Cancún, C=Boucle Premium).
- `tela_colores`: 23 rows with real `codigo_hex` plus the spec columns (`composicion`, `martindale`, `resistencia_luz`, `pilling`, `facil_limpieza`, `repelente_liquidos`, `pais_origen` — mostly null today, which the UI must handle gracefully).
- `producto_precios`: 28 rows, one per (producto, configuracion, grado) combination — confirms the "it's a lookup, not a calculation" instruction.
- `producto_telas` (junction table): **0 rows** — so telas are NOT currently scoped per-producto. The task's data mapping section only says "filtrado por grado del tab activo" for telas, with no mention of `producto_telas`. Conclusion: load all active telas globally, filter client-side by grado tab only. Do not join through `producto_telas`.

---

### Task 1: Route + page skeleton

**Files:**
- Create: `src/pages/Configurador.jsx`
- Create: `src/pages/Configurador.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create the CSS file, ported 1:1 from the mockup's `<style>` block**

Every color/spacing value below is copied verbatim from `BrendellConfiguradorSinCascada.html`. Class names are prefixed `cfg-` (mockup had none) purely to avoid any future collision with `index.css`; no color, font, spacing, or radius value differs from the mockup.

```css
/* src/pages/Configurador.css */
.cfg-page { font-family: system-ui; background: #f5f5f5; color: #0F172A; min-height: 100vh; }

.cfg-header { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 16px 24px; }
.cfg-header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.cfg-logo { font-weight: 600; font-size: 18px; }
.cfg-auth-status { font-size: 12px; background: #F1F5F9; padding: 8px 12px; border-radius: 4px; color: #64748B; }

.cfg-container { max-width: 1400px; margin: 0 auto; padding: 40px 24px; }
.cfg-h1 { font-size: 32px; font-weight: 300; margin-bottom: 8px; }
.cfg-subtitle { font-size: 14px; color: #64748B; margin-bottom: 40px; }

.cfg-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }

.cfg-carousel { background: linear-gradient(135deg, #D4C4B0 0%, #E8DCC4 100%); border-radius: 8px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 18px; color: #0F172A; font-weight: 500; min-height: 400px; overflow: hidden; }
.cfg-carousel img { width: 100%; height: 100%; object-fit: cover; }

.cfg-thumbnails { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; }
.cfg-thumbnail { width: 80px; height: 80px; background: #F1F5F9; border: 2px solid #E2E8F0; border-radius: 4px; flex-shrink: 0; }

.cfg-isometric-container { background: #F9F9F9; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; min-height: 400px; display: flex; align-items: center; justify-content: center; }
.cfg-isometric-image { width: 100%; aspect-ratio: 1; border-radius: 4px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 14px; color: rgba(0,0,0,0.35); font-weight: 500; overflow: hidden; }
.cfg-isometric-image img { width: 100%; height: 100%; object-fit: cover; }
.cfg-iso-caption { font-size: 12px; color: #64748B; margin-top: 8px; text-align: center; }

.cfg-step { margin-bottom: 40px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0; }
.cfg-step.cfg-disabled { opacity: 0.5; pointer-events: none; }
.cfg-step-header { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.cfg-step-number { font-size: 16px; font-weight: 600; min-width: 20px; }
.cfg-step-title { font-size: 14px; font-weight: 500; }

.cfg-options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.cfg-option { padding: 16px; border: 1px solid #E2E8F0; border-radius: 4px; text-align: center; cursor: pointer; transition: all 0.2s; background: none; }
.cfg-option:hover { border-color: #0F172A; }
.cfg-option.cfg-active { border: 2px solid #0F172A; background: #F1F5F9; }
.cfg-option-icon { font-size: 32px; margin-bottom: 12px; font-family: system-ui; }
.cfg-option-thumb { height: 80px; border-radius: 4px; margin-bottom: 12px; background: #F1F5F9; overflow: hidden; }
.cfg-option-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cfg-option-label { font-size: 13px; font-weight: 500; }
.cfg-option-dim { font-size: 16px; font-weight: 500; margin-bottom: 8px; }

.cfg-tabs { display: flex; gap: 2px; border-bottom: 1px solid #E2E8F0; margin-bottom: 16px; }
.cfg-tab { padding: 12px 16px; font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; color: #64748B; border-bottom: 2px solid transparent; }
.cfg-tab.cfg-active { color: #0F172A; border-bottom-color: #0F172A; }

.cfg-dropdown-label { font-size: 12px; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 8px; font-weight: 600; }
.cfg-dropdown { width: 100%; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 13px; font-family: inherit; margin-bottom: 16px; }

.cfg-colors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 12px; margin-bottom: 16px; }
.cfg-color-swatch { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #E2E8F0; cursor: pointer; transition: all 0.2s; padding: 0; }
.cfg-color-swatch.cfg-active { border: 3px solid #0F172A; }

.cfg-specs { background: #F1F5F9; padding: 16px; border-radius: 4px; margin-top: 16px; }
.cfg-specs-header { display: flex; gap: 12px; margin-bottom: 16px; }
.cfg-specs-swatch { width: 50px; height: 50px; border-radius: 4px; flex-shrink: 0; }
.cfg-specs-name { font-size: 13px; font-weight: 600; margin: 0 0 2px 0; }
.cfg-specs-cat { font-size: 12px; color: #64748B; margin: 0; }
.cfg-specs-list { display: flex; flex-direction: column; gap: 6px; }
.cfg-specs-row { display: flex; justify-content: space-between; font-size: 12px; gap: 12px; }
.cfg-specs-row span:first-child { color: #64748B; }
.cfg-specs-row span:last-child { text-align: right; }

.cfg-summary { background: #F1F5F9; padding: 20px; border-radius: 4px; margin-bottom: 16px; }
.cfg-summary-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #64748B; margin-bottom: 12px; font-weight: 600; }
.cfg-summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.cfg-summary-price-row { display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0; }
.cfg-tela-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1px solid #E2E8F0; vertical-align: middle; margin-left: 4px; }

.cfg-buttons { display: flex; flex-direction: column; gap: 12px; }
.cfg-btn { padding: 12px 16px; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cfg-btn-primary { background: #0F172A; color: #fff; }
.cfg-btn-secondary { background: #fff; color: #0F172A; border: 1px solid #0F172A; }
.cfg-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cfg-message { background: #fff; padding: 12px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 12px; color: #64748B; text-align: center; margin-bottom: 16px; }
```

- [ ] **Step 2: Create the page skeleton (no data yet) to prove the route works**

```jsx
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
          <div>Left column placeholder</div>
          <div>Right column placeholder</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire the route in `src/App.jsx`**

Add the import and one `<Route>`. Do not touch any other route.

```jsx
// src/App.jsx — add this import near the other page imports
import Configurador from './pages/Configurador'
```

```jsx
// src/App.jsx — add this Route inside <Routes>, before the catch-all "*" route
<Route path="/configurador" element={<Configurador />} />
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev` (from `C:\Users\Usuario\Downloads\Maison`)
Open: `http://localhost:5173/configurador`
Expected: header with "Brendell" + "📍 Sin sesión", title "Configura tu Sofá", two placeholder columns. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Configurador.jsx src/pages/Configurador.css src/App.jsx
git commit -m "feat: add configurador route skeleton"
```

---

### Task 2: Paso 0 (tipo) + Paso 1 (modelo) + carousel image

**Files:**
- Modify: `src/pages/Configurador.jsx`

- [ ] **Step 1: Add state, data loading for categorias/productos, and render Paso 0 + Paso 1 + carousel**

Replace the full component body with:

```jsx
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('categorias').select('*').eq('activo', true).order('orden')
      setCategorias(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!tipoSel) { setProductos([]); return }
    async function load() {
      const { data } = await supabase.from('productos').select('*')
        .eq('categoria_id', tipoSel.id).eq('activo', true).order('orden')
      setProductos(data ?? [])
    }
    load()
  }, [tipoSel])

  const selectTipo = (cat) => {
    setTipoSel(cat)
    setModeloSel(null)
  }

  const selectModelo = (prod) => {
    setModeloSel(prod)
  }

  const modeloActivo = !!tipoSel

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
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, open `http://localhost:5173/configurador`.
Expected:
- Paso 0 shows the 7 real categorias (Sofás e Individuales, Camas, Escuadras, Chaise Lounge, Modulares, Butacas, Mesas), each with a single-letter icon.
- Paso 1 is at 50% opacity and unclickable until a tipo is clicked.
- Clicking "Escuadras" loads its productos into Paso 1 (should show "Cubo") at full opacity.
- Clicking "Camas" then "Escuadras" back and forth resets `modeloSel` correctly (no stale carousel image).
- Selecting "Cubo" (which has a real `isometrico_url` in the DB) shows its image in the carousel box; selecting a producto with `isometrico_url = null` shows the empty gradient box (no broken image icon).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Configurador.jsx
git commit -m "feat: wire configurador paso 0 (tipo) and paso 1 (modelo) to supabase"
```

---

### Task 3: Paso 2 (medida) + isometric image

**Files:**
- Modify: `src/pages/Configurador.jsx`

- [ ] **Step 1: Add `producto_configuraciones` loading (fired together with telas in Task 4, but scaffolded here), medida state, and Paso 2 render**

Add state and effect (insert after the `productos` effect):

```jsx
  const [configuraciones, setConfiguraciones] = useState([])
  const [medidaSel, setMedidaSel] = useState(null)

  useEffect(() => {
    if (!modeloSel) { setConfiguraciones([]); return }
    async function load() {
      const { data } = await supabase.from('producto_configuraciones').select('*')
        .eq('producto_id', modeloSel.id).eq('activo', true).order('orden')
      setConfiguraciones(data ?? [])
    }
    load()
  }, [modeloSel])
```

Update `selectModelo` to also reset `medidaSel`:

```jsx
  const selectModelo = (prod) => {
    setModeloSel(prod)
    setMedidaSel(null)
  }
```

Add a `medidaTelaActivo` flag next to `modeloActivo`:

```jsx
  const medidaTelaActivo = !!modeloSel
```

Add the `selectMedida` handler:

```jsx
  const selectMedida = (cfg) => setMedidaSel(cfg)
```

Insert the isometric image block in the LEFT column, right after the `.cfg-thumbnails` div:

```jsx
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
```

Insert Paso 2 in the RIGHT column, right after the Paso 1 `</div>` (still inside the RIGHT column wrapper):

```jsx
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
```

- [ ] **Step 2: Verify in browser**

Select tipo "Escuadras" → modelo "Cubo" → Paso 2 should show "1 Plaza" and "1.5 Plazas" in two equal-width columns (2 items → `repeat(2, 1fr)`). Click "1 Plaza": since its `isometrico_url` is `null` in the DB, the isometric box should show the gray placeholder box with "Sin imagen isométrica", and the caption below should read "1 Plaza — 90 × 90 × 82 cm". Switching modelo should clear the isometric image until a new medida is picked.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Configurador.jsx
git commit -m "feat: wire configurador paso 2 (medida) and isometric preview"
```

---

### Task 4: Paso 3 (tela — grados, catálogo, colores, specs)

**Files:**
- Modify: `src/pages/Configurador.jsx`

- [ ] **Step 1: Add telas loading (fires together with configuraciones on modelo select — behavior #2), grado/tela/color state, and Paso 3 render**

Add state:

```jsx
  const [telas, setTelas] = useState([])
  const [gradoSel, setGradoSel] = useState('AA')
  const [telaSel, setTelaSel] = useState(null)
  const [colorSel, setColorSel] = useState(null)
```

Replace the `configuraciones`-only effect from Task 3 with a combined effect that loads both configuraciones and telas together, and auto-selects the first grado/catalog (behavior #2 in the task instructions: "medidas Y telas se activan simultáneamente, con el primer grado y primer catálogo auto-seleccionados"):

```jsx
  useEffect(() => {
    if (!modeloSel) { setConfiguraciones([]); setTelas([]); setTelaSel(null); setColorSel(null); return }
    async function load() {
      const [cfgRes, telasRes] = await Promise.all([
        supabase.from('producto_configuraciones').select('*')
          .eq('producto_id', modeloSel.id).eq('activo', true).order('orden'),
        supabase.from('telas').select('*, colores:tela_colores(*)')
          .eq('activo', true).order('grado').order('orden'),
      ])
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
  }, [modeloSel])
```

Add `selectGrado`, `selectTela`, `selectColor` handlers:

```jsx
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
```

Insert Paso 3 in the RIGHT column, right after Paso 2's closing `</div>`:

```jsx
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
```

- [ ] **Step 2: Verify in browser**

Select tipo → modelo. Confirm:
- Paso 2 and Paso 3 both go from disabled→enabled at the same instant (single click on a modelo).
- Grado tab "AA" is active by default and the dropdown is pre-filled with "Lino Basic (7 colores)", colors already showing without any extra click.
- Clicking grado "B" switches the dropdown to "Cancún (5 colores)" and re-renders that catalog's colors, clearing any previously selected color/specs panel.
- Clicking a color swatch shows the specs panel with the swatch, name, "Categoría X", and only the spec rows that have real data (most `tela_colores` rows have null spec fields today — confirm no "null"/"undefined" text ever renders).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Configurador.jsx
git commit -m "feat: wire configurador paso 3 (tela grados, catalogo, colores, specs)"
```

---

### Task 5: Paso 4 (resumen, price lookup, auth gating)

**Files:**
- Modify: `src/pages/Configurador.jsx`

- [ ] **Step 1: Add price loading (lookup, not calculation) and Paso 4 render**

Add state and effect:

```jsx
  const [precios, setPrecios] = useState([])

  useEffect(() => {
    if (!distribuidor || !modeloSel || !medidaSel) { setPrecios([]); return }
    async function load() {
      const { data } = await supabase.from('producto_precios').select('grado, precio')
        .eq('producto_id', modeloSel.id).eq('configuracion_id', medidaSel.id)
      setPrecios(data ?? [])
    }
    load()
  }, [distribuidor, modeloSel, medidaSel])

  const precioLookup = useMemo(() => {
    const row = precios.find(p => p.grado === telaSel?.grado)
    return row ? row.precio : null
  }, [precios, telaSel])
```

Insert Paso 4 in the RIGHT column, right after Paso 3's closing `</div>`:

```jsx
            {/* PASO 4 */}
            <div className="cfg-step">
              <div className="cfg-step-header">
                <div className="cfg-step-number">4.</div>
                <div className="cfg-step-title">Resumen de tu selección</div>
              </div>
              <div className="cfg-summary">
                <div className="cfg-summary-label">Tu Configuración</div>
                <div className="cfg-summary-row"><span>Tipo</span><span>{tipoSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row"><span>Modelo</span><span>{modeloSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row"><span>Medida</span><span>{medidaSel?.nombre ?? '—'}</span></div>
                <div className="cfg-summary-row">
                  <span>Tela</span>
                  <span>
                    {telaSel && colorSel ? (
                      <>
                        {telaSel.nombre} ({telaSel.grado}) · {colorSel.nombre}
                        <span className="cfg-tela-swatch" style={{ background: colorSel.codigo_hex || '#E2E8F0' }} />
                      </>
                    ) : telaSel ? `${telaSel.nombre} (${telaSel.grado})` : '—'}
                  </span>
                </div>
                {distribuidor && (
                  <div className="cfg-summary-price-row">
                    <span>Precio</span>
                    <span>{precioLookup != null ? fmt(precioLookup) : 'No disponible'}</span>
                  </div>
                )}
              </div>

              {!distribuidor && (
                <div className="cfg-message">🔒 Inicia sesión para ver precios como distribuidor</div>
              )}

              <div className="cfg-buttons">
                <button type="button" className="cfg-btn cfg-btn-primary" disabled={!distribuidor}>Crear Cotización</button>
                <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!distribuidor}>Guardar en mi espacio</button>
                <button type="button" className="cfg-btn cfg-btn-secondary" disabled={!distribuidor}>Enviar al carrito</button>
              </div>
            </div>
```

- [ ] **Step 2: Verify in browser**

Without a distribuidor session: summary fills in as you pick tipo/modelo/medida/tela+color; the price row never appears; the 🔒 message shows; all 3 buttons are visibly disabled (opacity 0.5) and unclickable.

Log in as the seeded distribuidor (via `/distribuidores` login form, existing site feature — do not build a new one) and return to `/configurador`, redo the same selections: the price row appears showing the value that matches `producto_precios` for that exact (producto, configuracion, grado) — cross-check one combination against the values pulled from the DB in this plan's header (e.g. Cubo · 1 Plaza · AA → $32,000). All 3 buttons become enabled but clicking them does nothing yet (no `alert`, no navigation) — this is intentional per the task's restriction against implementing their logic.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Configurador.jsx
git commit -m "feat: wire configurador paso 4 (resumen, price lookup, auth gating)"
```

---

### Task 6: Precarga por URL (`?tipo=<slug>&modelo=<slug>`)

**Files:**
- Modify: `src/pages/Configurador.jsx`

- [ ] **Step 1: Add `useSearchParams` and two staged preload effects**

Add the import:

```jsx
import { useSearchParams } from 'react-router-dom'
```

(already imported in the skeleton from Task 1 — confirm it's present.)

Add inside the component, near the other state:

```jsx
  const [searchParams] = useSearchParams()
  const [tipoPreloaded, setTipoPreloaded] = useState(false)
  const [modeloPreloadDone, setModeloPreloadDone] = useState(false)

  // Precarga de tipo: una sola vez, cuando categorias ya cargó
  useEffect(() => {
    if (tipoPreloaded || categorias.length === 0) return
    const tipoParam = searchParams.get('tipo')
    const cat = tipoParam ? categorias.find(c => c.slug === tipoParam) : null
    if (cat) selectTipo(cat)
    setTipoPreloaded(true)
  }, [categorias, tipoPreloaded, searchParams])

  // Precarga de modelo: una sola vez, cuando productos del tipo precargado ya cargaron
  useEffect(() => {
    if (!tipoPreloaded || modeloPreloadDone || productos.length === 0) return
    const modeloParam = searchParams.get('modelo')
    const prod = modeloParam ? productos.find(p => p.slug === modeloParam) : null
    if (prod) selectModelo(prod)
    setModeloPreloadDone(true)
  }, [tipoPreloaded, modeloPreloadDone, productos, searchParams])
```

`selectTipo`/`selectModelo` are the same click-handlers already used by the option grids, so preloading reuses the exact same state transitions a real click would trigger (resets downstream selections, triggers the same effects) — matching the mockup's own `precargarDesdeURL()` which literally calls `selectType`/`selectModel`.

If `tipoParam` doesn't match any categoria slug (or is absent), `cat` is `null`, `selectTipo` is skipped, and the flag is still set — so an invalid param is silently ignored without breaking the page, per requirement #7.

- [ ] **Step 2: Verify in browser**

- `http://localhost:5173/configurador?tipo=escuadras-l` → Paso 0 shows "Escuadras" pre-selected, Paso 1 populated with its productos, nothing further auto-selected.
- `http://localhost:5173/configurador?tipo=escuadras-l&modelo=cubo` → tipo AND modelo both pre-selected, Paso 2/Paso 3 already active with grado AA + first catálogo auto-loaded (same as a manual click would do).
- `http://localhost:5173/configurador?tipo=no-existe&modelo=no-existe` → page loads normally with nothing pre-selected, no console error.
- `http://localhost:5173/configurador` (no params) → behaves exactly as before this task.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Configurador.jsx
git commit -m "feat: support ?tipo=&modelo= url preload in configurador"
```

---

### Task 7: Full regression pass against the mockup + final report

**Files:** none (verification only)

- [ ] **Step 1: Side-by-side comparison**

Open `BrendellConfiguradorSinCascada.html` directly in a browser tab and `http://localhost:5173/configurador` in another. Walk both through the same sequence (tipo → modelo → medida → grado B → a catálogo → a color) and confirm: same step layout/order, same disabled/enabled opacity behavior, same "Catálogo (Grado) · Color" summary format, same button set and disabled behavior without session.

- [ ] **Step 2: Re-check every numbered behavior from `TASK1-instrucciones-claude-code.txt`**

Go through items 1–7 under "COMPORTAMIENTOS DEL MOCKUP QUE DEBEN QUEDAR IDÉNTICOS" one by one against the running page and check each off explicitly.

- [ ] **Step 3: Confirm restrictions were respected**

- `git diff --stat` should show only: `src/pages/Configurador.jsx` (new), `src/pages/Configurador.css` (new), `src/App.jsx` (modified, route only).
- No Supabase migration/DDL was run — this plan only ever used `select`.
- Grep the diff for `--serif`, `--gold`, `var(--` — must return nothing (confirms no Maison brand styling leaked in).

Run: `git diff --stat` and `git diff src/App.jsx`
Expected: matches the above.

- [ ] **Step 4: Report to the user**

Produce the report format required by the task instructions:
1. Full list of files created/modified (exact paths — from `git diff --stat`).
2. URL where the configurador works: `http://localhost:5173/configurador` (dev) — note the production URL once deployed.
3. Known mockup deviations and why:
   - Tipo icons: mockup used 4 hardcoded emoji per fake type; `categorias` has no icon column, so the first letter of `categorias.nombre` is used instead.
   - Header's "Cambiar" button (mockup's fake auth toggle) was dropped — real auth state comes from the site's existing Supabase session via `DistribuidorContext`, there is nothing to toggle manually.
   - The isometric caption text (mockup showed `"${measure} - Vista isométrica"` as a placeholder string) now shows the real `producto_configuraciones.dimensiones` value, since that column was explicitly named in the task's data-mapping section but had no rendering slot of its own in the mockup.
