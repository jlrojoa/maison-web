export default function Hero() {
  return (
    <section className="hero">
      <img className="hero-img" src="/images/hero.png" alt="Maison hero" />
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
