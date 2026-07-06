import { useNavigate } from 'react-router-dom'

const PRODUCTS = [
  {
    id: 'sofa',
    nombre: 'Olivia',
    subtitulo: 'Sofá modular de lino belga. Relleno pluma + HR foam 45 kg/m³.',
    badge: 'Nuevo',
    categoria: { nombre: 'Sofás Modulares' },
    imagen_principal: { url: '/images/product-sofa.png', alt: 'Olivia' },
    animClass: 'rv',
  },
  {
    id: 'cama',
    nombre: 'Nordic',
    subtitulo: 'Base tapizada con cabecero doble panel acolchado. Tela técnica Riviera.',
    badge: null,
    categoria: { nombre: 'Camas Tapizadas' },
    imagen_principal: { url: '/images/product-cama.png', alt: 'Nordic' },
    animClass: 'rv d1',
  },
  {
    id: 'luna',
    nombre: 'Luna',
    subtitulo: 'Butaca giratoria en bouclé perla. Forma orgánica escultórica.',
    badge: 'Bestseller',
    categoria: { nombre: 'Butacas & Sillones' },
    imagen_principal: { url: '/images/product-luna.png', alt: 'Luna' },
    animClass: 'rv d2',
  },
]

export default function Collections() {
  const navigate = useNavigate()
  return (
    <section className="coll" id="cl">
      <div className="ch">
        <div>
          <p className="sl">Catálogo 2025</p>
          <h2 className="st" style={{ marginBottom: 0 }}>Nuestras <em>Colecciones</em></h2>
        </div>
        <a href="/colecciones" className="la" onClick={e => { e.preventDefault(); navigate('/colecciones') }}>Ver catálogo completo →</a>
      </div>
      <div className="pg">
        {PRODUCTS.map(p => (
          <div key={p.id} className={`pc ${p.animClass}`} style={{ cursor: 'default' }}>
            <div className="pci">
              <div className="pci-bg">
                <img src={p.imagen_principal.url} alt={p.imagen_principal.alt} />
              </div>
              {p.badge && <span className="pbg">{p.badge}</span>}
            </div>
            <div className="ptg">{p.categoria.nombre}</div>
            <div className="pnm">{p.nombre}</div>
            <div className="pds">{p.subtitulo}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
