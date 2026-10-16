# Qué se probó y cómo

`node servidor/pruebas/run.js` ejecuta el **código real** del servidor (`servidor/*.gs`, y también el archivo único `dist/Codigo-completo.gs` con `BUNDLE=1`) sobre una réplica en memoria de la planilla, el bloqueo, las propiedades y el correo de Google, más un Mercado Pago simulado. **No hay cobros ni cuentas reales.** 41 pruebas:

- Disponibilidad compartida: sin datos personales, solapes por duración, cierre del salón, anticipación, meses, bloqueos de Chhari.
- Reservas simultáneas: una sola gana; una segunda ejecución no puede escribir mientras la primera tiene el bloqueo; reintentos idempotentes; límites y validaciones.
- Transferencia: reserva pendiente, confirmación administrada, vencimiento y horario tomado.
- Mercado Pago: preferencia creada en el servidor (monto, referencia, URLs, sin secretos al navegador); el retorno no confirma; webhook aprobado/duplicado/pendiente/rechazado; importe, moneda, cuenta y ambiente verificados; pago duplicado; pago tardío (confirma o queda en Revisión); sin credenciales no se ofrece; conciliación.
- Cancelación: enlace privado, confirmación explícita, 72 h inclusive (71:59 no), 72–24 h y <24 h, crédito único e idempotente, sin crédito sin seña acreditada, pago posterior a cancelar.
- Seña a favor: uso una sola vez, mismo WhatsApp, reversión, crédito parcial, reprogramación por Chhari.

Lo que **no** se pudo probar sin las cuentas de Chhari: ejecución dentro de Google (permisos, cuotas, tiempos), el checkout real y los avisos reales de Mercado Pago, y la entrega real de mails. Eso se prueba con el paso a paso de SERVIDOR.md en modo prueba.
