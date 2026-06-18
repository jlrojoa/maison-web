export default function Footer() {
  return (
    <footer>
      <div className="fg">
        <div>
          <div className="fl">Maison<b>.</b></div>
          <p className="ft">Alta tapicería artesanal. Diseñamos y fabricamos piezas únicas para espacios singulares desde 2006.</p>
        </div>
        <div>
          <div className="fct">Colecciones</div>
          <ul className="fll">
            <li><a href="#cl">Sofás</a></li>
            <li><a href="#cl">Camas</a></li>
            <li><a href="#cl">Cabeceros</a></li>
            <li><a href="#cl">Sillas</a></li>
          </ul>
        </div>
        <div>
          <div className="fct">Servicios</div>
          <ul className="fll">
            <li><a href="#ph">Diseño</a></li>
            <li><a href="#mt">Materiales</a></li>
            <li><a href="#ct">Presupuesto</a></li>
            <li><a href="#ct">Visita domicilio</a></li>
          </ul>
        </div>
        <div>
          <div className="fct">Contacto</div>
          <ul className="fll">
            <li><a href="mailto:hola@maison.es">hola@maison.es</a></li>
            <li><a href="tel:+34910000000">+34 910 000 000</a></li>
            <li><a href="#ct">Madrid, España</a></li>
          </ul>
        </div>
      </div>
      <div className="fb">
        <span className="fc">© 2026 Maison. Todos los derechos reservados.</span>
        <a href="/admin" className="fc" style={{ textDecoration: 'none', opacity: .6 }}>Admin</a>
      </div>
    </footer>
  )
}
