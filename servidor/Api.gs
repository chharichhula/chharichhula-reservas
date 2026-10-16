/* ---------- API pública (aplicación web de Apps Script) ----------
 * El navegador llama con GET (consultas) y POST text/plain (acciones). Nada de acá devuelve secretos ni datos de otras clientas.
 *   GET  ?action=catalogo
 *   GET  ?action=availability&servicio=soft&desde=2026-10-20&hasta=2026-10-31
 *   POST {action:"reserve", ...}    crea la reserva y bloquea el horario de forma atómica
 *   POST {action:"checkout", id, token, medio}  elige/cambia medio y abre Mercado Pago
 *   POST {action:"status", id, token}           estado mínimo de una reserva
 *   POST {action:"cancel", id, token, confirmar:true}
 *   POST ?action=mp_webhook&k=…     notificación de Mercado Pago (se verifica contra la API)
 */

function catalogo_() {
  return ok_({
    sena: CFG.SENA, anticipacionH: CFG.ANTICIPACION_H, mesesAdelante: CFG.MESES_ADELANTE, cancelacionH: CFG.CANCELACION_H,
    mercadoPago: !!propiedad_("MP_ACCESS_TOKEN"),
    servicios: SERVICIOS.map(function (s) { return { id: s.id, nombre: s.n, valor: s.v, tiempo: s.t, min: s.min, detalle: s.x || "" }; }),
    transferencia: { alias: CFG.SALON.alias, titular: CFG.SALON.titular }
  });
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {}, a = p.action || "ping";
    if (a === "availability") return json_(disponibilidad_(p.servicio, p.desde, p.hasta));
    if (a === "catalogo") return json_(catalogo_());
    return json_(ok_({ servicio: "Chhari Chhula · reservas" }));
  } catch (err) {
    return json_(errorInterno_(err));
  }
}

function errorInterno_(err) {
  try { console.error(String(err && err.stack ? err.stack : err)); } catch (e) { /* nada */ }
  return err_("interno", "Hubo un problema de nuestro lado. Probá de nuevo en un momento.");
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {}, body = {};
    try { body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (x) { body = {}; }
    var a = p.action || body.action || "";
    if (a === "mp_webhook") return json_(mpWebhook_(e));
    if (a === "reserve") return json_(reservar_(body));
    if (a === "status") return json_(estadoReserva_(body.id, body.token));
    if (a === "checkout") return json_(elegirMedio_(body.id, body.token, body.medio));
    if (a === "cancel") return json_(cancelar_(body.id, body.token, body.confirmar === true));
    return json_(err_("accion", "Acción desconocida."));
  } catch (err) {
    return json_(errorInterno_(err));
  }
}
