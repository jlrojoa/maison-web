// src/admin/cotizaciones/movil/VisorPdf.jsx
//
// Vista previa del PDF dentro de la app (pantalla completa). Cada página se dibuja con pdf.js,
// así se ve igual en el iPhone, se desliza hacia abajo y se puede acercar con los dedos.
import { useEffect, useRef, useState } from 'react'

export default function VisorPdf({ blob, titulo, acciones, onCerrar }) {
  const cont = useRef(null)
  const [estado, setEstado] = useState({ cargando: true, error: null, paginas: 0 })

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        // Se carga solo al ver un PDF: no pesa en el resto de la app. Versión "legacy" para iPhones con iOS antiguo.
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
        if (cancelado || !cont.current) return
        cont.current.innerHTML = ''
        const ancho = cont.current.clientWidth || 390
        const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2))
        for (let n = 1; n <= doc.numPages; n++) {
          const pagina = await doc.getPage(n)
          const base = pagina.getViewport({ scale: 1 })
          const vp = pagina.getViewport({ scale: (ancho / base.width) * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height)
          canvas.style.cssText = 'width:100%;height:auto;display:block;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18);margin:0 0 12px'
          await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
          if (cancelado) return
          cont.current.appendChild(canvas)
        }
        setEstado({ cargando: false, error: null, paginas: doc.numPages })
      } catch (e) { if (!cancelado) setEstado({ cargando: false, error: e.message || 'No se pudo mostrar el PDF', paginas: 0 }) }
    })()
    return () => { cancelado = true }
  }, [blob])

  return (
    <div className="mv-visor" role="dialog" aria-label="Vista previa del PDF">
      <header>
        <button type="button" onClick={onCerrar} aria-label="Cerrar">✕</button>
        <b>{titulo}</b>
        <span>{estado.paginas ? `${estado.paginas} pág.` : ''}</span>
      </header>
      <div className="mv-visor-cuerpo">
        {estado.cargando && <div className="mv-cargando">Preparando la vista previa…</div>}
        {estado.error && <div className="mv-aviso-in">No se pudo mostrar aquí ({estado.error}). Puedes enviarlo igual.</div>}
        <div ref={cont} />
      </div>
      <footer>{acciones}</footer>
    </div>
  )
}
