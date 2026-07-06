import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()
  return (
    <footer>
      <div className="fg">
        <div>
          <p className="fl">Maison<b>.</b></p>
          <p className="ft">Alta tapicería mexicana con alma italiana. Diseño modular para espacios que merecen lo mejor.</p>
        </div>
        <div>
          <p className="fct">Colecciones</p>
          <ul className="fll">
            <li><a href="#" onClick={e => e.preventDefault()}>Sofás Modulares</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>Camas Tapizadas</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>Butacas</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>Sillones</a></li>
          </ul>
        </div>
        <div>
          <p className="fct">Empresa</p>
          <ul className="fll">
            <li><a href="#" onClick={e => e.preventDefault()}>Nosotros</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>Showroom</a></li>
            <li><a href="/distribuidores" onClick={e => { e.preventDefault(); navigate('/distribuidores') }}>Distribuidores</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>Prensa</a></li>
          </ul>
        </div>
        <div>
          <p className="fct">Contacto</p>
          <ul className="fll">
            <li><a href="#" onClick={e => e.preventDefault()}>Puebla, México</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>hola@maison.mx</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>+52 222 000 0000</a></li>
            <li><a href="#" onClick={e => e.preventDefault()}>@maison.mx</a></li>
          </ul>
        </div>
      </div>
      <div className="fb">
        <p className="fc">© 2025 Maison Alta Tapicería. Todos los derechos reservados.</p>
        <p className="fc">Diseñado y fabricado en México.</p>
      </div>
    </footer>
  )
}
