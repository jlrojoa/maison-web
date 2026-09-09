import { useEffect, useRef, useState } from 'react'

const SLIDES = [
  { src: '/images/hero.png', alt: 'Maison hero' },
  { src: '/images/hero-2.png', alt: 'Sala con olivo y sillones Maison' },
]

const INTERVALO_MS = 6000

export default function Hero() {
  const [actual, setActual] = useState(0)
  const timerRef = useRef(null)

  const irA = (i) => setActual((i + SLIDES.length) % SLIDES.length)
  const siguiente = () => irA(actual + 1)
  const anterior = () => irA(actual - 1)

  useEffect(() => {
    timerRef.current = setInterval(siguiente, INTERVALO_MS)
    return () => clearInterval(timerRef.current)
  }, [actual])

  return (
    <section className="hero">
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          className="hero-img"
          src={s.src}
          alt={s.alt}
          style={{
            opacity: i === actual ? 1 : 0,
            transition: 'opacity 900ms ease',
            zIndex: i === actual ? 1 : 0,
          }}
        />
      ))}
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

      {SLIDES.length > 1 && (
        <>
          <button type="button" className="hero-arrow hero-arrow-l" onClick={anterior} aria-label="Anterior">‹</button>
          <button type="button" className="hero-arrow hero-arrow-r" onClick={siguiente} aria-label="Siguiente">›</button>
          <div className="hero-dots">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                className={`hero-dot ${i === actual ? 'hero-dot-activo' : ''}`}
                onClick={() => irA(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
