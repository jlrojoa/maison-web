export default function ProductCard({ product, onClick }) {
  const image = product.imagen_principal
  const price = product.precio_desde

  return (
    <div className="pc" onClick={() => onClick(product)}>
      <div className="pci">
        <div className="pci-bg">
          {image
            ? <img src={image.url} alt={image.alt || product.nombre} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 48, color: 'var(--taupe)', opacity: .4 }}>{product.nombre?.[0]}</span>
              </div>
          }
        </div>
        {product.badge && <span className="pbg">{product.badge}</span>}
        <div className="pov">
          <span className="pct">Ver Producto</span>
        </div>
      </div>
      <div className="ptg">{product.categoria?.nombre ?? 'Colección'}</div>
      <div className="pnm">{product.nombre}</div>
      <div className="pds">{product.subtitulo}</div>
      <div className="ppr">
        {price
          ? <>
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)}
              <small> · desde</small>
            </>
          : <span style={{ color: 'var(--taupe)', fontSize: 12 }}>Consultar precio</span>
        }
      </div>
    </div>
  )
}
