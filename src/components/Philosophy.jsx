export default function Philosophy() {
  return (
    <section className="phil" id="ph">
      <div className="ph-img">
        <img src="/images/philosophy.png" alt="Nuestra filosofía" />
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
