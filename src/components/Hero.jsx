export default function Hero() {
  return (
    <section className="hero">
      <img className="hero-img" src="/images/hero.png" alt="Maison hero" />
      <div className="hero-ph" />
      <div className="hero-txt">
        <p className="ey">Nueva Colección 2025</p>
        <h1 className="ht">El arte<br />de <em>vivir</em><br />bien.</h1>
        <p className="hs">Piezas construidas a mano con materiales de primera calidad. Diseño modular que se adapta a tu espacio, fabricado para durar generaciones.</p>
        <div className="ha">
          <a href="#cl" className="bd">Ver Colecciones</a>
          <a href="#kt" className="bg">Solicitar Kit</a>
        </div>
      </div>
    </section>
  )
}
