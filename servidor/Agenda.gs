/* ---------- agenda compartida: disponibilidad, reservas y bloqueo atómico ---------- */

function msDe_(iso) { return iso ? Date.parse(iso) : 0; }

/** ¿Este registro ocupa lugar en la agenda ahora? */
function ocupaLugar_(r, ahora) {
  if (r.estado === ESTADO.CONF || r.estado === ESTADO.REV) return true;
  if (r.estado === ESTADO.PEND) return msDe_(r.vence) > ahora;
  return false;
}

function horaTolerante_(h) {
  var m = /^\s*(\d{1,2}):(\d{2})/.exec(String(h || ""));
  return m ? pad2_(Number(m[1])) + ":" + m[2] : "";
}
function fechaTolerante_(f) {
  f = String(f || "").trim();
  var a = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(f);
  if (a) return a[1] + "-" + pad2_(Number(a[2])) + "-" + pad2_(Number(a[3]));
  var b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(f);
  return b ? b[3] + "-" + pad2_(Number(b[2])) + "-" + pad2_(Number(b[1])) : "";
}

/** Bloqueos que Chari carga en la hoja "Bloqueos" (día entero si no pone horas). */
function bloqueosIntervalos_() {
  var out = [], filas = leer_("Bloqueos");
  for (var i = 0; i < filas.length; i++) {
    var f = fechaTolerante_(filas[i].fecha);
    if (!f || !fechaValida_(f)) continue;
    var d = horaTolerante_(filas[i].desde), h = horaTolerante_(filas[i].hasta);
    out.push({ ini: aMs_(f, d || "00:00"), fin: aMs_(f, h || "23:59") + (h ? 0 : 60000) });
  }
  return out;
}

function intervalosOcupados_(reservas, ahora, excluirId) {
  var out = bloqueosIntervalos_();
  for (var i = 0; i < reservas.length; i++) {
    var r = reservas[i];
    if (r.id === excluirId || !ocupaLugar_(r, ahora)) continue;
    out.push({ ini: msDe_(r.inicio), fin: msDe_(r.fin) });
  }
  return out;
}

function haySolape_(ini, fin, ocupados) {
  for (var i = 0; i < ocupados.length; i++) if (ini < ocupados[i].fin && fin > ocupados[i].ini) return true;
  return false;
}

/** Horarios de inicio válidos para un día y un servicio (sin mirar solapes). */
function horariosBase_(fecha, servicio) {
  var dow = dowDe_(fecha), base = CFG.HORARIOS[dow] || [], cierre = aMin_(CFG.CIERRE[dow] || "20:00");
  return base.filter(function (h) { return aMin_(h) + servicio.min <= cierre; });
}

function horariosLibres_(fecha, servicio, ocupados, ahora) {
  var minT = ahora + CFG.ANTICIPACION_H * 3600000;
  return horariosBase_(fecha, servicio).filter(function (h) {
    var ini = aMs_(fecha, h), fin = ini + servicio.min * 60000;
    return ini >= minT && !haySolape_(ini, fin, ocupados);
  });
}

/** GET availability: {fechas:{"2026-10-20":["09:00",...]}} sin nombres ni teléfonos. */
function disponibilidad_(servicioId, desde, hasta) {
  var sv = servicioPorId_(servicioId);
  if (!sv) return err_("servicio", "Servicio inexistente.");
  if (!fechaValida_(desde) || !fechaValida_(hasta) || hasta < desde) return err_("fechas", "Rango de fechas inválido.");
  var tope = ultimoDiaReservable_(), hoy = aLocal_(ahora_()).fecha;
  if (desde < hoy) desde = hoy;
  if (hasta > tope) hasta = tope;
  var ahora = ahora_(), ocupados = intervalosOcupados_(leer_("Reservas"), ahora, ""), fechas = {};
  for (var f = desde, n = 0; f <= hasta && n < 100; f = sumarDias_(f, 1), n++) {
    fechas[f] = horariosLibres_(f, sv, ocupados, ahora);
  }
  return ok_({ servicio: sv.id, fechas: fechas, hasta: tope, ahora: new Date(ahora).toISOString() });
}

/* ---------- validación de datos de la clienta ---------- */

function validarDatos_(d) {
  var e = [];
  if (!d || typeof d !== "object") return ["datos"];
  var nom = String(d.nombre || "").trim(), ape = String(d.apellido || "").trim();
  if (nom.length < 2 || nom.length > 40) e.push("nombre");
  if (ape.length < 2 || ape.length > 40) e.push("apellido");
  var dig = String(d.tel || "").replace(/\D/g, "");
  if (dig.length < 10 || dig.length > 13) e.push("tel");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.mail || "").trim()) || String(d.mail).length > 80) e.push("mail");
  var cu = String(d.cumple || "");
  if (!fechaValida_(cu) || cu < "1930-01-01" || cu > aLocal_(ahora_()).fecha) e.push("cumple");
  if (!servicioPorId_(d.servicio)) e.push("servicio");
  return e;
}

/** ¿El inicio pedido es un horario legítimo y futuro con la anticipación mínima? (no mira solapes) */
function inicioValido_(fecha, hora, sv) {
  if (!fechaValida_(fecha) || !/^\d{2}:\d{2}$/.test(String(hora))) return "fecha";
  if (fecha > ultimoDiaReservable_()) return "fecha_lejana";
  if (horariosBase_(fecha, sv).indexOf(hora) < 0) return "horario";
  if (aMs_(fecha, hora) < ahora_() + CFG.ANTICIPACION_H * 3600000) return "anticipacion";
  return "";
}

/* ---------- vencimientos ---------- */

/** Marca como Vencida toda reserva Pendiente cuyo bloqueo terminó y devuelve el crédito aplicado. (Llamar dentro del lock.) */
function vencerCaducadas_() {
  var ahora = ahora_(), rs = leer_("Reservas"), n = 0;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.estado !== ESTADO.PEND || msDe_(r.vence) > ahora) continue;
    actualizar_("Reservas", r, { estado: ESTADO.VENC, nota: (r.nota ? r.nota + " | " : "") + "Bloqueo vencido sin seña acreditada" });
    evento_(r.id, "vencida", { medio: r.medio });
    revertirCreditoDe_(r.id);
    n++;
  }
  return n;
}

/* ---------- crear reserva ---------- */

function textoMensajeConfirmacion_(r) {
  var s = CFG.SALON;
  return [
    "Hola Chulita 🫰🏼 espero que estés teniendo un lindo día!!! ",
    "Me comunico para recordarte tu turno para MANICURA💅🏻💅🏻💅🏻",
    "",
    diaCorto_(r.fecha) + " a las " + horaCorta_(r.hora),
    "",
    "TE ESPERO EN ",
    "",
    "📍" + s.direccion + " ",
    "Barrio: " + s.barrio + " ",
    "",
    "RECORDAR: 👇🏼",
    "",
  ].concat(REGLAS.map(function (x) { return "•" + x; })).concat([
    "",
    "Recibo Efectivo y transferencias. ",
    "Para pagos con Tranferencia: ",
    "ALIAS: " + s.alias + " ",
    "TITULAR: " + s.titular + " ",
    "",
    "LOS PAGOS SE REALIZAN ANTES DE RETIRARSE DEL SALÓN",
    "",
    "POR FAVOR ENVIAR COMPROBANTE. ",
    "",
    "🫂 GRACIAS TE ESPERO 🫰🏼 ",
    "",
    s.instagram
  ]).join("\n");
}

function vinculoWhatsApp_(r) {
  return '=HYPERLINK("https://wa.me/' + r.whatsapp_wa + "?text=" + encodeURIComponent(textoMensajeConfirmacion_(r)) + '";"Enviar por WhatsApp")';
}

/** Vista pública mínima de una reserva (sin hash ni datos de otras personas). */
function vistaReserva_(r) {
  var inicio = msDe_(r.inicio), horas = (inicio - ahora_()) / 3600000;
  var activa = r.estado === ESTADO.CONF || r.estado === ESTADO.PEND;
  var politica = "";
  if (activa) politica = horas >= CFG.CANCELACION_H ? "cancelable" : (horas >= CFG.AVISO_H ? "reprogramar_con_chhari" : "contactar_chhari");
  return {
    id: r.id, estado: r.estado, pago: r.pago, medio: r.medio,
    servicio: r.servicio, valor: r.valor, duracionMin: Number(r.duracion_min),
    fecha: r.fecha, hora: r.hora, inicio: r.inicio,
    sena: Number(r.sena), credito: Number(r.credito || 0), porPagar: Number(r.por_pagar || 0),
    nombre: r.nombre, vence: r.vence || "",
    puedeCancelar: activa && (r.estado === ESTADO.PEND || politica === "cancelable"), politica: activa ? politica : "",
    horasRestantes: Math.floor(horas * 10) / 10
  };
}

function datosTransferencia_(r) {
  return { alias: CFG.SALON.alias, titular: CFG.SALON.titular, monto: Number(r.por_pagar), montoTexto: pesos_(r.por_pagar) };
}

/**
 * POST reserve — valida, reserva el intervalo de forma atómica y devuelve ID + token privado.
 * d: {nombre, apellido, tel, mail, cumple, novedades, servicio, fecha, hora, medio, clave, credito?:{id,token}, web}
 */
function reservar_(d) {
  if (d && d.web) return err_("rechazado", "No pudimos procesar la reserva.");
  var errores = validarDatos_(d);
  if (errores.length) return err_("datos", "Revisá los datos: " + errores.join(", ") + ".", { campos: errores });
  var sv = servicioPorId_(d.servicio);
  var inv = inicioValido_(d.fecha, d.hora, sv);
  if (inv) return err_(inv === "anticipacion" ? "anticipacion" : "horario", "Ese horario ya no está disponible. Elegí otro, por favor.");
  var medio = String(d.medio || "");
  if (medio !== MEDIO.TRANSF && medio !== MEDIO.MP) return err_("medio", "Elegí cómo querés pagar la seña.");
  var clave = String(d.clave || "").slice(0, 64);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(clave)) return err_("clave", "Falta la clave de la reserva. Recargá la página e intentá de nuevo.");

  var res = conLock_(function () {
    vencerCaducadas_();
    var ahora = ahora_(), rs = leer_("Reservas");
    // idempotencia: reintentos de la misma acción devuelven la misma reserva
    for (var i = 0; i < rs.length; i++) {
      if (rs[i].clave === clave) {
        return { existente: true, r: rs[i], token: tokenDe_(rs[i].id) };
      }
    }
    var ini = aMs_(d.fecha, d.hora), fin = ini + sv.min * 60000;
    if (haySolape_(ini, fin, intervalosOcupados_(rs, ahora, ""))) return { error: err_("ocupado", "Ese horario se acaba de ocupar. Elegí otro, por favor.") };
    var wa = waNumber_(d.tel), pendientes = 0;
    for (var j = 0; j < rs.length; j++) if (rs[j].whatsapp_wa === wa && rs[j].estado === ESTADO.PEND && ocupaLugar_(rs[j], ahora)) pendientes++;
    if (pendientes >= CFG.MAX_PENDIENTES_POR_TEL) return { error: err_("limite", "Ya tenés reservas esperando la seña. Completá o esperá a que venzan antes de pedir otra.") };

    // crédito (seña a favor)
    var cubierto = 0, cred = null;
    if (d.credito && d.credito.id && d.credito.token) {
      var origen = reservaPorId_(String(d.credito.id));
      if (!origen || !tokenOk_(origen, d.credito.token)) return { error: err_("credito", "No pudimos validar tu seña a favor.") };
      if (origen.whatsapp_wa !== wa) return { error: err_("credito", "La seña a favor pertenece a otro número de WhatsApp.") };
      cred = creditoUsable_(wa);
      if (!cred) return { error: err_("credito", "No hay una seña a favor disponible para usar.") };
      cubierto = Math.min(Number(cred.monto), CFG.SENA);
    }
    var porPagar = CFG.SENA - cubierto, id = idNuevo_(), token = tokenDe_(id);
    var conCredito = porPagar <= 0;
    var holdMs = medio === MEDIO.MP ? CFG.HOLD_MP_MIN * 60000 : CFG.HOLD_TRANSFER_H * 3600000;
    var r = {
      id: id, creado: new Date(ahora).toISOString(), estado: conCredito ? ESTADO.CONF : ESTADO.PEND,
      pago: conCredito ? PAGO.ACR : PAGO.SIN, medio: conCredito ? MEDIO.CRED : medio,
      inicio: new Date(ini).toISOString(), fin: new Date(fin).toISOString(), fecha: d.fecha, hora: d.hora,
      servicio_id: sv.id, servicio: sv.n, valor: sv.v, duracion_min: sv.min, sena: CFG.SENA, credito: cubierto, por_pagar: porPagar,
      nombre: String(d.nombre).trim(), apellido: String(d.apellido).trim(), whatsapp: String(d.tel).trim(), whatsapp_wa: wa,
      mail: String(d.mail).trim(), cumple: d.cumple, novedades: d.novedades ? "Sí" : "No",
      token_hash: hash_(token), vence: conCredito ? "" : new Date(ahora + holdMs).toISOString(), cancelada_en: "", clave: clave,
      preferencia: "", init_point: "", nota: conCredito ? "Seña cubierta con crédito " + cred.id : "", mensaje: "En espera", enviar_whatsapp: ""
    };
    agregar_("Reservas", r);
    var celdaWa = vinculoWhatsApp_(r);
    hoja_("Reservas").getRange(r._fila, HOJAS_.Reservas.indexOf("enviar_whatsapp") + 1).setNumberFormat("General").setFormula(celdaWa);
    ponerEstadoMensaje_(r);
    if (cred) aplicarCredito_(cred, r.id);
    evento_(r.id, "creada", { medio: r.medio, servicio: sv.id, inicio: r.inicio, credito: cubierto });
    upsertClienta_(r, d);
    return { r: r, token: token, nueva: true };
  });

  if (res.error) return res.error;
  var r = res.r;
  if (res.existente) {
    return ok_({ reserva: vistaReserva_(r), id: r.id, token: res.token, existente: true });
  }
  var salida = ok_({ reserva: vistaReserva_(r), id: r.id, token: res.token });
  if (r.estado === ESTADO.CONF) {
    enviarMail_(r, "confirmada", res.token);
  } else if (r.medio === MEDIO.TRANSF) {
    salida.transferencia = datosTransferencia_(r);
    enviarMail_(r, "recibida", res.token);
  } else {
    var ck = crearCheckout_(r, res.token);
    if (!ck.ok) {
      conLock_(function () {
        var fresca = reservaPorId_(r.id);
        if (fresca && fresca.estado === ESTADO.PEND) actualizar_("Reservas", fresca, { estado: ESTADO.VENC, nota: "No se pudo crear el checkout: " + ck.error });
      });
      return ck;
    }
    salida.checkout = ck.checkout;
    salida.reserva = vistaReserva_(reservaPorId_(r.id));
  }
  return salida;
}

function tokenOk_(r, token) {
  if (!r || !token) return false;
  return igualesSeguro_(hash_(token), r.token_hash);
}

function ponerEstadoMensaje_(r) {
  var h = hoja_("Reservas"), col = HOJAS_.Reservas.indexOf("mensaje") + 1;
  h.getRange(r._fila, col).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["Enviado", "En espera", "Cancelado"], true).setAllowInvalid(false).build());
}

/** Alta o actualización de la ficha de la clienta (hoja Clientas existente, columna WhatsApp = clave). */
function upsertClienta_(r, d) {
  try {
    var ss = libro_(), h = ss.getSheetByName("Clientas");
    if (!h) {
      h = ss.insertSheet("Clientas");
      h.appendRow(["Nombre", "Apellido", "WhatsApp", "Mail", "Cumpleaños", "Acepta novedades", "Turnos", "Último turno", "Alta"]);
      h.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f8d5e1");
      h.setFrozenRows(1);
    }
    var ult = h.getLastRow(), fila = 0;
    if (ult >= 2) {
      var vals = h.getRange(2, 3, ult - 1, 1).getValues();
      for (var i = 0; i < vals.length; i++) if (waNumber_(vals[i][0]) === r.whatsapp_wa) { fila = i + 2; break; }
    }
    if (fila) {
      var n = Number(h.getRange(fila, 7).getValue()) || 0;
      h.getRange(fila, 1, 1, 8).setValues([[r.nombre, r.apellido, r.whatsapp, r.mail, r.cumple, r.novedades, n + 1, r.fecha + " " + r.hora]]);
    } else {
      h.appendRow([r.nombre, r.apellido, "'" + r.whatsapp, r.mail, r.cumple, r.novedades, 1, r.fecha + " " + r.hora, r.creado]);
    }
  } catch (e) { evento_(r.id, "error_clienta", { e: String(e) }); }
}

/* ---------- consultar y cambiar de medio ---------- */

function autorizar_(id, token) {
  var r = reservaPorId_(String(id || ""));
  if (!r || !tokenOk_(r, token)) return null;
  return r;
}

/** POST status — estado actual para el retorno del pago y la página de gestión. */
function estadoReserva_(id, token) {
  var r = autorizar_(id, token);
  if (!r) return err_("no_autorizado", "No encontramos esa reserva o el enlace no es válido.");
  if ((r.estado === ESTADO.PEND || r.estado === ESTADO.VENC) && r.medio === MEDIO.MP && r.preferencia) {
    var c = CacheService.getScriptCache(), k = "conc_" + r.id;
    if (!c.get(k)) { c.put(k, "1", 8); try { conciliarReserva_(r.id); } catch (e) { evento_(r.id, "error_conciliar", { e: String(e) }); } }
    r = reservaPorId_(r.id);
  }
  var out = ok_({ reserva: vistaReserva_(r), contacto: "https://wa.me/" + CFG.WHATSAPP });
  if (r.medio === MEDIO.TRANSF && r.estado === ESTADO.PEND) out.transferencia = datosTransferencia_(r);
  var cred = creditoUsable_(r.whatsapp_wa);
  if (cred) out.credito = { id: cred.id, monto: Number(cred.monto) };
  return out;
}

/** POST checkout — (re)abre Mercado Pago o vuelve a transferencia para una reserva pendiente. */
function elegirMedio_(id, token, medio) {
  if (medio !== MEDIO.TRANSF && medio !== MEDIO.MP) return err_("medio", "Elegí un medio de pago válido.");
  var res = conLock_(function () {
    vencerCaducadas_();
    var r = autorizar_(id, token);
    if (!r) return { error: err_("no_autorizado", "No encontramos esa reserva o el enlace no es válido.") };
    if (r.estado === ESTADO.CONF) return { error: err_("ya_confirmada", "Tu turno ya está confirmado.") };
    if (r.pago === PAGO.ACR) return { error: err_("ya_pagada", "La seña ya figura acreditada.") };
    if (r.estado === ESTADO.VENC) {
      // reabrir solo si el lugar sigue libre
      var ocupados = intervalosOcupados_(leer_("Reservas"), ahora_(), r.id);
      if (haySolape_(msDe_(r.inicio), msDe_(r.fin), ocupados) || msDe_(r.inicio) < ahora_() + CFG.ANTICIPACION_H * 3600000)
        return { error: err_("ocupado", "Ese horario ya no está disponible. Elegí otro, por favor.") };
    } else if (r.estado !== ESTADO.PEND) {
      return { error: err_("estado", "Esta reserva ya no admite cambios.") };
    }
    if (r.pago === PAGO.PEND && r.medio === MEDIO.MP && medio === MEDIO.TRANSF)
      return { error: err_("pago_en_proceso", "Tu pago en Mercado Pago está en proceso. Esperá a que se acredite o contactá a Chhari.") };
    var holdMs = medio === MEDIO.MP ? CFG.HOLD_MP_MIN * 60000 : CFG.HOLD_TRANSFER_H * 3600000;
    r = actualizar_("Reservas", r, { estado: ESTADO.PEND, medio: medio, vence: new Date(ahora_() + holdMs).toISOString() });
    evento_(r.id, "medio_elegido", { medio: medio });
    return { r: r };
  });
  if (res.error) return res.error;
  var r = res.r;
  if (medio === MEDIO.TRANSF) return ok_({ reserva: vistaReserva_(r), transferencia: datosTransferencia_(r) });
  var ck = crearCheckout_(r, token);
  if (!ck.ok) return ck;
  return ok_({ reserva: vistaReserva_(reservaPorId_(r.id)), checkout: ck.checkout });
}
