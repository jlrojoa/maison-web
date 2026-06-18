import { useScrollNav } from '../hooks/useScrollNav'

export default function Nav() {
  const scrolled = useScrollNav(60)
  return (
    <nav id="nav" className={scrolled ? 's' : ''}>
      <a href="#" className="logo" onClick={e => e.preventDefault()}>
        Maison<b>.</b>
      </a>
      <ul className="nav-ul">
        <li><a href="#cl">Colecciones</a></li>
        <li><a href="#mt">Materiales</a></li>
        <li><a href="#ph">Filosofía</a></li>
        <li><a href="#ct">Contacto</a></li>
      </ul>
      <a href="#ct" className="nbtn">Solicitar Presupuesto</a>
    </nav>
  )
}
