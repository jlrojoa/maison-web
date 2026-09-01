// src/pages/configurador/cotizacionPdf/pdfFonts.js
//
// react-pdf renderiza con su propio motor (fontkit), no con el CSS del
// navegador — el <link> de Google Fonts en index.html no le sirve de nada.
// @fontsource/poppins (ya evaluado) solo trae woff/woff2, que fontkit no
// soporta de forma confiable; se usan las URLs .ttf reales de Google Fonts
// (mismas que googleapis.com/css sirve a user-agents viejos) vía
// Font.register con `src` como URL — react-pdf las descarga en el momento
// de generar el PDF, mismo patrón recomendado por la librería para fuentes
// de Google Fonts que no se auto-hospedan.
import { Font } from '@react-pdf/renderer'

let registrada = false

export function registrarFuentesPdf() {
  if (registrada) return
  registrada = true
  Font.register({
    family: 'Poppins',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfedw.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9Z1xlEA.ttf', fontWeight: 500 },
      { src: 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1xlEA.ttf', fontWeight: 600 },
      { src: 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1xlEA.ttf', fontWeight: 700 },
    ],
  })
}
