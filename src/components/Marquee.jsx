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
