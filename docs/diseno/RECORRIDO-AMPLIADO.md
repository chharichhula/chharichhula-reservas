# Recorrido ampliado · 16/10/2026
## Cambios
La escena fija del bosque pasa a ser el fondo persistente de toda la web. El formulario se desplaza sobre la misma última vista del salón, con una capa translúcida para legibilidad. Se quita la aparición tardía de un fondo independiente y el bloque opaco de separación.
La introducción tiene más espacio de scroll: 800svh en escritorio, 680svh móvil. Movimiento reducido usa un tramo más corto y fotografías sin zoom.
No se modificaron cobros, estados de reservas ni disponibilidad.

## Secuencia
- 0–32%: apertura de la puerta y avance corto existentes, 129 fotogramas.
- 32–49%: transición de portal arqueado, acercamiento uniforme sobre la puerta y revelado del exterior.
- 49–68%: video del exterior del salón, 96 fotogramas a 24 fps.
- 68–83%: transición por el arco de entrada al salón.
- 83–97%: video del interior, 96 fotogramas a 24 fps.
- 97–100%: el interior permanece visible y aparece el acceso a reservar.
- Después del recorrido: interior fijo detrás del formulario y vuelo de Chari hasta su lugar en el marco.

Las transiciones del portal son máscaras y escalado uniforme 2D escritos en canvas, no una reconstrucción 3D ni una toma continua filmada. Cada video conserva sus propias características; no se añadieron fotogramas generativos ni se estiraron ventanas, cuerpo o alas. Revisar con María la continuidad artística de los cambios de plano.

## Recursos nuevos utilizados
Firefly Plano cinematográfico de presentación del salón de belleza de la imagen inicial. La cámara y (1).mp4: exterior, 4s,1920x1080,24fps.
Firefly Plano cinematográfico de presentación del salón de belleza de la imagen inicial. La cámara y.mp4: interior,4s,1920x1080,24fps.
Extracción de fotogramas WebP 1280x720 calidad80 en assets/salon-exterior y assets/salon-interior. Videos originales intactos.
Posters de inicio/final de cada clip para cubrir la espera de carga.

## Rendimiento y modo Liviano
Carga hasta cuatro imágenes a la vez y conserva fotogramas cercanos al objetivo. No se precarga el recorrido completo. Canvas se limita a DPR1.5.
Liviano carga imágenes de puerta, exterior e interior con transiciones simples y no carga las secuencias.
El recorrido es reversible al subir. Botón principal entra al primer tramo; reservar permite llegar directo al formulario.
