# Chari guía del recorrido

Implementación local del 16/10/2026.

- chari.js: vuelo ligado al progreso del recorrido, cuatro segmentos suaves, escala uniforme y rotación moderada.
- Profundidad: Chari acompaña al avanzar y retroceder; desaparece suavemente al terminar la escena.
- Liviano y movimiento reducido: sin vuelo; personaje fijo junto a reservas.
- Reservas: pose de bienvenida fuera de campos y botones.
- Finalizar vista previa: pose de celebración. NO representa una reserva confirmada; al integrar agenda real, activar celebración solo tras confirmación exitosa.
- No hay aleteo articulado: la imagen completa flota sin deformar alas o cuerpo.
- Recortes derivados mediante imagegen de los tres recursos proporcionados por la usuaria: vuelo 6fc2df47, guía acc27e05, celebración ea3e1cc4. Los PNG conservan transparencia, WebP son versiones ligeras para web.
- Los videos nuevos del salón no fueron modificados ni incorporados en esta tarea.

## Llegada continua al formulario
La capa de vuelo es fija y está fuera de la escena recortada. Después del recorrido sigue el desplazamiento hasta el personaje de destino dentro de .magic-frame. Posición y escala coinciden antes de pasar a la pose de bienvenida. Recorrido reversible al volver hacia el bosque. En Liviano se mantiene solo el personaje posado.

## Aleteo y vuelo por etapas · 16/10/2026
Se reemplaza la imagen estática durante el vuelo por cuerpo y dos grupos de alas detrás, con bisagras 3D CSS y ciclo de 0,78 segundos independiente del scroll. Las capas se derivaron con imagegen del personaje aprobado; recursos chari-cuerpo-v2 y chari-alas-v2, PNG originales y WebP de uso. La imagen anterior queda como respaldo hasta cargar ambas capas.
El scroll selecciona uno de siete destinos; cada desplazamiento dura 1,4 segundos y recorre un arco con aceleración/frenado, conservando la posición actual al interrumpirse. Chari espera al visitante entre tramos. Se elimina el vaivén vertical en bucle de la figura completa.
La llegada al formulario usa seguimiento amortiguado y pasa a la pose de bienvenida solo al coincidir la posición. Sin vuelo ni aleteo en Liviano o movimiento reducido; se pausa fuera de la pestaña visible. No es un modelo 3D articulado completo: se animan capas 2D con perspectiva.
Se retiraron todos los frame-light y chari-spark del HTML para que ningún destello geométrico tape la cara o el cuerpo.

## Aterrizaje definitivo
El aterrizaje se ejecuta una sola vez cuando el destino entra en pantalla. La capa de vuelo pasa a .chari-dock y termina un movimiento local de 0,8 s; al finalizar se oculta y queda solo la pose estática del formulario. Estados landing/landed bloquean todo seguimiento posterior del scroll. Solo se reinicia al volver claramente al bosque. Se elimina followLanding y la persecución de coordenadas del viewport que provocaba descensos sobre el título.
