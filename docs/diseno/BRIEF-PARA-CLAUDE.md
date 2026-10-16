# Brief para Claude · versión 2, 16/10/2026

## Dirección elegida por la usuaria
Bosque encantado al atardecer con una puerta rosa y corona floral. Al abrir, se ve el jardín privado rosado, cálido y luminoso, con salón invernadero. Fantasía sofisticada, inclusiva y acogedora. Rosas, marfil, cuarzos y detalles de metal rosa/dorado. La reserva debe ser directa y legible. El personaje animado de Chhari se trabajará después.

## Correcciones solicitadas tras la primera prueba
Conservar Profundidad/Liviano; eliminar el salto visual del cruce de puerta usando como referencia los videos generados; sustituir la tipografía excesivamente grande y delgada; recuperar paneles y pasos de la app actual con marcos originales mágicos y rosas basados en las referencias aportadas.

## Movimiento implementado
- Profundidad: fotogramas de apertura original desde 0,45 s hasta el final, unidos con 0–1,8 s del avance original. Se detiene antes del tramo con deformación más marcada. No hay sustitución por la imagen panorámica diferente del jardín.
- La apertura y el avance no se regeneran. Persisten las pequeñas diferencias presentes en los materiales originales. La continuidad exacta entre clips requiere revisión artística humana al integrar la versión definitiva de CapCut.
- 129 WebP, 24 fps de muestreo, 1104 px de ancho. Canvas 2D se ajusta con una única escala uniforme tipo cover.
- GSAP y ScrollTrigger vinculan el progreso al scroll nativo, con scrub de 0,3 s. No se secuestra la rueda.
- Carga cercana al fotograma solicitado, tres solicitudes simultáneas; caché de imágenes vecinas, sin precarga completa.
- Liviano: imágenes inicial, puerta abierta y final del mismo material, unidas por opacidad. Con movimiento reducido, estados estáticos.
- El fondo de reserva conserva el fotograma final en vez de introducir otra imagen. Reserva directa disponible desde el encabezado.

Esta solución es una secuencia de imagen controlada por scroll. No presentarla como una reconstrucción parallax 3D. Una futura versión por capas necesita fondos y recortes alineados nuevos; las imágenes actuales no bastan para inventar zonas ocultas sin empalmes.

## Reserva y diseño
- Wordmark real, no marca tipeada a mano.
- Manrope 400–750, títulos funcionales 23–26 px y hero 29–45 px; sin grandes titulares Bodoni en cursiva.
- Una sola superficie enmarcada, con tres vistas navegables: datos, calendario/horarios y resumen/seña.
- Marco con centro transparente y esquinas florales; interior rosa claro. Los datos son HTML nativo seleccionable. No convertir formulario en imagen.
- Ornamento apartado de controles, destellos solo en bordes, animación reducida al elegir Liviano.
- Preservar servicios y precios del código actual al conectar la app. Esta prueba conserva cinco servicios de manicura y seña de $10.000 del archivo local.
- La navegación de pasos puede explorarse libremente para revisar diseño. Para la aplicación real, mantener validación, reglas comerciales, consentimiento, disponibilidad, condiciones de seña y confirmación del flujo existente.
- Los datos de prueba permanecen en memoria; no hay endpoint, localStorage, pagos ni WhatsApp.

## Producción pendiente
Conectar agenda existente solo después de aprobar diseño; verificar vigencia de valores y reglas con Chari. Reducir peso de la secuencia (33,5 MB total) según pruebas de dispositivo y red. Evaluar continuidad final con los clips recortados por la usuaria. Revisar carga, teclado, lector de pantalla, zoom y contraste en las composiciones finales. Mantener acceso directo a reserva y movimiento reducido.

La app publicada no forma parte de los archivos editados en esta entrega.

## Corrección del marco y próximos recursos
El marco ahora usa piezas SVG con proporción original y enredaderas laterales repetidas; no volver a estirar la imagen con border-image. Chari debe ser una capa independiente del marco. Los prompts completos y el orden de producción están en PROMPTS-SALON-Y-CHARI.md. La imagen maestra del personaje y el video cercano del salón todavía están pendientes de generar.

## Chari integrada
Ver CHARI-INTEGRACION.md. Cargar chari.js antes de motion.js; evento chari:journey comparte progreso y modo. Conservar capas independientes y relación de aspecto; no animar ancho/alto ni estirar alas. La celebración actual corresponde a finalizar la demo: en producción conectarla a confirmación real.

## Terminaciones completas del marco
Las piezas SVG recortadas se reemplazaron por cuatro adornos florales completos con transparencia, assets/adorno-floral-completo.webp. Las líneas del marco son CSS y se adaptan al alto sin estirar las rosas. Chari ahora aterriza dentro de la caja, en .chari-dock.

## Títulos y botones del jardín
Lora variable local para títulos importantes, peso 600 sin cursiva; Manrope para lectura y operación. Botones principales rosa baya con filete dorado y hojas vectoriales; secundario Volver al jardín con contorno dorado. Se preservan textos y comportamiento. Incluir assets/Lora.ttf y Lora-OFL.txt.

## Corrección de dirección de botones y voz
Prioridad sobre propuestas anteriores: botones rosas intensos o translúcidos, limpios, sin motivos de plantas ni bordes dorados. Textos del recorrido hablan de bosque y sendero. Entrar al bosque / Seguí el sendero / Volver al bosque. Tono mágico adulto; retirar diminutivos.

## Pagos y gestión de turnos
Ver PAGOS-Y-CANCELACIONES.md. Decisiones: transferencia actual + Checkout Pro de cuenta de Chhari; regreso al sitio GitHub Pages; cancelación web hasta 72 h antes, libera horario y conserva seña a favor. Reprogramación directa con Chhari con aviso de 24 h según política. Sin devolución, ausencia pierde seña. Interfaz de medios preparada pero cobro y cancelación reales no conectados: implementar servidor, disponibilidad compartida, webhook verificado y enlaces privados antes de habilitar.

## Recorrido ampliado con los dos videos del salón
Ver RECORRIDO-AMPLIADO.md. Nuevo motion.js integra puerta, exterior e interior con máscaras arqueadas. .scene-media es fija y se mueve al body al inicializar; NO volver a poner fondo opaco en .stage o .reservation, ni reactivar .reservation-backdrop. Incluir las carpetas salon-exterior y salon-interior completas y sus posters. Mantener Chari y movimiento reducido.

## Corrección del vuelo de Chari
Versión vigente: cuerpo/alas separados, aleteo CSS independiente del scroll y viajes temporizados entre puntos del sendero. Ver CHARI-INTEGRACION.md. No restaurar los destellos de clase frame-light ni chari-spark: cruzaban el rostro. Cargar las nuevas capas WebP junto con la imagen anterior de respaldo.
