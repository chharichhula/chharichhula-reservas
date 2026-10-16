/* ---------- acciones de Chhari (menú de la planilla) y tareas programadas ----------
 * Solo las puede ejecutar quien tenga acceso de edición a la planilla: la autenticación la hace Google.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu("Chhari · Reservas")
      .addItem("✅ Confirmar seña recibida (fila elegida)", "menuConfirmar")
      .addItem("❌ Cancelar turno · seña a favor", "menuCancelar")
      .addItem("🔁 Reprogramar turno (fila elegida)", "menuReprogramar")
      .addItem("🚫 Marcar: no asistió (pierde la seña)", "menuNoAsistio")
      .addItem("✉️ Reenviar mail con enlace", "menuReenviar")
      .addSeparator()
      .addItem("🔄 Conciliar pagos de Mercado Pago ahora", "menuConciliar")
      .addItem("⚙️ Preparar servidor (hojas y tareas)", "instalar")
      .addToUi();
  } catch (e) { /* se abre fuera de la planilla */ }
}

function idDeFilaElegida_() {
  var h = SpreadsheetApp.getActiveSheet();
  if (h.getName() !== "Reservas") throw new Error('Elegí una fila de la hoja "Reservas".');
  var fila = h.getActiveRange().getRow();
  if (fila < 2) throw new Error("Elegí una fila de reserva, no el encabezado.");
  var id = String(h.getRange(fila, 1).getValue());
  if (!id) throw new Error("La fila elegida no tiene reserva.");
  return id;
}
function avisar_(t) { SpreadsheetApp.getUi().alert(t); }
function resumir_(r) { return r.ok ? "Listo." : (r.mensaje || r.error); }

function menuConfirmar() {
  try { var id = idDeFilaElegida_(); var r = confirmarTransferencia_(id); avisar_(r.ok ? (r.yaConfirmada ? "Ya estaba confirmada." : "Confirmada. La clienta recibió el mail de confirmación.") : r.mensaje); } catch (e) { avisar_(String(e.message || e)); }
}
function menuCancelar() {
  try {
    var id = idDeFilaElegida_(), ui = SpreadsheetApp.getUi();
    if (ui.alert("Cancelar " + id, "Se libera el horario. Si la seña está acreditada, queda como crédito a favor de la clienta (no se devuelve dinero). ¿Continuar?", ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    var res = adminCancelar_(id);
    avisar_(res.ok ? "Cancelada." + (res.credito ? " Crédito generado: " + pesos_(res.credito) : " Sin seña acreditada: no se generó crédito.") : res.mensaje);
  } catch (e) { avisar_(String(e.message || e)); }
}
function menuReprogramar() {
  try {
    var id = idDeFilaElegida_(), ui = SpreadsheetApp.getUi();
    var f = ui.prompt("Nueva fecha (AAAA-MM-DD)", "", ui.ButtonSet.OK_CANCEL); if (f.getSelectedButton() !== ui.Button.OK) return;
    var h = ui.prompt("Nueva hora (HH:MM)", "", ui.ButtonSet.OK_CANCEL); if (h.getSelectedButton() !== ui.Button.OK) return;
    avisar_(resumir_(reprogramarAdmin_(id, f.getResponseText().trim(), h.getResponseText().trim())));
  } catch (e) { avisar_(String(e.message || e)); }
}
function menuNoAsistio() {
  try {
    var id = idDeFilaElegida_();
    var r = conLock_(function () {
      var x = reservaPorId_(id); if (!x) return err_("no_existe", "No existe.");
      actualizar_("Reservas", x, { estado: ESTADO.NOASIST, nota: (x.nota ? x.nota + " | " : "") + "No asistió: pierde la seña" });
      evento_(id, "no_asistio", {}); return ok_({});
    });
    avisar_(resumir_(r));
  } catch (e) { avisar_(String(e.message || e)); }
}
function menuReenviar() {
  try {
    var id = idDeFilaElegida_(), r = reservaPorId_(id);
    var tipo = r.estado === ESTADO.CONF ? "confirmada" : (r.estado === ESTADO.CANC ? "cancelada" : "recibida");
    avisar_(enviarMail_(r, tipo, tokenDe_(r.id)) ? "Mail enviado a " + r.mail : "No se pudo enviar el mail.");
  } catch (e) { avisar_(String(e.message || e)); }
}
function menuConciliar() { avisar_("Pagos revisados: " + conciliarPendientes_()); }

/** Cancelación hecha por Chhari (sin límite de horas). El crédito solo existe si la seña está acreditada. */
function adminCancelar_(id) {
  var res = conLock_(function () {
    var r = reservaPorId_(id);
    if (!r) return { error: err_("no_existe", "No existe la reserva.") };
    if (r.estado === ESTADO.CANC) return { error: err_("ya", "Ya estaba cancelada.") };
    return aplicarCancelacion_(r, "cancelada por Chhari");
  });
  if (res.error) return res.error;
  enviarMail_(res.r, "cancelada", tokenDe_(res.r.id));
  return ok_({ credito: res.creditos.reduce(function (a, c) { return a + c.monto; }, 0) });
}

/** Mueve el turno a otro horario válido y libre conservando pago, crédito y trazabilidad. */
function reprogramarAdmin_(id, fecha, hora) {
  return conLock_(function () {
    var r = reservaPorId_(id);
    if (!r) return err_("no_existe", "No existe la reserva.");
    if (r.estado !== ESTADO.CONF && r.estado !== ESTADO.PEND && r.estado !== ESTADO.REV && r.estado !== ESTADO.VENC) return err_("estado", "Estado no válido para reprogramar: " + r.estado);
    var sv = servicioPorId_(r.servicio_id);
    if (!fechaValida_(fecha) || horariosBase_(fecha, sv).indexOf(horaTolerante_(hora)) < 0) return err_("horario", "Ese día u horario no existe en la agenda.");
    hora = horaTolerante_(hora);
    var ini = aMs_(fecha, hora), fin = ini + sv.min * 60000;
    if (haySolape_(ini, fin, intervalosOcupados_(leer_("Reservas"), ahora_(), r.id))) return err_("ocupado", "Ese horario está ocupado.");
    var antes = r.fecha + " " + r.hora;
    r = actualizar_("Reservas", r, { fecha: fecha, hora: hora, inicio: new Date(ini).toISOString(), fin: new Date(fin).toISOString(),
      nota: (r.nota ? r.nota + " | " : "") + "Reprogramada por Chhari desde " + antes });
    r.token_hash && hoja_("Reservas").getRange(r._fila, HOJAS_.Reservas.indexOf("enviar_whatsapp") + 1).setFormula(vinculoWhatsApp_(r));
    evento_(r.id, "reprogramada", { desde: antes, hasta: fecha + " " + hora });
    return ok_({});
  });
}

/* ---------- tareas programadas ---------- */

function conciliarPendientes_() {
  var n = 0, limite = ahora_() - 72 * 3600000;
  leer_("Reservas").forEach(function (r) {
    if (r.medio === MEDIO.MP && r.preferencia && r.pago !== PAGO.ACR && (r.estado === ESTADO.PEND || r.estado === ESTADO.VENC) && msDe_(r.creado) > limite) {
      try { conciliarReserva_(r.id); n++; } catch (e) { evento_(r.id, "error_conciliar", { e: String(e) }); }
    }
  });
  return n;
}

function mantenimientoPeriodico() {
  conLock_(function () { vencerCaducadas_(); });
  if (propiedad_("MP_ACCESS_TOKEN")) conciliarPendientes_();
}

/** Crea las hojas y deja programada la tarea que corre cada 5 minutos. Se puede ejecutar más de una vez. */
function instalar() {
  ["Reservas", "Pagos", "Creditos", "Eventos", "Bloqueos"].forEach(function (n) { hoja_(n); });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "mantenimientoPeriodico") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("mantenimientoPeriodico").timeBased().everyMinutes(5).create();
  try { var h = libro_().getSheetByName("Reservas"); h.getRange(2, 31, 2000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["Enviado", "En espera", "Cancelado"], true).build()); } catch (e) { /* nada */ }
  try { SpreadsheetApp.getUi().alert("Listo: hojas creadas y tarea programada cada 5 minutos."); } catch (e) { /* nada */ }
}

/** Opcional: después de cargar MP_ACCESS_TOKEN, guarda el ID de la cuenta receptora para verificar cada pago. */
function mercadoPagoConfigurar() {
  var r = mpLlamar_("get", "/users/me");
  if (!r.json || !r.json.id) throw new Error("No se pudo leer la cuenta de Mercado Pago. Revisá MP_ACCESS_TOKEN.");
  PropertiesService.getScriptProperties().setProperty("MP_COLLECTOR_ID", String(r.json.id));
  claveWebhook_();
  var msg = "Cuenta de Mercado Pago vinculada: " + (r.json.nickname || r.json.id) + ". URL de notificaciones: " + urlWebApp_() + "?action=mp_webhook&k=(clave guardada)";
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
  return msg;
}
