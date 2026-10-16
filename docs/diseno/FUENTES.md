# Procedencia de recursos, versión 2
- Recorrido: videos aportados por la usuaria en 3. Claude, apertura de cámara fija y travelling corto. Recorte, transcodificación y extracción de fotogramas con FFmpeg. No se generó nuevo movimiento. Fotogramas a 24 fps, ancho 1104 px, WebP calidad 83.
- Wordmarks: assets/wordmark-claro.webp y assets/wordmark-rosa.webp de 3. Claude/sitio-publicado.
- Servicios, valores y estructura de datos/calendario/seña: 3. Claude/sitio-publicado/index.html.
- Marco rosa: asset original generado con Imagegen en esta conversación, tomando las referencias de marcos aportadas como inspiración. Fondo y centro transparentes. Original exec-a0f704fa-2d74-48cf-80eb-03a9e795bb3a.png; copia fuente assets/marco-rosa.png y versión de uso assets/marco-rosa.webp (FFmpeg WebP calidad 92). Prompt exacto en assets/marco-rosa.prompt.txt.
- Referencias de marco: 2. Banco de imágenes/Referencias marcos/cb216c77d501ed42a0918bce026a8db8.jpg y descarga.png. No se incorporan las imágenes de Pinterest a la web ni se copia su personaje.
- Manrope variable: Google Fonts, https://github.com/google/fonts/tree/main/ofl/manrope . Licencia incluida en assets/Manrope-OFL.txt.
- GSAP / ScrollTrigger 3.13.0: distribuciones npm obtenidas mediante jsDelivr. Cabeceras de licencia preservadas. https://gsap.com/docs/v3/Plugins/ScrollTrigger/ .
- Referencia de movimiento: grabación de aengel.io aportada por la usuaria. No se copian código ni recursos de ese sitio.

- Referencia de identidad de Chari: imagen adjunta por la usuaria el 16/10/2026, copiada en assets/referencias/chari-referencia.png. No es un personaje nuevo generado en esta entrega.

- Lora variable y licencia OFL: repositorio oficial google/fonts, ofl/lora; archivos locales assets/Lora.ttf y Lora-OFL.txt. Motivos de hojas y separador de títulos: SVG de interfaz trazados en CSS.

- Videos de presentación del salón aportados por la usuaria: variantes sin sufijo (interior) y (1) (exterior), 4s cada uno. Se extraen 96 fotogramas WebP por video. Las máscaras de portal se implementan en código; no se generan escenas nuevas.

- Capas de Chari cuerpo/alas v2: derivadas mediante imagegen de assets/chari-vuelo.png, conservando identidad y pose. Originales PNG transparentes y copias WebP para web.
