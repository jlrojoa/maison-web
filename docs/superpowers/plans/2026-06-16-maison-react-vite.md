# Maison React + Vite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing single-file HTML site into a React + Vite app with pixel-perfect design parity, Supabase-backed products/textiles/leads, and an /admin panel.

**Architecture:** React Router v6 handles two top-level routes: `/` (public site) and `/admin` (admin panel). The public site is decomposed into focused section components that each own their markup and pull from Supabase. All original CSS is migrated verbatim to `src/index.css`. Images currently embedded as base64 in the HTML are extracted to `public/images/` as `.jpg` files.

**Tech Stack:** React 18, Vite 5, React Router v6, @supabase/supabase-js, Vite env vars for Supabase credentials

---

## File Map

```
C:\Users\Usuario\Downloads\Maison\
├── index.html                        # Vite entry (replace original)
├── vite.config.js
├── package.json
├── .env.local                        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .gitignore                        # add .env.local
├── public/
│   └── images/                       # extracted base64 images (hero, philosophy, editorial, kit, products)
└── src/
    ├── main.jsx                      # ReactDOM.createRoot, BrowserRouter
    ├── App.jsx                       # Routes: / and /admin/*
    ├── index.css                     # all CSS from original index.html verbatim
    ├── lib/
    │   └── supabase.js               # createClient() singleton
    ├── hooks/
    │   ├── useScrollNav.js           # scroll listener → adds .s class to nav
    │   └── useReveal.js              # IntersectionObserver → adds .vis to .rv elements
    ├── components/
    │   ├── Nav.jsx                   # fixed nav, accepts scrolled prop
    │   ├── Hero.jsx                  # full-viewport hero with animations
    │   ├── Marquee.jsx               # infinite scroll marquee strip
    │   ├── Philosophy.jsx            # 2-col image + stats section
    │   ├── Collections.jsx           # fetches products from Supabase, renders ProductCard grid
    │   ├── ProductCard.jsx           # single card with hover overlay
    │   ├── Materials.jsx             # fetches textiles from Supabase, renders 4-col grid
    │   ├── Editorial.jsx             # 2-col editorial section (static)
    │   ├── Kit.jsx                   # 2-col kit/service section (static)
    │   ├── LeadForm.jsx              # contact form, inserts into leads table
    │   └── Footer.jsx                # 4-col footer grid
    ├── pages/
    │   ├── Home.jsx                  # composes all section components
    │   └── ProductDetail.jsx         # full product detail view (was #pp), receives product via router state
    └── admin/
        ├── AdminLayout.jsx           # sidebar nav + <Outlet />
        ├── AdminDashboard.jsx        # counts: products, textiles, leads
        ├── AdminProducts.jsx         # list + create/edit/delete products
        ├── AdminTextiles.jsx         # list + create/edit/delete textiles
        └── AdminLeads.jsx            # read-only leads table
```

---

## Task 1: Scaffold Vite + React project in-place

**Files:**
- Modify: `C:\Users\Usuario\Downloads\Maison\` (scaffold here)
- Create: `index.html`, `vite.config.js`, `package.json`, `src/main.jsx`, `src/App.jsx`

- [ ] **Step 1: Scaffold Vite project in the existing repo directory**

```bash
cd C:\Users\Usuario\Downloads\Maison
npm create vite@latest . -- --template react
```

When prompted "Current directory is not empty. Remove existing files and continue?" — choose **No, keep existing files** (or `n`). Vite will scaffold alongside the existing `index.html`.

- [ ] **Step 2: Install dependencies**

```bash
cd C:\Users\Usuario\Downloads\Maison
npm install
npm install react-router-dom @supabase/supabase-js
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running at `http://localhost:5173` with default React page.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/ public/
git commit -m "feat: scaffold React + Vite project"
```

---

## Task 2: Migrate all CSS

**Files:**
- Create: `src/index.css` (full CSS from original `index.html` lines 8–219)
- Modify: `src/main.jsx` (import index.css)

- [ ] **Step 1: Copy the entire `<style>` block from the original index.html into `src/index.css`**

Extract everything between `<style>` and `</style>` (lines 8–219 of the original file). The content is already complete valid CSS — paste it verbatim. The file should contain: reset, `:root` variables, nav, hero, marquee, philosophy, collections, materials, editorial, kit, footer, product page, accordion, and reveal animation rules.

- [ ] **Step 2: Import it in `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

- [ ] **Step 3: Update `index.html` to add Google Fonts link**

In `index.html` inside `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/main.jsx index.html
git commit -m "feat: migrate CSS and fonts from original HTML"
```

---

## Task 3: Extract embedded images

**Files:**
- Create: `public/images/hero.jpg`, `public/images/philosophy.jpg`, `public/images/editorial.jpg`, `public/images/kit.jpg`, `public/images/product-sofa.jpg`, `public/images/product-chair.jpg`, `public/images/product-kit.jpg`
- Create: `scripts/extract-images.mjs` (one-time helper script)

- [ ] **Step 1: Write extraction script**

Create `scripts/extract-images.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const html = readFileSync('index.html', 'utf8')
mkdirSync('public/images', { recursive: true })

// Match all base64 image src attributes
const matches = [...html.matchAll(/src="data:image\/(jpeg|png|webp);base64,([^"]+)"/g)]

matches.forEach((match, i) => {
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const buf = Buffer.from(match[2], 'base64')
  const name = `public/images/img-${i}.${ext}`
  writeFileSync(name, buf)
  console.log(`Wrote ${name} (${(buf.length / 1024).toFixed(1)} KB)`)
})
```

- [ ] **Step 2: Run the extraction**

```bash
node scripts/extract-images.mjs
```

Expected: several `public/images/img-N.jpg` files written to disk. Note which index corresponds to which image by file size and order in the HTML.

- [ ] **Step 3: Rename extracted images to semantic names**

Rename the output files based on their visual content (check sizes — hero is likely largest):
```bash
# Rename in Explorer or via PowerShell
# e.g. img-0.jpg → hero.jpg, img-1.jpg → philosophy.jpg, etc.
```

- [ ] **Step 4: Commit**

```bash
git add public/images/ scripts/
git commit -m "feat: extract embedded base64 images to public/images"
```

---

## Task 4: Custom hooks

**Files:**
- Create: `src/hooks/useScrollNav.js`
- Create: `src/hooks/useReveal.js`

- [ ] **Step 1: Write `useScrollNav.js`**

```js
import { useEffect, useState } from 'react'

export function useScrollNav(threshold = 60) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}
```

- [ ] **Step 2: Write `useReveal.js`**

```js
import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv')
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }),
      { threshold: 0.15 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useScrollNav and useReveal hooks"
```

---

## Task 5: Nav component

**Files:**
- Create: `src/components/Nav.jsx`

- [ ] **Step 1: Write `Nav.jsx`**

```jsx
import { useScrollNav } from '../hooks/useScrollNav'

export default function Nav() {
  const scrolled = useScrollNav(60)
  return (
    <nav id="nav" className={scrolled ? 's' : ''}>
      <a href="#" className="logo" onClick={e => e.preventDefault()}>
        Maison<b>.</b>
      </a>
      <ul className="nav-ul">
        <li><a href="#cl">Colecciones</a></li>
        <li><a href="#mt">Materiales</a></li>
        <li><a href="#ph">Filosofía</a></li>
        <li><a href="#ct">Contacto</a></li>
      </ul>
      <a href="#ct" className="nbtn">Solicitar Presupuesto</a>
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.jsx
git commit -m "feat: add Nav component with scroll shrink"
```

---

## Task 6: Hero component

**Files:**
- Create: `src/components/Hero.jsx`

- [ ] **Step 1: Write `Hero.jsx`**

```jsx
export default function Hero() {
  return (
    <section className="hero">
      <img className="hero-img" src="/images/hero.jpg" alt="Maison hero" />
      <div className="hero-ph" />
      <div className="hero-txt">
        <p className="ey">Alta Tapicería · Diseño de Interiores</p>
        <h1 className="ht">El arte de <em>vestir</em><br />tus espacios</h1>
        <p className="hs">
          Creamos piezas únicas con materiales de la más alta calidad.
          Cada proyecto es una obra singular diseñada para perdurar.
        </p>
        <div className="ha">
          <a href="#cl" className="bd">Ver Colecciones</a>
          <a href="#ph" className="bg">Nuestra Filosofía</a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Hero.jsx
git commit -m "feat: add Hero component"
```

---

## Task 7: Marquee component

**Files:**
- Create: `src/components/Marquee.jsx`

- [ ] **Step 1: Write `Marquee.jsx`**

```jsx
const ITEMS = [
  'Tapicería Artesanal', 'Diseño Exclusivo', 'Materiales Premium',
  'Hecho a Medida', 'Alta Costura del Hogar', 'Proyectos Singulares',
]

export default function Marquee() {
  const repeated = [...ITEMS, ...ITEMS]
  return (
    <div className="mq">
      <div className="mq-t">
        {repeated.map((item, i) => (
          <span key={i} className="mi">
            {item} <span className="ms">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Marquee.jsx
git commit -m "feat: add Marquee component"
```

---

## Task 8: Philosophy component

**Files:**
- Create: `src/components/Philosophy.jsx`

- [ ] **Step 1: Write `Philosophy.jsx`**

```jsx
export default function Philosophy() {
  return (
    <section className="phil" id="ph">
      <div className="ph-img">
        <img src="/images/philosophy.jpg" alt="Nuestra filosofía" />
        <div className="ph-dec">M</div>
      </div>
      <div className="ph-c">
        <p className="sl">Nuestra Filosofía</p>
        <h2 className="st">Donde la <em>artesanía</em><br />encuentra el diseño</h2>
        <p className="sb rv">
          Cada pieza que creamos nace de una conversación profunda con el espacio
          y quienes lo habitan. Seleccionamos los mejores materiales europeos y
          trabajamos con artesanos de tercera generación.
        </p>
        <div className="stats rv d1">
          <div>
            <div className="sn">18<sup>+</sup></div>
            <div className="sl2">Años de experiencia</div>
          </div>
          <div>
            <div className="sn">340<sup>+</sup></div>
            <div className="sl2">Proyectos realizados</div>
          </div>
          <div>
            <div className="sn">12<sup>+</sup></div>
            <div className="sl2">Premios de diseño</div>
          </div>
          <div>
            <div className="sn">98<sup>%</sup></div>
            <div className="sl2">Clientes satisfechos</div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Philosophy.jsx
git commit -m "feat: add Philosophy component"
```

---

## Task 9: Supabase client + database schema

**Files:**
- Create: `src/lib/supabase.js`
- Create: `.env.local`

- [ ] **Step 1: Create `.env.local`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace values with actual Supabase project credentials.

- [ ] **Step 2: Write `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 3: Create Supabase tables via SQL editor**

Run this SQL in the Supabase dashboard → SQL Editor:

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  category text not null,
  price numeric(10,2) not null,
  description text,
  badge text,
  colors jsonb default '[]',
  sizes jsonb default '[]',
  specs jsonb default '{}',
  image_url text,
  created_at timestamptz default now()
);

create table textiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon_type text,
  category text,
  created_at timestamptz default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text,
  product_interest text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table products enable row level security;
alter table textiles enable row level security;
alter table leads enable row level security;

-- Public read for products and textiles
create policy "public read products" on products for select using (true);
create policy "public read textiles" on textiles for select using (true);

-- Anyone can insert a lead
create policy "public insert leads" on leads for insert with check (true);

-- Seed products
insert into products (name, subtitle, category, price, description, badge, image_url) values
  ('Sofá Milán', 'Colección Contemporánea', 'Sofás', 4200, 'Estructura de haya maciza con tapizado en lino belga. Disponible en 12 acabados.', 'Nuevo', '/images/product-sofa.jpg'),
  ('Silla Arco', 'Edición Limitada', 'Sillas', 1850, 'Diseño de autor con asiento tapizado en terciopelo italiano y patas de nogal.', 'Ed. Limitada', '/images/product-chair.jpg'),
  ('Cabecero Luna', 'Alta Tapicería', 'Cabeceros', 2100, 'Cabecero tapizado a mano en bouclé francés con ribete en latón envejecido.', null, '/images/product-kit.jpg');

-- Seed textiles
insert into textiles (name, description, icon_type, category) values
  ('Lino Belga', 'Tejido natural de alta densidad con caída excepcional. Resistente y atemporal.', 'linen', 'Natural'),
  ('Terciopelo Italiano', 'Terciopelo de seda y algodón con lustre profundo. Tacto inigualable.', 'velvet', 'Lujo'),
  ('Bouclé Francés', 'Tejido texturizado de lana merino con hilos rizados. Calidez y sofisticación.', 'boucle', 'Premium'),
  ('Cuero Napa', 'Cuero plena flor de curtido vegetal. Mejora con el uso y el tiempo.', 'leather', 'Natural');
```

- [ ] **Step 4: Verify connection**

In `src/App.jsx`, temporarily add:
```js
import { supabase } from './lib/supabase'
supabase.from('products').select('*').then(({ data }) => console.log(data))
```
Open browser console — should see 3 product rows. Remove after confirming.

- [ ] **Step 5: Add `.env.local` to `.gitignore`**

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase.js .gitignore
git commit -m "feat: add Supabase client and database schema"
```

---

## Task 10: Collections + ProductCard components

**Files:**
- Create: `src/components/ProductCard.jsx`
- Create: `src/components/Collections.jsx`

- [ ] **Step 1: Write `ProductCard.jsx`**

```jsx
export default function ProductCard({ product, onClick }) {
  return (
    <div className="pc" onClick={() => onClick(product)}>
      <div className="pci">
        <div className="pci-bg">
          <img src={product.image_url} alt={product.name} />
        </div>
        {product.badge && <span className="pbg">{product.badge}</span>}
        <div className="pov">
          <span className="pct">Ver Producto</span>
        </div>
      </div>
      <div className="ptg">{product.category}</div>
      <div className="pnm">{product.name}</div>
      <div className="pds">{product.subtitle}</div>
      <div className="ppr">
        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(product.price)}
        <small> · desde</small>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `Collections.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from './ProductCard'

export default function Collections({ onProductClick }) {
  const [products, setProducts] = useState([])

  useEffect(() => {
    supabase.from('products').select('*').order('created_at')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  return (
    <section className="coll" id="cl">
      <div className="ch">
        <div>
          <p className="sl rv">Colecciones</p>
          <h2 className="st rv d1">Piezas que <em>definen</em> el espacio</h2>
        </div>
        <a href="#cl" className="la rv d2">Ver todo</a>
      </div>
      <div className="pg">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onClick={onProductClick} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.jsx src/components/Collections.jsx
git commit -m "feat: add Collections and ProductCard with Supabase data"
```

---

## Task 11: Materials component

**Files:**
- Create: `src/components/Materials.jsx`

- [ ] **Step 1: Write `Materials.jsx`**

SVG icons are inline per textile's `icon_type`. Map: `linen` → wave lines, `velvet` → diamond grid, `boucle` → circles, `leather` → rectangle.

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ICONS = {
  linen: <svg className="mico" viewBox="0 0 42 42"><path d="M4 14h34M4 21h34M4 28h34"/></svg>,
  velvet: <svg className="mico" viewBox="0 0 42 42"><path d="M21 4l17 17-17 17L4 21z"/></svg>,
  boucle: <svg className="mico" viewBox="0 0 42 42"><circle cx="21" cy="21" r="14"/><circle cx="21" cy="21" r="7"/></svg>,
  leather: <svg className="mico" viewBox="0 0 42 42"><rect x="6" y="12" width="30" height="18" rx="2"/></svg>,
}

export default function Materials() {
  const [textiles, setTextiles] = useState([])

  useEffect(() => {
    supabase.from('textiles').select('*').order('created_at')
      .then(({ data }) => setTextiles(data ?? []))
  }, [])

  return (
    <section className="mts" id="mt">
      <div className="mh">
        <p className="sl">Materiales</p>
        <h2 className="st">Selección <em>excepcional</em></h2>
        <p className="sb">Trabajamos exclusivamente con proveedores europeos certificados.</p>
      </div>
      <div className="mg">
        {textiles.map(t => (
          <div key={t.id} className="mitem rv">
            {ICONS[t.icon_type] ?? ICONS.linen}
            <div className="mnm">{t.name}</div>
            <div className="mds">{t.description}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Materials.jsx
git commit -m "feat: add Materials component with Supabase textiles"
```

---

## Task 12: Editorial, Kit, LeadForm, Footer components

**Files:**
- Create: `src/components/Editorial.jsx`
- Create: `src/components/Kit.jsx`
- Create: `src/components/LeadForm.jsx`
- Create: `src/components/Footer.jsx`

- [ ] **Step 1: Write `Editorial.jsx`**

```jsx
export default function Editorial() {
  return (
    <section className="edit">
      <div className="edit-l">
        <div className="edit-block rv">
          <div className="edit-tag">Proceso</div>
          <h3 className="edit-title">Del boceto a la <em>pieza final</em></h3>
          <p className="edit-desc">Cada encargo comienza con una visita al espacio. Medimos, fotografiamos y escuchamos.</p>
        </div>
        <div className="edit-block rv d1">
          <div className="edit-tag">Materiales</div>
          <h3 className="edit-title">Selección <em>sin concesiones</em></h3>
          <p className="edit-desc">Viajamos a las mejores fábricas textiles de Europa para seleccionar materiales.</p>
        </div>
        <div className="edit-block rv d2">
          <div className="edit-tag">Entrega</div>
          <h3 className="edit-title">Instalación <em>incluida</em></h3>
          <p className="edit-desc">Nuestro equipo se encarga de la entrega e instalación de cada pieza.</p>
        </div>
      </div>
      <div className="edit-r">
        <img src="/images/editorial.jpg" alt="Proceso editorial" />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `Kit.jsx`**

```jsx
export default function Kit() {
  return (
    <section className="kit">
      <div className="ki">
        <img className="ki-photo" src="/images/kit.jpg" alt="Kit de servicio" />
      </div>
      <div className="kc">
        <p className="sl rv">Servicio Completo</p>
        <h2 className="kt rv d1">Todo lo que <em>necesitas</em><br />en un solo lugar</h2>
        <ul className="kl rv d2">
          <li>Visita de diseño en tu domicilio</li>
          <li>Muestrario de más de 400 tejidos</li>
          <li>Presupuesto detallado sin compromiso</li>
          <li>Fabricación artesanal en nuestro taller</li>
          <li>Entrega e instalación profesional</li>
        </ul>
        <a href="#ct" className="bd rv d3">Solicitar Visita</a>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Write `LeadForm.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LeadForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    const { error } = await supabase.from('leads').insert(form)
    setStatus(error ? 'error' : 'ok')
    if (!error) setForm({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <section id="ct" style={{ background: 'var(--cream)', padding: '96px 52px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p className="sl rv">Contacto</p>
        <h2 className="st rv d1">Hablemos de <em>tu proyecto</em></h2>
        <form onSubmit={submit} style={{ marginTop: 42 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <input className="so" style={{ width: '100%', padding: '12px 16px' }} placeholder="Nombre" required value={form.name} onChange={e => set('name', e.target.value)} />
            <input className="so" style={{ width: '100%', padding: '12px 16px' }} placeholder="Email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <input className="so" style={{ width: '100%', padding: '12px 16px', marginBottom: 16 }} placeholder="Teléfono (opcional)" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <textarea className="so" style={{ width: '100%', padding: '12px 16px', marginBottom: 24, minHeight: 120, resize: 'vertical' }} placeholder="Cuéntanos tu proyecto…" value={form.message} onChange={e => set('message', e.target.value)} />
          <button type="submit" className="bcot" disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando…' : 'Enviar Consulta'}
          </button>
          {status === 'ok' && <p style={{ color: 'var(--gold)', fontFamily: 'var(--sans)', fontSize: 13, marginTop: 12 }}>Mensaje recibido. Te contactamos en 24h.</p>}
          {status === 'error' && <p style={{ color: 'red', fontFamily: 'var(--sans)', fontSize: 13, marginTop: 12 }}>Error al enviar. Inténtalo de nuevo.</p>}
        </form>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Write `Footer.jsx`**

```jsx
export default function Footer() {
  return (
    <footer>
      <div className="fg">
        <div>
          <div className="fl">Maison<b>.</b></div>
          <p className="ft">Alta tapicería artesanal. Diseñamos y fabricamos piezas únicas para espacios singulares.</p>
        </div>
        <div>
          <div className="fct">Colecciones</div>
          <ul className="fll"><li><a href="#cl">Sofás</a></li><li><a href="#cl">Sillas</a></li><li><a href="#cl">Cabeceros</a></li></ul>
        </div>
        <div>
          <div className="fct">Servicios</div>
          <ul className="fll"><li><a href="#ph">Diseño</a></li><li><a href="#mt">Materiales</a></li><li><a href="#ct">Presupuesto</a></li></ul>
        </div>
        <div>
          <div className="fct">Contacto</div>
          <ul className="fll"><li><a href="mailto:hola@maison.es">hola@maison.es</a></li><li><a href="tel:+34910000000">+34 910 000 000</a></li></ul>
        </div>
      </div>
      <div className="fb">
        <span className="fc">© 2026 Maison. Todos los derechos reservados.</span>
        <a href="/admin" className="fc" style={{ textDecoration: 'none' }}>Admin</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Editorial.jsx src/components/Kit.jsx src/components/LeadForm.jsx src/components/Footer.jsx
git commit -m "feat: add Editorial, Kit, LeadForm, Footer components"
```

---

## Task 13: ProductDetail page

**Files:**
- Create: `src/pages/ProductDetail.jsx`

- [ ] **Step 1: Write `ProductDetail.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductDetail({ product, onBack }) {
  const [activeImg, setActiveImg] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [openAccordion, setOpenAccordion] = useState(null)
  const [status, setStatus] = useState(null)

  if (!product) return null

  const images = product.image_url ? [product.image_url] : []
  const colors = product.colors ?? []
  const sizes = product.sizes ?? []

  const requestQuote = async () => {
    setStatus('loading')
    const { error } = await supabase.from('leads').insert({
      name: 'Consulta web',
      email: 'pending@maison.es',
      product_interest: product.name,
      message: `Interés en ${product.name}${selectedColor ? ` · Color: ${selectedColor}` : ''}${selectedSize ? ` · Talla: ${selectedSize}` : ''}`,
    })
    setStatus(error ? 'error' : 'ok')
  }

  const accordions = [
    { title: 'Descripción', content: product.description },
    { title: 'Especificaciones', content: JSON.stringify(product.specs, null, 2) },
    { title: 'Cuidados', content: 'Limpiar con paño seco. Evitar exposición directa al sol.' },
    { title: 'Entrega', content: 'Plazo de fabricación: 6-8 semanas. Envío incluido en toda España.' },
  ]

  return (
    <div id="pp" className="on">
      <div className="pnav">
        <button className="bb" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5"/>
          </svg>
          Volver
        </button>
        <span className="bc">Colecciones / {product.category} / {product.name}</span>
      </div>
      <div className="pl">
        <div className="pgal">
          <div className="gm">
            <div className="gm-bg">
              {images[activeImg]
                ? <img src={images[activeImg]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="gm-lbl">{product.name[0]}</span>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="gths">
              {images.map((img, i) => (
                <div key={i} className={`gt ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pd">
          <div className="p-tag">{product.category}</div>
          <h1 className="p-nm">{product.name}</h1>
          <div className="p-sb">{product.subtitle}</div>
          <div className="p-pr">
            <span className="p-price">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(product.price)}
            </span>
            <span className="p-note">precio desde, personalización incluida</span>
          </div>
          <p className="p-desc">{product.description}</p>

          {colors.length > 0 && (
            <div className="cb">
              <div className="ct">Tejido / Color <span>{selectedColor ?? 'Seleccionar'}</span></div>
              <div className="sws">
                {colors.map(c => (
                  <div key={c.name} className={`sw ${selectedColor === c.name ? 'on' : ''}`}
                    style={{ background: c.hex }} d={c.name}
                    onClick={() => setSelectedColor(c.name)} />
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="cb">
              <div className="ct">Medidas</div>
              <div className="szs">
                {sizes.map(s => (
                  <button key={s} className={`so ${selectedSize === s ? 'on' : ''}`}
                    onClick={() => setSelectedSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <button className="bcot" onClick={requestQuote} disabled={status === 'loading'}>
            {status === 'loading' ? 'Enviando…' : status === 'ok' ? '✓ Solicitud enviada' : 'Solicitar Presupuesto'}
          </button>
          <button className="bkit" onClick={onBack}>Seguir Explorando</button>

          <div className="acc">
            {accordions.map(a => (
              <div key={a.title} className={`ai ${openAccordion === a.title ? 'op' : ''}`}>
                <div className="ah" onClick={() => setOpenAccordion(openAccordion === a.title ? null : a.title)}>
                  {a.title} <span className="aic">+</span>
                </div>
                <div className="ab" style={{ maxHeight: openAccordion === a.title ? 300 : 0 }}>
                  <div className="abin">{a.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProductDetail.jsx
git commit -m "feat: add ProductDetail page with accordion and lead capture"
```

---

## Task 14: Home page + App router

**Files:**
- Create: `src/pages/Home.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write `Home.jsx`**

```jsx
import { useState } from 'react'
import { useReveal } from '../hooks/useReveal'
import Nav from '../components/Nav'
import Hero from '../components/Hero'
import Marquee from '../components/Marquee'
import Philosophy from '../components/Philosophy'
import Collections from '../components/Collections'
import Materials from '../components/Materials'
import Editorial from '../components/Editorial'
import Kit from '../components/Kit'
import LeadForm from '../components/LeadForm'
import Footer from '../components/Footer'
import ProductDetail from './ProductDetail'

export default function Home() {
  useReveal()
  const [selectedProduct, setSelectedProduct] = useState(null)

  if (selectedProduct) {
    return (
      <>
        <Nav />
        <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
      </>
    )
  }

  return (
    <div id="mp">
      <Nav />
      <Hero />
      <Marquee />
      <Philosophy />
      <Collections onProductClick={setSelectedProduct} />
      <Materials />
      <Editorial />
      <Kit />
      <LeadForm />
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Write `src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AdminLayout from './admin/AdminLayout'
import AdminDashboard from './admin/AdminDashboard'
import AdminProducts from './admin/AdminProducts'
import AdminTextiles from './admin/AdminTextiles'
import AdminLeads from './admin/AdminLeads'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="textiles" element={<AdminTextiles />} />
        <Route path="leads" element={<AdminLeads />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Verify the public site renders correctly**

```bash
npm run dev
```

Open `http://localhost:5173` — all sections should be visible, fonts correct, nav shrinks on scroll, products load from Supabase, reveal animations fire on scroll.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.jsx src/App.jsx
git commit -m "feat: wire up Home page and App router"
```

---

## Task 15: Admin panel

**Files:**
- Create: `src/admin/AdminLayout.jsx`
- Create: `src/admin/AdminDashboard.jsx`
- Create: `src/admin/AdminProducts.jsx`
- Create: `src/admin/AdminTextiles.jsx`
- Create: `src/admin/AdminLeads.jsx`

- [ ] **Step 1: Write `AdminLayout.jsx`**

```jsx
import { Outlet, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Productos' },
  { to: '/admin/textiles', label: 'Tejidos' },
  { to: '/admin/leads', label: 'Leads' },
]

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--sans)' }}>
      <aside style={{ width: 220, background: 'var(--ink)', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: '#fff', letterSpacing: '.2em', marginBottom: 32 }}>
          Maison<span style={{ color: 'var(--gold)' }}>.</span> Admin
        </div>
        {LINKS.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            style={({ isActive }) => ({
              padding: '10px 14px', textDecoration: 'none', fontSize: 12, letterSpacing: '.12em',
              textTransform: 'uppercase', borderRadius: 2,
              background: isActive ? 'rgba(184,151,106,.2)' : 'transparent',
              color: isActive ? 'var(--gold-l)' : 'rgba(255,255,255,.45)',
              transition: 'all .2s',
            })}>
            {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <NavLink to="/" style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>
            ← Volver al sitio
          </NavLink>
        </div>
      </aside>
      <main style={{ flex: 1, background: 'var(--warm)', padding: 48, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Write `AdminDashboard.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ products: 0, textiles: 0, leads: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('textiles').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
    ]).then(([p, t, l]) => setCounts({ products: p.count, textiles: t.count, leads: l.count }))
  }, [])

  const tiles = [
    { label: 'Productos', value: counts.products },
    { label: 'Tejidos', value: counts.textiles },
    { label: 'Leads', value: counts.leads },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 36, marginBottom: 36 }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: '#fff', padding: '32px 28px', borderBottom: '3px solid var(--gold)' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 300, color: 'var(--ink)' }}>{t.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', marginTop: 6 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `AdminProducts.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { name: '', subtitle: '', category: '', price: '', description: '', badge: '', image_url: '' }

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = () => supabase.from('products').select('*').order('created_at').then(({ data }) => setProducts(data ?? []))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (editing) {
      await supabase.from('products').update({ ...form, price: parseFloat(form.price) }).eq('id', editing)
    } else {
      await supabase.from('products').insert({ ...form, price: parseFloat(form.price) })
    }
    setForm(EMPTY); setEditing(null); load()
  }

  const del = async (id) => { await supabase.from('products').delete().eq('id', id); load() }

  const edit = (p) => { setEditing(p.id); setForm({ name: p.name, subtitle: p.subtitle ?? '', category: p.category, price: String(p.price), description: p.description ?? '', badge: p.badge ?? '', image_url: p.image_url ?? '' }) }

  const fields = ['name', 'subtitle', 'category', 'price', 'description', 'badge', 'image_url']
  const labels = { name: 'Nombre', subtitle: 'Subtítulo', category: 'Categoría', price: 'Precio (€)', description: 'Descripción', badge: 'Badge', image_url: 'URL Imagen' }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 36, marginBottom: 36 }}>Productos</h1>
      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f} style={{ gridColumn: ['description'].includes(f) ? '1/-1' : undefined }}>
              <label style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>{labels[f]}</label>
              {f === 'description'
                ? <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 80 }} value={form[f]} onChange={e => set(f, e.target.value)} />
                : <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form[f]} onChange={e => set(f, e.target.value)} type={f === 'price' ? 'number' : 'text'} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px' }} onClick={save}>{editing ? 'Guardar cambios' : 'Crear producto'}</button>
          {editing && <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>}
        </div>
      </div>
      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr>{['Nombre', 'Categoría', 'Precio', 'Badge', ''].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{h}</th>)}</tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>{p.name}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{p.category}</td>
              <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>€{p.price}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--gold)', borderBottom: '1px solid var(--sand)' }}>{p.badge}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--sand)', display: 'flex', gap: 12 }}>
                <button className="la" onClick={() => edit(p)}>Editar</button>
                <button className="la" style={{ borderColor: 'red', color: 'red' }} onClick={() => del(p.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Write `AdminTextiles.jsx`**

Same pattern as AdminProducts but for textiles table. Fields: `name`, `description`, `icon_type`, `category`.

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { name: '', description: '', icon_type: '', category: '' }

export default function AdminTextiles() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = () => supabase.from('textiles').select('*').order('created_at').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (editing) { await supabase.from('textiles').update(form).eq('id', editing) }
    else { await supabase.from('textiles').insert(form) }
    setForm(EMPTY); setEditing(null); load()
  }
  const del = async (id) => { await supabase.from('textiles').delete().eq('id', id); load() }
  const edit = (r) => { setEditing(r.id); setForm({ name: r.name, description: r.description ?? '', icon_type: r.icon_type ?? '', category: r.category ?? '' }) }

  const fields = [
    { key: 'name', label: 'Nombre' },
    { key: 'category', label: 'Categoría' },
    { key: 'icon_type', label: 'Tipo de icono (linen/velvet/boucle/leather)' },
    { key: 'description', label: 'Descripción', full: true },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 36, marginBottom: 36 }}>Tejidos</h1>
      <div style={{ background: '#fff', padding: 32, marginBottom: 40 }}>
        <h3 style={{ fontSize: 13, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 24, color: 'var(--charcoal)' }}>{editing ? 'Editar tejido' : 'Nuevo tejido'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : undefined }}>
              <label style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', display: 'block', marginBottom: 6 }}>{f.label}</label>
              {f.full
                ? <textarea className="so" style={{ width: '100%', padding: '10px 14px', minHeight: 80 }} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                : <input className="so" style={{ width: '100%', padding: '10px 14px' }} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="bcot" style={{ width: 'auto', padding: '12px 28px' }} onClick={save}>{editing ? 'Guardar cambios' : 'Crear tejido'}</button>
          {editing && <button className="bkit" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => { setEditing(null); setForm(EMPTY) }}>Cancelar</button>}
        </div>
      </div>
      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead><tr>{['Nombre', 'Categoría', 'Icono', ''].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>{r.name}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{r.category}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{r.icon_type}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--sand)', display: 'flex', gap: 12 }}>
                <button className="la" onClick={() => edit(r)}>Editar</button>
                <button className="la" style={{ borderColor: 'red', color: 'red' }} onClick={() => del(r.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Write `AdminLeads.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminLeads() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    supabase.from('leads').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setLeads(data ?? []))
  }, [])

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 36, marginBottom: 36 }}>Leads</h1>
      <table style={{ width: '100%', background: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Fecha', 'Nombre', 'Email', 'Teléfono', 'Producto', 'Mensaje'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id}>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)', whiteSpace: 'nowrap' }}>
                {new Date(l.created_at).toLocaleDateString('es-ES')}
              </td>
              <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>{l.name}</td>
              <td style={{ padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--sand)' }}>{l.email}</td>
              <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--taupe)', borderBottom: '1px solid var(--sand)' }}>{l.phone ?? '—'}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--gold)', borderBottom: '1px solid var(--sand)' }}>{l.product_interest ?? '—'}</td>
              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--stone)', borderBottom: '1px solid var(--sand)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Verify admin panel**

Open `http://localhost:5173/admin` — sidebar visible, dashboard shows counts, products/textiles CRUD works, leads table shows submissions.

- [ ] **Step 7: Commit**

```bash
git add src/admin/
git commit -m "feat: add admin panel with products, textiles, leads management"
```

---

## Task 16: Deploy to Vercel

**Files:**
- Create: `vercel.json` (SPA routing fix)

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures `/admin` and any deep route is served by the React app instead of returning 404.

- [ ] **Step 2: Set Vercel environment variables**

In Vercel dashboard → maison-web project → Settings → Environment Variables:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

- [ ] **Step 3: Build and push**

```bash
git add vercel.json
git commit -m "feat: add vercel.json for SPA routing"
git push
```

- [ ] **Step 4: Redeploy**

```bash
vercel --yes --prod
```

- [ ] **Step 5: Verify production**

- `https://maison-web-mauve.vercel.app` — public site with live Supabase data
- `https://maison-web-mauve.vercel.app/admin` — admin panel functional

---

## Self-Review

**Spec coverage:**
- ✅ React + Vite project structure
- ✅ Pixel-perfect design (CSS migrated verbatim, same class names)
- ✅ Supabase products table → Collections section
- ✅ Supabase textiles table → Materials section
- ✅ Supabase leads table ← LeadForm + ProductDetail quote request
- ✅ /admin panel with CRUD for products, textiles, read-only leads
- ✅ Product detail page (was #pp toggle, now route state)
- ✅ Deploy to Vercel with SPA routing

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:** `supabase` import from `'../lib/supabase'` used consistently. `product.id` used as React key throughout. `colors` and `sizes` are `jsonb` arrays accessed as JS arrays.
