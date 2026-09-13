const TILES = [
  {
    id: 1,
    nombre: 'Telas Residencial & Contract',
    descripcion: 'Telas seleccionadas para uso residencial y contract, con la resistencia que exigen espacios de alto tráfico como hoteles y desarrollos.',
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
    nombre: 'Mano de Obra Calificada',
    descripcion: 'Combinamos maquinaria de precisión con personal capacitado y años de oficio en tapicería — el balance que distingue una pieza bien hecha.',
    animClass: 'rv d1',
    icon: (
      <svg className="mico" viewBox="0 0 48 48">
        <path d="M14 42V22a2.5 2.5 0 015 0v6" />
        <path d="M19 28v-8a2.5 2.5 0 015 0v8" />
        <path d="M24 28v-7a2.5 2.5 0 015 0v9" />
        <path d="M29 30v-5a2.5 2.5 0 015 0v9c0 6-4 10-10 10h-3c-4 0-6-2-8-6l-3-6a2.2 2.2 0 014-2l2 3" />
      </svg>
    ),
  },
  {
    id: 3,
    nombre: 'Espuma de Alta Resiliencia',
    descripcion: 'Espumas de alta resiliencia que mantienen su forma y comodidad después de años de uso diario, sin perder soporte.',
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
    nombre: 'Madera Certificada FSC',
    descripcion: 'Estructuras en madera certificada FSC, con trazabilidad responsable y la resistencia que respalda una garantía estructural de 10 años.',
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
