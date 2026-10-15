// src/content/legal.js
//
// Textos del Aviso de privacidad y de los Términos y condiciones de brendell.mx.
// Datos de la empresa tomados de cotizacionPdf/empresa.js (mismos del PDF).
// BORRADOR: redactado con los datos conocidos del sitio y de la base de datos;
// debe revisarlo un abogado antes de darlo por definitivo. Un solo lugar para
// editar el texto.
import { EMPRESA } from '../pages/configurador/cotizacionPdf/empresa'

export const ACTUALIZADO = '15 de octubre de 2026'

export const PRIVACIDAD = {
  titulo: 'Aviso de privacidad',
  intro: `${EMPRESA.razonSocial} (en adelante, “Brendell”), con RFC ${EMPRESA.rfc} y domicilio en ${EMPRESA.direccion}, es responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
  secciones: [
    ['Datos personales que recabamos',
      'A través del formulario de contacto: nombre, correo electrónico, teléfono (opcional) y el mensaje que nos escribes. A los distribuidores que usan el portal: correo electrónico y contraseña de acceso, y los datos de sus clientes finales que capturan en sus cotizaciones (nombre, correo y teléfono). No recabamos datos personales sensibles.'],
    ['Para qué usamos tus datos',
      'Responder tus consultas, darte seguimiento comercial sobre los productos de tu interés y, en el caso de los distribuidores, darles acceso al portal y generar sus cotizaciones. No usamos tus datos para finalidades distintas a estas.'],
    ['Con quién los compartimos',
      'No vendemos ni transferimos tus datos a terceros. Para operar el sitio nos apoyamos en proveedores que los tratan por nuestra cuenta, sin usarlos para fines propios: alojamiento del sitio (Vercel), base de datos y autenticación (Supabase) y correo electrónico (Google y Resend).'],
    ['Almacenamiento en tu navegador',
      'El portal de distribuidores guarda en tu navegador tu sesión y tu cotización en curso para que no la pierdas al recargar. No usamos cookies publicitarias ni herramientas de rastreo.'],
    ['Tus derechos (ARCO)',
      `Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso, así como revocar tu consentimiento, escribiendo a ${EMPRESA.email} con tu nombre, el derecho que deseas ejercer y una copia de una identificación. Te responderemos en un máximo de 20 días hábiles.`],
    ['Cambios a este aviso',
      'Si este aviso cambia, publicaremos la versión actualizada en esta misma página, con su fecha.'],
    ['Contacto', `${EMPRESA.email} · ${EMPRESA.telefono}`],
  ],
}

export const TERMINOS = {
  titulo: 'Términos y condiciones',
  intro: `Al usar brendell.mx y el portal de distribuidores aceptas estos términos. El sitio es operado por ${EMPRESA.razonSocial} (“Brendell”), RFC ${EMPRESA.rfc}.`,
  secciones: [
    ['Uso del sitio',
      'El sitio presenta los productos y materiales de Brendell con fines informativos. Las imágenes y los colores en pantalla son de referencia y pueden diferir del producto y de las muestras físicas.'],
    ['Portal de distribuidores',
      'El acceso es solo por invitación. Tu cuenta es personal: eres responsable de conservar tu contraseña y de lo que se haga con ella. Los precios y el contenido del portal son confidenciales y no deben compartirse con terceros ajenos a tu operación con Brendell.'],
    ['Cotizaciones',
      'Las cotizaciones son informativas y tienen la vigencia indicada en el documento (15 días naturales). No constituyen comprobante de pago ni de compra. El pago, la entrega, la instalación y la garantía se confirman al formalizar el pedido.'],
    ['Propiedad intelectual',
      'Las marcas, el diseño, las fotografías y los textos del sitio son de Brendell o se usan con autorización. No pueden copiarse ni reutilizarse sin permiso por escrito.'],
    ['Responsabilidad',
      'Procuramos que la información del sitio sea correcta y esté actualizada, pero puede contener errores o cambiar sin previo aviso. Brendell no responde por daños derivados del uso indebido del sitio ni por interrupciones ajenas a su control.'],
    ['Privacidad', 'El tratamiento de tus datos personales se rige por el Aviso de privacidad publicado en este sitio.'],
    ['Ley aplicable', 'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.'],
    ['Contacto', `${EMPRESA.email} · ${EMPRESA.telefono}`],
  ],
}
