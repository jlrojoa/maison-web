// src/pages/Legal.jsx
//
// Páginas de Aviso de privacidad y Términos y condiciones. El texto vive en
// src/content/legal.js.
import { useEffect } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import { PRIVACIDAD, TERMINOS, ACTUALIZADO } from '../content/legal'

export default function Legal({ tipo }) {
  const doc = tipo === 'terminos' ? TERMINOS : PRIVACIDAD
  useEffect(() => {
    const anterior = document.title
    document.title = `${doc.titulo} — Brendell`
    return () => { document.title = anterior }
  }, [doc.titulo])

  return (
    <div>
      <Nav solid />
      <main style={{ background: 'var(--cream)', padding: '140px 24px 96px' }}>
        <article style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'var(--sans)', color: 'var(--ink)', lineHeight: 1.7 }}>
          <h1 style={{ fontFamily: 'var(--serif, inherit)', fontWeight: 300, fontSize: 38, marginBottom: 8 }}>{doc.titulo}</h1>
          <p style={{ fontSize: 12, opacity: .6, marginBottom: 32 }}>Última actualización: {ACTUALIZADO}</p>
          <p style={{ fontSize: 15, marginBottom: 28 }}>{doc.intro}</p>
          {doc.secciones.map(([titulo, texto]) => (
            <section key={titulo} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{titulo}</h2>
              <p style={{ fontSize: 15, margin: 0 }}>{texto}</p>
            </section>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  )
}
