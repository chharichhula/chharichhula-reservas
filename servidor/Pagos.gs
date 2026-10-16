/* ---------- pagos: Mercado Pago Checkout Pro y transferencia confirmada por Chhari ---------- */

var MP_API = "https://api.mercadopago.com";

function urlWebApp_() { return propiedad_("WEBAPP_URL") || ScriptApp.getService().getUrl(); }

function claveWebhook_() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty("MP_WEBHOOK_KEY");
  if (!k) { k = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""); p.setProperty("MP_WEBHOOK_KEY", k); }
  return k;
}

function mpLlamar_(metodo, ruta, cuerpo, idem) {
  var tok = propiedad_("MP_ACCESS_TOKEN");
  if (!tok) return { code: 0, json: null, sinCredenciales: true };
  var h = { Authorization: "Bearer " + tok };
  if (idem) h["X-Idempotency-Key"] = idem;
  var o = { method: metodo, headers: h, muteHttpExceptions: true, contentType: "application/json" };
  if (cuerpo) o.payload = JSON.stringify(cuerpo);
  var resp = UrlFetchApp.fetch(MP_API + ruta, o), txt = resp.getContentText(), j = null;
  try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
  return { code: resp.getResponseCode(), json: j };
}

function avisarChhari_(asunto, cuerpo) {
  try {
    var yo = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({ to: yo, subject: "[Chhari · reservas] " + asunto, body: cuerpo, name: "Chhari Chhula · sistema" });
  } catch (e) { /* sin cuota de mails: queda en Eventos */ }
}

/* ---------- checkout ---------- */

/** Crea (o reutiliza) la preferencia de pago de una reserva pendiente. La clienta nunca ve secretos. */
function crearCheckout_(r, token) {
  if (!propiedad_("MP_ACCESS_TOKEN")) return err_("mp_no_configurado", "El pago con Mercado Pago todavía no está disponible. Podés pagar por transferencia.");
  if (r.pago === PAGO.ACR) return err_("ya_pagada", "La seña ya figura acreditada.");
  var ahora = ahora_();
  if (r.preferencia && r.init_point && msDe_(r.vence) > ahora + 60000) return ok_({ checkout: { url: r.init_point, preferencia: r.preferencia, reutilizado: true } });
  var vence = new Date(ahora + CFG.HOLD_MP_MIN * 60000).toISOString();
  var pref = {
    items: [{ id: r.servicio_id, title: "Seña · " + r.servicio, description: "Seña del turno " + diaCorto_(r.fecha) + " " + horaCorta_(r.hora), quantity: 1, currency_id: CFG.MONEDA, unit_price: Number(r.por_pagar) }],
    payer: { name: r.nombre, surname: r.apellido, email: r.mail },
    external_reference: r.id,
    notification_url: urlWebApp_() + "?action=mp_webhook&k=" + claveWebhook_(),
    back_urls: { success: CFG.SITIO + "?retorno=exito", pending: CFG.SITIO + "?retorno=pendiente", failure: CFG.SITIO + "?retorno=error" },
    auto_return: "approved",
    expires: true, expiration_date_from: new Date(ahora).toISOString(), expiration_date_to: vence,
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 1 },
    statement_descriptor: "CHHARI CHHULA",
    metadata: { reserva_id: r.id }
  };
  var resp = mpLlamar_("post", "/checkout/preferences", pref, "pref-" + r.id + "-" + ahora);
  if (resp.code < 200 || resp.code >= 300 || !resp.json || !resp.json.init_point) {
    evento_(r.id, "error_preferencia", { code: resp.code });
    return err_("mp_error", "No pudimos abrir Mercado Pago ahora. Probá de nuevo o pagá por transferencia.");
  }
  conLock_(function () {
    var fresca = reservaPorId_(r.id);
    actualizar_("Reservas", fresca, { preferencia: resp.json.id, init_point: resp.json.init_point, vence: vence, medio: MEDIO.MP });
  });
  evento_(r.id, "preferencia_creada", { preferencia: resp.json.id });
  return ok_({ checkout: { url: resp.json.init_point, preferencia: resp.json.id } });
}

/* ---------- notificaciones y conciliación ---------- */

function mapaEstadoMp_(s) {
  if (s === "approved") return "Acreditado";
  if (s === "pending" || s === "in_process" || s === "authorized") return "Pendiente";
  if (s === "rejected" || s === "cancelled") return "Rechazado";
  if (s === "refunded" || s === "charged_back") return "Devuelto";
  return "En revisión";
}

/** Punto de entrada del webhook. Solo toma el ID del pago; los datos se consultan a la API de Mercado Pago. */
function mpWebhook_(e) {
  var k = (e.parameter && e.parameter.k) || "";
  if (!igualesSeguro_(k, claveWebhook_())) return { ok: false, error: "no_autorizado" };
  var body = {};
  try { body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (x) { body = {}; }
  var tipo = (e.parameter && (e.parameter.type || e.parameter.topic)) || body.type || body.topic || "";
  var pid = (e.parameter && (e.parameter["data.id"] || e.parameter.id)) || (body.data && body.data.id) || "";
  if (tipo !== "payment" || !pid) return { ok: true, ignorado: true };
  var resp = mpLlamar_("get", "/v1/payments/" + encodeURIComponent(pid));
  if (resp.sinCredenciales) return { ok: false, error: "mp_no_configurado" };
  if (resp.code !== 200 || !resp.json) { evento_("", "webhook_sin_pago", { pago: pid, code: resp.code }); return { ok: true, pendiente: true }; }
  return { ok: true, resultado: aplicarPagoMp_(resp.json) };
}

/** Busca en Mercado Pago los pagos de una reserva (por external_reference) y los aplica. */
function conciliarReserva_(id) {
  var resp = mpLlamar_("get", "/v1/payments/search?sort=date_created&criteria=desc&limit=10&external_reference=" + encodeURIComponent(id));
  if (resp.code !== 200 || !resp.json || !resp.json.results) return 0;
  resp.json.results.forEach(function (p) { aplicarPagoMp_(p); });
  return resp.json.results.length;
}

function aplicarPagoMp_(p) {
  var info = conLock_(function () { return aplicarPagoMpLock_(p); });
  if (info && info.mails) info.mails.forEach(function (m) { try { m(); } catch (e) { /* sin cuota */ } });
  return info ? info.resultado : "nada";
}

function aplicarPagoMpLock_(p) {
  var pid = String(p.id), ref = String(p.external_reference || "");
  var r = reservaPorId_(ref);
  if (!r) { evento_("", "pago_sin_reserva", { pago: pid, ref: ref }, "pago_sin_reserva_" + pid); return { resultado: "sin_reserva", mails: [] }; }
  var ahora = ahora_(), estadoMp = String(p.status), nuevoEstado = mapaEstadoMp_(estadoMp);
  var mails = [], nota = "";

  // validaciones del pago real (no se confía en nada que venga del navegador)
  var modo = propiedad_("MP_MODO") || "prueba", collector = propiedad_("MP_COLLECTOR_ID");
  if (p.live_mode !== undefined && (modo === "produccion") !== (p.live_mode === true)) nota = "ambiente distinto al configurado";
  else if (String(p.currency_id) !== CFG.MONEDA) nota = "moneda distinta";
  else if (Math.abs(Number(p.transaction_amount) - Number(r.por_pagar)) > 0.009) nota = "importe distinto al calculado (" + p.transaction_amount + " vs " + r.por_pagar + ")";
  else if (collector && String(p.collector_id) !== collector) nota = "cuenta receptora distinta";
  if (nota) {
    var ex0 = leer_("Pagos").filter(function (x) { return x.proveedor === "mercadopago" && x.pago_id === pid; })[0];
    if (!ex0) agregar_("Pagos", { proveedor: "mercadopago", pago_id: pid, reserva_id: r.id, monto: p.transaction_amount, moneda: p.currency_id, estado_mp: estadoMp, estado: "Inválido", receptor: p.collector_id || "", modo: p.live_mode === true ? "produccion" : "prueba", creado: new Date(ahora).toISOString(), actualizado: new Date(ahora).toISOString(), nota: nota });
    evento_(r.id, "pago_invalido", { pago: pid, nota: nota }, "pago_invalido_" + pid);
    return { resultado: "invalido", mails: [function () { avisarChhari_("Pago inválido en " + r.id, "El pago " + pid + " no coincide con la reserva: " + nota + "."); }] };
  }

  var fila = leer_("Pagos").filter(function (x) { return x.proveedor === "mercadopago" && x.pago_id === pid; })[0];
  if (fila && fila.estado_mp === estadoMp && fila.estado !== "Duplicado") return { resultado: "sin_cambios", mails: [] };   // idempotencia: reintento de webhook

  if (nuevoEstado === "Acreditado") {
    var otro = leer_("Pagos").filter(function (x) { return x.reserva_id === r.id && x.pago_id !== pid && x.estado === "Acreditado"; })[0];
    if (otro || (r.pago === PAGO.ACR && r.medio !== MEDIO.MP && !fila)) {
      // segundo pago aprobado para la misma reserva: se registra, NO se confirma otra vez ni se genera otro crédito
      var dup = { proveedor: "mercadopago", pago_id: pid, reserva_id: r.id, monto: p.transaction_amount, moneda: p.currency_id, estado_mp: estadoMp, estado: "Duplicado",
        receptor: p.collector_id || "", modo: p.live_mode === true ? "produccion" : "prueba", actualizado: new Date(ahora).toISOString(), nota: "Duplicado: la seña ya estaba acreditada. Devolver manualmente desde Mercado Pago." };
      if (fila) actualizar_("Pagos", fila, dup); else agregar_("Pagos", Object.assign({ creado: new Date(ahora).toISOString() }, dup));
      evento_(r.id, "pago_duplicado", { pago: pid }, "pago_dup_" + pid);
      return { resultado: "duplicado", mails: [function () { avisarChhari_("Pago duplicado en " + r.id, "La reserva " + r.id + " recibió un segundo pago aprobado (" + pid + "). Revisalo y, si corresponde, devolvelo desde Mercado Pago. No se hizo ningún reembolso automático."); }] };
    }
  }

  var datosPago = { proveedor: "mercadopago", pago_id: pid, reserva_id: r.id, monto: p.transaction_amount, moneda: p.currency_id, estado_mp: estadoMp, estado: nuevoEstado,
    receptor: p.collector_id || "", modo: p.live_mode === true ? "produccion" : "prueba", actualizado: new Date(ahora).toISOString(), nota: p.status_detail || "" };
  if (fila) actualizar_("Pagos", fila, datosPago); else agregar_("Pagos", Object.assign({ creado: new Date(ahora).toISOString() }, datosPago));
  evento_(r.id, "pago_" + estadoMp, { pago: pid, estado: nuevoEstado }, "pago_" + pid + "_" + estadoMp);

  var resultado = nuevoEstado;
  if (nuevoEstado === "Acreditado") {
    if (r.estado === ESTADO.PEND) {
      r = actualizar_("Reservas", r, { estado: ESTADO.CONF, pago: PAGO.ACR, medio: MEDIO.MP, vence: "" });
      mails.push(function () { enviarMail_(r, "confirmada", tokenDe_(r.id)); });
      resultado = "confirmada";
    } else if (r.estado === ESTADO.VENC) {
      var ocup = intervalosOcupados_(leer_("Reservas"), ahora, r.id);
      if (haySolape_(msDe_(r.inicio), msDe_(r.fin), ocup) || msDe_(r.inicio) < ahora) {
        r = actualizar_("Reservas", r, { estado: ESTADO.REV, pago: PAGO.ACR, medio: MEDIO.MP, nota: (r.nota ? r.nota + " | " : "") + "Pago tardío: el horario ya fue tomado. Resolver con la clienta." });
        mails.push(function () { avisarChhari_("Revisión: pago tardío en " + r.id, "Se acreditó la seña de " + r.nombre + " " + r.apellido + " (" + r.whatsapp + ") después de vencer el bloqueo y el horario ya no está libre. Ofrecele otra fecha o devolvé el pago. No se hizo ningún reembolso automático."); });
        resultado = "revision";
      } else {
        r = actualizar_("Reservas", r, { estado: ESTADO.CONF, pago: PAGO.ACR, medio: MEDIO.MP, vence: "" });
        mails.push(function () { enviarMail_(r, "confirmada", tokenDe_(r.id)); });
        resultado = "confirmada";
      }
    } else if (r.estado === ESTADO.CANC) {
      // pagó después de cancelar: no se recupera el horario, la seña queda a favor
      r = actualizar_("Reservas", r, { pago: PAGO.ACR, nota: (r.nota ? r.nota + " | " : "") + "Pago acreditado después de cancelar: queda a favor" });
      emitirCredito_(r, pid, Number(p.transaction_amount), "pago posterior a la cancelación");
      mails.push(function () { avisarChhari_("Pago posterior a cancelación en " + r.id, "La clienta " + r.nombre + " pagó después de cancelar. La seña quedó como crédito disponible."); });
      resultado = "credito";
    } else {
      r = actualizar_("Reservas", r, { pago: PAGO.ACR });
    }
  } else if (nuevoEstado === "Pendiente") {
    if (r.pago !== PAGO.ACR) r = actualizar_("Reservas", r, { pago: PAGO.PEND, vence: r.estado === ESTADO.PEND ? new Date(ahora + CFG.HOLD_MP_EN_PROCESO_H * 3600000).toISOString() : r.vence });
  } else if (nuevoEstado === "Rechazado") {
    if (r.pago !== PAGO.ACR) r = actualizar_("Reservas", r, { pago: PAGO.RECH });
  } else if (nuevoEstado === "Devuelto") {
    r = actualizar_("Reservas", r, { estado: r.estado === ESTADO.CANC ? r.estado : ESTADO.REV, nota: (r.nota ? r.nota + " | " : "") + "Pago " + pid + " devuelto/contracargo" });
    mails.push(function () { avisarChhari_("Pago devuelto en " + r.id, "El pago " + pid + " figura como " + estadoMp + ". Revisá la reserva."); });
  }
  return { resultado: resultado, mails: mails };
}

/* ---------- transferencia confirmada por Chhari (acción administrativa) ---------- */

function confirmarTransferencia_(id) {
  var res = conLock_(function () {
    var r = reservaPorId_(id);
    if (!r) return { error: err_("no_existe", "No existe la reserva " + id + ".") };
    if (r.estado === ESTADO.CONF && r.pago === PAGO.ACR) return { r: r, yaConfirmada: true };
    if (r.estado === ESTADO.CANC) return { error: err_("cancelada", "La reserva está cancelada.") };
    if (r.estado === ESTADO.VENC || r.estado === ESTADO.PEND || r.estado === ESTADO.REV) {
      var ocup = intervalosOcupados_(leer_("Reservas"), ahora_(), r.id);
      if (haySolape_(msDe_(r.inicio), msDe_(r.fin), ocup)) return { error: err_("ocupado", "El horario ya fue tomado por otra reserva. Reprogramá o resolvelo con la clienta.") };
    } else return { error: err_("estado", "Estado no válido para confirmar: " + r.estado) };
    var pid = "T-" + r.id;
    var yaPago = leer_("Pagos").filter(function (x) { return x.pago_id === pid; })[0];
    var datos = { proveedor: "transferencia", pago_id: pid, reserva_id: r.id, monto: r.por_pagar, moneda: CFG.MONEDA, estado_mp: "", estado: "Acreditado", receptor: CFG.SALON.alias, modo: "", actualizado: new Date(ahora_()).toISOString(), nota: "Verificada por Chhari" };
    if (yaPago) actualizar_("Pagos", yaPago, datos); else agregar_("Pagos", Object.assign({ creado: new Date(ahora_()).toISOString() }, datos));
    r = actualizar_("Reservas", r, { estado: ESTADO.CONF, pago: PAGO.ACR, medio: MEDIO.TRANSF, vence: "" });
    evento_(r.id, "transferencia_confirmada", {});
    return { r: r };
  });
  if (res.error) return res.error;
  if (!res.yaConfirmada) enviarMail_(res.r, "confirmada", tokenDe_(res.r.id));
  return ok_({ reserva: vistaReserva_(res.r), yaConfirmada: !!res.yaConfirmada });
}
