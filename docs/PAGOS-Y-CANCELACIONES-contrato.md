# Pagos, cancelación y seña a favor
Estado: interfaz de revisión preparada. Integración de cobro y agenda pendiente de implementar/desplegar. No se crearon pagos, reservas, devoluciones ni mensajes reales.
Decisiones de María del 16/10/2026: cobra la cuenta de Mercado Pago de Chhari; se conserva el sitio https://chharichhula.github.io/chharichhula-reservas/; cancelación web hasta 72 h antes; seña a favor para reprogramar; sin devolución monetaria. Política adjunta: aviso de 24 h para reprogramación directa según disponibilidad; si no asiste pierde la seña.

## Interfaz preparada en esta entrega
En el paso Tu seña se puede elegir Transferencia o Mercado Pago. Transferencia explica el flujo actual; Mercado Pago describe la salida y el regreso y queda deshabilitado hasta conectar el servidor. Las políticas se muestran antes de continuar. No se muestra un turno confirmado ni se habilita un cobro ficticio.
La página explica la gestión por enlace privado, pendiente de conectar a una reserva real.

## Hallazgos del código actual
El index de sitio-publicado guarda información en localStorage y envía un POST no-cors a Apps Script. Code.gs agrega la fila Pendiente de seña y envía mail. No hay API de consulta compartida de disponibilidad, bloqueo atómico de horario, verificación de Mercado Pago ni token privado de gestión. Las etiquetas de mensaje Enviado/En espera/Cancelado no son suficientes para separar agenda, pago y crédito.
La copia publicada no se modificó. No llamar al endpoint actual con datos de prueba.

## Flujo de transferencia
1. Servidor valida servicio, duración, horario, anticipación y disponibilidad de toda la agenda.
2. Crea identificador único y reserva pendiente. Guarda medio transferencia y monto de seña calculado en servidor.
3. Web muestra alias/titular existentes y ofrece enviar comprobante a Chhari por WhatsApp por acción expresa de la clienta.
4. Chhari verifica la acreditación y confirma mediante acción administrativa autenticada.
5. Solo entonces se comunica Confirmada. No tratar el envío del comprobante como acreditación automática.
Preservar fotos de uñas/diseño y recordatorios del flujo actual.

## Flujo Mercado Pago Checkout Pro (Preferences API)
1. Crear la reserva temporal de forma atómica, evitando superposiciones de intervalos, no solo horas iguales.
2. Crear preferencia desde el servidor con monto de seña ARS y servicio provenientes del catálogo del servidor, external_reference igual al ID de reserva y notification_url pública HTTPS.
3. La API devuelve init_point. La web redirige allí. Mercado Pago gestiona checkout/autenticación; no se puede prometer que todos los dispositivos abran necesariamente su app nativa.
4. Configurar back_urls success/pending/failure al sitio publicado y auto_return approved. No usar localhost como URL de retorno.
5. Volver al sitio inicia consulta del estado guardado en servidor. No confiar en status=approved ni payment_id de la URL para confirmar.
6. Webhook: validar x-signature/HMAC y x-request-id; consultar GET /v1/payments/{id} con Access Token privado. Verificar external_reference, importe, ARS, cuenta receptora, ambiente de prueba/producción y pago no reutilizado.
7. Registrar pago y confirmar reserva de forma idempotente. Reintentos no crean turnos, correos o créditos duplicados.
8. Si el webhook todavía no llegó: mostrar Estamos verificando tu pago y consultar con espera progresiva. Si el pago está pendiente/rechazado, mostrar ese estado sin anunciar confirmación.
9. Confirmar en servidor aunque la clienta cierre Mercado Pago y no regrese. Un proceso periódico reconcilia pagos si falta la notificación.

## Agenda temporal y pagos tardíos
Definir vigencia de bloqueo y checkout antes de activar cobros. El vencimiento libera solo solicitudes impagas y conserva registro. Un pago tardío no puede ocupar un turno ya tomado; dejar estado Revisión de Chhari y resolver la alternativa antes de anunciar confirmación. No iniciar un reembolso automático.
Gestionar el vencimiento y la expiración de preferencias coherentemente; no confundir reprogramación, cancelación de turno y devolución de pago.

## Cancelar desde enlace privado
- Generar un token aleatorio criptográficamente seguro; guardar solo hash. Identificador secuencial, teléfono o email no son autorización.
- Enlace en email y en página de confirmación; si se comparte por WhatsApp, usar el flujo autorizado. No enviar mensajes desde esta tarea.
- GET solo consulta; nunca cancelar por abrir el enlace ni por el escáner de enlaces de correo.
- Confirmación explícita Cancelar mi cita, mostrando fecha, hora y política. POST protegido por token.
- Calcular la anticipación en servidor: se permite si inicio - ahora >= 72 horas. Fechas internas UTC y presentación America/Argentina/Cordoba.
- Dentro de una operación bloqueada: cambiar a Cancelada, liberar el intervalo, emitir una sola seña a favor si había acreditación y dejar comprobante del movimiento.
- La seña a favor no es una devolución en Mercado Pago. El pago original queda acreditado; el crédito es un registro interno.
- Una reserva pendiente sin seña acreditada no genera crédito.
- La cancelación repetida devuelve el mismo resultado sin crédito adicional.
- Si faltan menos de 72 h: no permitir cancelar online. Mostrar Contactar a Chhari para gestionar la cita; entre 72 y 24 h permite reprogramación manual según la política adjunta.
- No suponer que el plazo de 72 h convierte en cancelación automática una solicitud tardía.
- El regreso del pago o un webhook duplicado no debe reactivar una reserva cancelada. Si el pago se acredita después de cancelar, tratar de forma conciliada sin perder el dinero ni recuperar el horario liberado.

## Usar la seña a favor
Asociar crédito al ID de reserva/pago de origen y a identidad verificable de la clienta. No basta escribir un WhatsApp para reclamar saldo.
Estados del crédito: Disponible, Aplicado, Revertido. Aplicar una sola vez y de forma atómica al nuevo turno. Si cubre toda la seña, no volver a cobrar. Si hay diferencia, cobrar solo lo restante calculado por el servidor.
Importe, reutilización y vínculo al pago no son editables desde el navegador. Vencimiento del crédito no definido: no inventar caducidad.
Reprogramación manual debe registrar consumo/restitución de crédito y trazabilidad de ambas citas.

## Contrato propuesto del servidor
POST /api/reservations: valida datos y disponibilidad, crea pending y entrega ID/token de gestión.
POST /api/reservations/{id}/checkout: autoriza por token, calcula seña restante y devuelve init_point.
GET /api/reservations/{id}: autoriza por token y devuelve estado mínimo y fecha/hora, sin exponer otras clientas.
GET /api/availability: disponibilidad compartida por servicio/fecha, sin nombres ni teléfonos.
POST /api/reservations/{id}/cancel: verifica token y 72 h, libera horario y registra crédito atómicamente.
POST /api/payments/mercadopago/webhook: valida firma, consulta API y concilia.
Acciones administrativas: confirmar transferencia y reprogramar, siempre autenticadas.
No hay rutas reales implementadas en la demo; este es el contrato para ampliar Apps Script y añadir el receptor de webhooks.

## Datos a persistir
Reservas: id, inicio/fin UTC, servicio, clienta, estado, medio, seña requerida, vencimiento del bloqueo, cancelada_en, hash del token.
Pagos: ID proveedor único, reserva, importe/moneda, receptor, estado acreditado y fecha de actualización.
Créditos: origen único, titular, monto disponible/aplicado, nueva reserva, historial.
Eventos: identificador idempotente y transiciones. Separar estado de agenda del estado de pago y de envío de mensajes.
La planilla puede conservarse como herramienta operativa, pero la disponibilidad debe ser fuente compartida del servidor y sus escrituras deben usar exclusión mutua.

## Infraestructura y activación pendientes
- Credenciales TEST de la cuenta de Chhari, Access Token privado y secreto de webhook; configurarlos como secretos del servidor, nunca dentro del HTML, JS público o chat.
- Servidor HTTPS público con acceso a encabezados para verificar la firma del webhook. La actual publicación Apps Script requiere ampliación y un receptor que permita validar esos encabezados.
- Mantener GitHub Pages como frontend y el sistema de planilla actual como parte de la operación.
- Desplegar los endpoints y adaptar el mail para incluir el enlace privado.
- Revisar el recorrido en ambiente de prueba antes de habilitar cobros de producción. No se ejecutaron pagos de prueba en esta entrega.
- No se habilitan devoluciones automáticas ni se cambian políticas del sitio publicado sin revisar la integración completa.

## Documentación oficial consultada
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/configure-back-urls
https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/payment-notifications
https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/overview
