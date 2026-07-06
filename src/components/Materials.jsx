const TILES = [
  {
    id: 1,
    nombre: 'Lino Belga',
    descripcion: 'Tejido natural de fibra larga, transpirable. Se vuelve más suave con cada lavado.',
    animClass: 'rv',
    icon: (
      <svg className="mico" viewBox="0 0 48 48">
        <path d="M8 24 Q16 12 24 24 Q32 36 40 24" />
        <path d="M8 32 Q16 20 24 32 Q32 44 40 32" />
      </svg>
    ),
  },
  {
    id: 2,
    nombre: 'Bouclé Italiano',
    descripcion: 'Tela estructurada de alta textura importada de Milán. Resistente al uso diario.',
    animClass: 'rv d1',
    icon: (
      <svg className="mico" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="14" />
        <circle cx="24" cy="24" r="7" />
        <circle cx="24" cy="24" r="2" />
      </svg>
    ),
  },
  {
    id: 3,
    nombre: 'Espuma HR 45 kg',
    descripcion: 'Alta resiliencia. Mantiene su forma original por más de 10 años de uso diario.',
    animClass: 'rv d2',
    icon: (
      <svg className="mico" viewBox="0 0 48 48">
        <rect x="10" y="18" width="28" height="16" rx="2" />
        <path d="M16 18V14a8 8 0 0116 0v4" />
      </svg>
    ),
  },
  {
    id: 4,
    nombre: 'Madera de Fresno',
    descripcion: 'Estructura en fresno macizo con refuerzo metálico. Garantía estructural 10 años.',
    animClass: 'rv d3',
    icon: (
      <svg className="mico" viewBox="0 0 48 48">
        <path d="M12 36 L24 12 L36 36" />
        <path d="M16 28 h16" />
      </svg>
    ),
  },
]

export default function Materials() {
  return (
    <section className="mts" id="mt">
      <div className="mh rv">
        <p className="sl">Lo que nos diferencia</p>
        <h2 className="st">Materiales que <em>se sienten</em></h2>
        <p className="sb">Seleccionamos telas de Italia y Bélgica, espumas de alta recuperación y maderas de primera calidad.</p>
      </div>
      <div className="mg">
        {TILES.map(t => (
          <div key={t.id} className={`mitem ${t.animClass}`}>
            {t.icon}
            <p className="mnm">{t.nombre}</p>
            <p className="mds">{t.descripcion}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
