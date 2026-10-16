# Revisión de la versión 2 · 16/10/2026
- Inspección visual en escritorio 1440×900 y móvil 390×844: inicio, apertura, avance corto, datos, calendario y resumen.
- Verificados en navegador: flujo con datos ficticios locales, selección de servicio/día/hora, resumen con importes coincidentes con la configuración local, alternancia de modos y foco de selección.
- Comprobado en móvil: ancho de contenido sin desbordamiento horizontal y fuente Manrope aplicada.
- Los dos JS pasan node --check. No se añadieron archivos de pruebas.
- Revisión de código independiente detectó pérdida de foco al reconstruir días/horarios. Se corrigió conservando los botones y actualizando aria-pressed. El revisor dio SHIP respecto de esa corrección, mediante lectura de código; no una aprobación visual independiente.
- El detector mecánico señaló iluminación del marco y escena a sangre: se conservaron por el brief explícito. Se corrigieron el color base y el borde/sombra del selector de modos. Los fondos de estados ocultos son deliberados.
- Pendientes: aprobación artística de la usuaria, optimización de secuencia para producción, dispositivos reales, agenda real. No se publicó ningún cambio.

## Versión 3: distorsión del marco
Tras la captura de la usuaria, se eliminó border-image stretch. Se separaron las cuatro esquinas, los dos remates y las dos enredaderas en vistas SVG del mismo recurso original. Las flores mantienen escala uniforme; los tramos laterales se repiten al cambiar la altura. Los prompts de producción de salón y Chari se guardaron por separado; no se generó un personaje nuevo ni un video nuevo en esta entrega.

## Corrección de terminaciones y llegada
Se quitaron los recortes de esquinas y tiras laterales. Se usa un adorno independiente entero, con extremos naturales. La llegada del hada continúa desde el jardín hasta la parte superior del formulario y transfiere a la pose de guía.

## Refinamiento visual de títulos y botones
Títulos principales Lora 600 y remate botánico, controles rosa baya con oro champán, motivos SVG completos. Inspección visual en la vista previa abierta; no se añadieron pruebas automatizadas ni se conectó agenda real.
