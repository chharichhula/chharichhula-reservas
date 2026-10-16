# Cómo gestionar, confirmar y cancelar turnos

## Menú de la planilla
En la planilla aparece el menú **Chhari · Reservas** (se activa al ejecutar `instalar`). Elegí una fila de la hoja **Reservas** y usá:

| Acción | Qué hace |
|---|---|
| ✅ Confirmar seña recibida | Para **transferencias**: después de ver la acreditación en tu cuenta, confirma el turno, registra el pago y le manda el mail de confirmación. Si el bloqueo venció y otra persona tomó el horario, avisa y no confirma. |
| ❌ Cancelar turno · seña a favor | Libera el horario. Si la seña está **acreditada** queda como crédito de la clienta; si no, no hay crédito. Avisa por mail. |
| 🔁 Reprogramar turno | Te pide fecha y hora nuevas, verifica que existan y estén libres, mueve el turno y conserva el pago. Queda anotado en la fila. |
| 🚫 No asistió | Marca el turno y la seña se pierde. |
| ✉️ Reenviar mail con enlace | Vuelve a mandar el mail con el enlace privado. |
| 🔄 Conciliar pagos | Revisa en Mercado Pago los pagos pendientes (también se hace solo cada 5 minutos). |

## Estados
- **Pendiente**: lugar guardado esperando la seña (12 h si es transferencia, 30 min en el checkout de Mercado Pago; si Mercado Pago dice “en proceso” se espera hasta 24 h).
- **Confirmada**: seña acreditada.
- **Vencida**: terminó el bloqueo sin seña; el horario volvió a la agenda.
- **Revisión**: llegó un pago pero el horario ya no estaba libre (o hubo una devolución/contracargo). **Decidís vos**: reprogramar con la clienta o devolver el dinero desde Mercado Pago. El sistema nunca devuelve dinero solo.
- **Cancelada** / **No asistió**.

El **pago** se muestra aparte: Sin pago · Pendiente · Acreditado · Rechazado. La columna *mensaje* conserva Enviado / En espera / Cancelado como antes.

## Lo que ve la clienta
- Al reservar recibe un mail con un **enlace privado** (no se puede adivinar; el sistema solo guarda su huella).
- **Abrir el enlace no cancela nada.** Para cancelar tiene que apretar “Cancelar mi cita” y confirmar.
- **Hasta 72 horas antes (inclusive)** puede cancelar sola: se libera el horario y su seña acreditada queda a favor para reprogramar. **No es devolución de dinero.**
- **Entre 72 y 24 horas antes** la web no deja cancelar: le indica escribirte por WhatsApp para reprogramar según tu agenda (la seña se conserva si avisa con 24 h y reprograma).
- **Menos de 24 horas**: contactarte. Si no asiste, pierde la seña.
- Si tiene seña a favor, entra a su enlace y elige “Reprogramar con mi seña a favor”: la seña cubre la nueva cita y se usa **una sola vez**. Debe usar el mismo WhatsApp. El crédito **no tiene vencimiento** porque no se definió uno.

## Cerrar días u horarios
En la hoja **Bloqueos** agregá una fila: fecha `2026-12-24`, desde y hasta vacíos = día completo; o `desde 09:00`, `hasta 12:00` para un tramo. Se aplica de inmediato a la agenda de la web.
