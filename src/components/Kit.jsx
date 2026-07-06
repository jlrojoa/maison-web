export default function Kit() {
  return (
    <section className="kit" id="kt">
      <div className="kc">
        <p className="sl rv">Experiencia Maison</p>
        <h2 className="kt rv d1">Toca antes<br />de <em>decidir</em>.</h2>
        <p className="sb rv d2" style={{ marginBottom: 26 }}>Enviamos a tu hogar una caja curada con muestras reales de nuestras telas, foam de muestra y un mini cojín en el tejido de tu elección.</p>
        <ul className="kl rv d2">
          <li>6 muestras de tela premium seleccionadas a mano</li>
          <li>Cubo de espuma HR para sentir la densidad</li>
          <li>Mini cojín en tu tejido preferido</li>
          <li>Catálogo impreso con colores y configuraciones</li>
          <li>Contacto directo con tu asesor de diseño</li>
        </ul>
        <a href="#" className="bd rv d3" style={{ display: 'inline-block', width: 'fit-content' }} onClick={e => e.preventDefault()}>Solicitar Kit — $350 MXN</a>
      </div>
      <div className="ki">
        <img className="ki-photo" src="/images/kit.png" alt="Kit de muestras Maison" />
      </div>
    </section>
  )
}
