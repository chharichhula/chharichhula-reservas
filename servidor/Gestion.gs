/* ---------- cancelación, seña a favor y créditos ---------- */

function usable_(c) { return c.estado === CRED.DISP || c.estado === CRED.REVERT; }

/** Crédito disponible de una persona (identificada por su WhatsApp ya verificado con un token). */
function creditoUsable_(wa) {
  var cs = leer_("Creditos");
  for (var i = 0; i < cs.length; i++) if (cs[i].whatsapp_wa === wa && usable_(cs[i])) return cs[i];
  return null;
}

/** Un crédito por pago de origen: si ya existe, se devuelve el mismo (nunca se duplica). */
function emitirCredito_(r, pagoId, monto, nota) {
  var cs = leer_("Creditos");
  for (var i = 0; i < cs.length; i++) if (cs[i].origen_pago === pagoId) return { credito: cs[i], nuevo: false };
  var c = agregar_("Creditos", {
    id: "C-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase(), origen_reserva: r.id, origen_pago: pagoId,
    whatsapp_wa: r.whatsapp_wa, monto: monto, estado: CRED.DISP, aplicado_en: "",
    creado: new Date(ahora_()).toISOString(), actualizado: new Date(ahora_()).toISOString(), nota: nota || ""
  });
  evento_(r.id, "credito_emitido", { credito: c.id, pago: pagoId, monto: monto });
  return { credito: c, nuevo: true };
}

function aplicarCredito_(c, reservaId) {
  actualizar_("Creditos", c, { estado: CRED.APLIC, aplicado_en: reservaId, actualizado: new Date(ahora_()).toISOString() });
  evento_(reservaId, "credito_aplicado", { credito: c.id });
}

/** Si una reserva que usó un crédito se vence o cancela, el crédito vuelve a estar disponible (una sola vez en uso a la vez). */
function revertirCreditoDe_(reservaId) {
  var cs = leer_("Creditos");
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].estado === CRED.APLIC && cs[i].aplicado_en === reservaId) {
      actualizar_("Creditos", cs[i], { estado: CRED.REVERT, aplicado_en: "", actualizado: new Date(ahora_()).toISOString() });
      evento_(reservaId, "credito_revertido", { credito: cs[i].id });
    }
  }
}

function pagosAcreditados_(reservaId) {
  return leer_("Pagos").filter(function (p) { return p.reserva_id === reservaId && p.estado === "Acreditado"; });
}

function marcarMensaje_(r, valor) {
  hoja_("Reservas").getRange(r._fila, HOJAS_.Reservas.indexOf("mensaje") + 1).setValue(valor);
  r.mensaje = valor;
}

/**
 * Libera el lugar y emite la seña a favor (solo si hay pago ACREDITADO). Idempotente.
 * Se llama dentro del lock. No valida plazo: eso lo hace cancelar_ (clienta) o el admin.
 */
function aplicarCancelacion_(r, motivo) {
  var creditos = [];
  r = actualizar_("Reservas", r, { estado: ESTADO.CANC, cancelada_en: new Date(ahora_()).toISOString(), vence: "",
    nota: (r.nota ? r.nota + " | " : "") + motivo });
  marcarMensaje_(r, "Cancelado");
  revertirCreditoDe_(r.id);
  pagosAcreditados_(r.id).forEach(function (p) {
    var e = emitirCredito_(r, p.pago_id, Number(p.monto), "Cancelación " + motivo);
    creditos.push({ id: e.credito.id, monto: Number(e.credito.monto), nuevo: e.nuevo });
  });
  evento_(r.id, "cancelada", { motivo: motivo, creditos: creditos });
  return { r: r, creditos: creditos };
}

/** POST cancel — requiere token privado y confirmación explícita; plazo: inicio - ahora >= 72 h. */
function cancelar_(id, token, confirmar) {
  if (confirmar !== true) return err_("confirmar", "Para cancelar hace falta confirmar explícitamente.");
  var res = conLock_(function () {
    var r = autorizar_(id, token);
    if (!r) return { error: err_("no_autorizado", "No encontramos esa reserva o el enlace no es válido.") };
    if (r.estado === ESTADO.CANC) {
      var ya = leer_("Creditos").filter(function (c) { return c.origen_reserva === r.id; });
      return { r: r, yaCancelada: true, creditos: ya.map(function (c) { return { id: c.id, monto: Number(c.monto), nuevo: false }; }) };
    }
    if (r.estado !== ESTADO.CONF && r.estado !== ESTADO.PEND && r.estado !== ESTADO.VENC)
      return { error: err_("estado", "Esta reserva no se puede cancelar desde la web. Escribile a Chhari.", { contacto: "https://wa.me/" + CFG.WHATSAPP }) };
    var antes = msDe_(r.inicio) - ahora_();
    if (r.estado === ESTADO.CONF && antes < CFG.CANCELACION_H * 3600000) {
      var tramo = antes >= CFG.AVISO_H * 3600000 ? "reprogramar_con_chhari" : "contactar_chhari";
      return { error: err_("fuera_de_plazo", tramo === "reprogramar_con_chhari"
        ? "Ya pasó el plazo para cancelar desde la web (72 hs antes). Escribile a Chhari para reprogramar según disponibilidad."
        : "Faltan menos de 24 hs: contactá a Chhari para gestionar tu cita.", { politica: tramo, contacto: "https://wa.me/" + CFG.WHATSAPP }) };
    }
    var out = aplicarCancelacion_(r, "cancelada por la clienta desde el enlace privado");
    return { r: out.r, creditos: out.creditos, yaCancelada: false };
  });
  if (res.error) return res.error;
  if (!res.yaCancelada) enviarMail_(res.r, "cancelada", token);
  var cr = res.creditos.length ? { id: res.creditos[0].id, monto: res.creditos.reduce(function (a, c) { return a + c.monto; }, 0) } : null;
  return ok_({ reserva: vistaReserva_(res.r), liberado: true, yaCancelada: res.yaCancelada, credito: cr });
}
