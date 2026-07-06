const ITEMS = [
  'Tapicería de Alta Gama',
  'Diseño Modular',
  'Telas Importadas de Europa',
  'Fabricación Artesanal',
  'Atelier Puebla · México',
]

export default function Marquee() {
  const repeated = [...ITEMS, ...ITEMS]
  return (
    <div className="mq">
      <div className="mq-t">
        {repeated.map((item, i) => (
          <span key={i} className="mi">
            {item} <span className="ms">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
