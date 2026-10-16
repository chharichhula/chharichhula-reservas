/* Chhari Chhula · servidor de reservas. Archivo generado con servidor/construir.js: no editar a mano. */

/* ===== Config.gs ===== */
/**
 * Chhari Chhula · servidor de reservas (Google Apps Script)
 * CONFIGURACIÓN PÚBLICA. Acá NO van secretos: tokens y claves viven en
 * "Propiedades de la secuencia de comandos" (ver SERVIDOR.md).
 */
var CFG = {
  SITIO: "https://chharichhula.github.io/chharichhula-reservas/",
  TZ_MIN: -180,                 // Argentina: UTC-3 todo el año (sin horario de verano)
  SENA: 10000,
  MONEDA: "ARS",
  ANTICIPACION_H: 12,           // no se puede reservar con menos de 12 h de anticipación
  MESES_ADELANTE: 2,            // mes actual + 2
  CANCELACION_H: 72,            // cancelar online hasta 72 h antes (inclusive)
  AVISO_H: 24,                  // política: aviso de 24 h para reprogramar con Chari
  HOLD_TRANSFER_H: 12,          // horas que se reserva el lugar esperando la transferencia
  HOLD_MP_MIN: 30,              // minutos que dura el checkout de Mercado Pago
  HOLD_MP_EN_PROCESO_H: 24,     // si Mercado Pago informa "en proceso", se espera hasta 24 h
  MAX_PENDIENTES_POR_TEL: 2,
  WHATSAPP: "5493517593713",
  SALON: {
    direccion: "LAS PLAYAS 1717", barrio: "VILLA CABRERA", instagram: "@Chharichhula",
    alias: "virgo.30", titular: "Carolina Micaela Marengo", celular: "3517593713",
    mapa: "https://www.google.com/maps/search/?api=1&query=Las+Playas+1717+Villa+Cabrera+C%C3%B3rdoba"
  },
  HORARIOS: {
    0: [],
    1: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    2: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    3: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    4: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    5: ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"],
    6: ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"]
  },
  CIERRE: { 0: null, 1: "18:00", 2: "18:00", 3: "18:00", 4: "18:00", 5: "18:00", 6: "17:00" }
};

/** Catálogo oficial (el navegador solo manda el id; duración y valor salen de acá). */
var SERVICIOS = [
  { id: "semi", n: "Esmaltado semipermanente", v: "$20.000", t: "1:30 hs", min: 90,
    d: "Consiste en aplicar color y diseño sobre tu uña natural. Ideal si querés mantener tus uñas prolijas y con brillo." },
  { id: "capnivel", n: "Capping nivelador", v: "$25.000", t: "2:00 hs", min: 120,
    d: "Consiste en reforzar la uña natural con una capa fina de gel para darle más resistencia, y luego se aplica el esmaltado semipermanente. Perfecto si tus uñas son frágiles o se quiebran fácilmente. Ideal para uñas corta a medias." },
  { id: "cappoly", n: "Capping Poligel", v: "$30.000", t: "2:30 hs", min: 150,
    d: "Consiste en aplicar una capa fina de Polygel (gel más rígido) sobre la uña natural para reforzarla, emparejar la superficie y darle mayor durabilidad. Ideal para uñas naturales largas." },
  { id: "soft", n: "Soft Gel", v: "desde $35.000", t: "3:00 hs", min: 180,
    d: "Extensión de gel preformadas que se adhieren a la uña natural, logrando un largo y una forma perfectos de manera rápida y cómoda. Se finalizan con esmaltado semipermanente. Ideal si querés alargar tus uñas de inmediato.",
    x: "Largo 1 y 2: $35.000 · Largo 3 y 4: $38.000 · Largo XXL: $45.000" },
  { id: "rusa", n: "Manicura rusa", v: "$18.000", t: "1:00 hs", min: 60,
    d: "Es una técnica de limpieza profunda y detallada del contorno de la uña y cutículas, realizada con torno. Deja un acabado impecable sin la necesidad de aplicarse Semipermanente o Capping." }
];

var REMOCIONES = [
  "Remoción completa de trabajos hechos en otro salón: $7000",
  "Remoción completa de Soft Gel o Capping (hechos en mi salón): $5000",
  "Remoción completa de semipermanente (hechos en mi salón): $3000",
  "Reconstrucción por cada uña: $1000",
  "Remoción Soft Gel / Capping + Manicura rusa: $22.000",
  "Remoción semipermanente + Manicura rusa: $20.000"
];

var EFECTOS = [
  "Efecto espejado: $500", "Efecto holográfico: $500", "Efecto aurora: $500", "Efecto aura: $500",
  "Efecto blooming: $400", "Stras brillos 5x uña: $700", "Relieve: $600", "Relieve 3D: $900",
  "Baby boomer / color: $400", "Baby glitter: $600", "Encapsulado: $1000", "Nail art y french: $300"
];

var RESERVA = [
  "Los turnos se reservan con una seña de $10.000. Sin seña el turno no queda confirmado.",
  "La seña se descuenta del valor total de los servicios realizados.",
  "La seña no tiene devolución. Si no llegás a la cita se pierde.",
  "La seña se mantiene con el previo aviso de 24 hs antes de la cita pactada, y reprogramando una cita nueva, organizada a los tiempos disponibles de la agenda.",
  "Podés cancelar desde tu enlace privado hasta 72 hs antes: el horario se libera y la seña acreditada queda a tu favor para reprogramar.",
  "Los pagos se abonan antes de retirarse del salón.",
  "No trabajo con saldos pendientes."
];

var TENER_EN_CUENTA = [
  "Enviar una foto del estado actual de cómo vienen tus uñas.",
  "Enviar una foto de referencia del diseño que vamos a realizar. Ya que hay diseños que requieren más tiempo y esto me permite organizar la agenda con precisión para vos y mi próxima clienta."
];

var REGLAS = [
  "Ser puntuales a su cita pactada (tolerancia 15’).",
  "Asistir con sus uñas limpias y cepilladas sin resto de comida o suciedad por debajo y por arriba de sus uñas.",
  "No aplicarse cremas en las manos antes de la cita.",
  "No asistir con esmaltes tradicionales.",
  "Avisar previamente si vienen con un servicio hecho en otro salón.",
  "Asistir a su cita sin acompañantes.",
  "Salón no apto para recibir niñes."
];

var ESTADO = { PEND: "Pendiente", CONF: "Confirmada", CANC: "Cancelada", VENC: "Vencida", REV: "Revisión", NOASIST: "No asistió" };
var PAGO = { SIN: "Sin pago", PEND: "Pendiente", ACR: "Acreditado", RECH: "Rechazado" };
var MEDIO = { TRANSF: "transferencia", MP: "mercadopago", CRED: "credito" };
var CRED = { DISP: "Disponible", APLIC: "Aplicado", REVERT: "Revertido" };

/* ===== Util.gs ===== */
/* ---------- utilidades (sin dependencias de la planilla) ---------- */

function ahora_() { return (typeof NOW_FN_ === "function") ? NOW_FN_() : Date.now(); }
function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function aMin_(h) { var p = String(h).split(":"); return Number(p[0]) * 60 + Number(p[1]); }
function minAHora_(m) { return pad2_(Math.floor(m / 60)) + ":" + pad2_(m % 60); }

/** "2026-10-20" + "14:00" (hora de Córdoba) -> milisegundos UTC */
function aMs_(fecha, hora) {
  var f = String(fecha).split("-"), h = String(hora).split(":");
  return Date.UTC(Number(f[0]), Number(f[1]) - 1, Number(f[2]), Number(h[0]), Number(h[1])) - CFG.TZ_MIN * 60000;
}
/** milisegundos UTC -> {fecha:"YYYY-MM-DD", hora:"HH:MM", dow} en hora de Córdoba */
function aLocal_(ms) {
  var d = new Date(ms + CFG.TZ_MIN * 60000);
  return {
    fecha: d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate()),
    hora: pad2_(d.getUTCHours()) + ":" + pad2_(d.getUTCMinutes()),
    dow: d.getUTCDay()
  };
}
function dowDe_(fecha) {
  var f = String(fecha).split("-");
  return new Date(Date.UTC(Number(f[0]), Number(f[1]) - 1, Number(f[2]))).getUTCDay();
}
function fechaValida_(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f))) return false;
  var p = String(f).split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}
function sumarDias_(fecha, n) {
  var p = String(fecha).split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate());
}
/** Último día permitido para reservar: fin del mes (actual + MESES_ADELANTE). */
function ultimoDiaReservable_() {
  var h = aLocal_(ahora_()).fecha.split("-").map(Number);
  var d = new Date(Date.UTC(h[0], h[1] - 1 + CFG.MESES_ADELANTE + 1, 0));
  return d.getUTCFullYear() + "-" + pad2_(d.getUTCMonth() + 1) + "-" + pad2_(d.getUTCDate());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(extra) { var o = { ok: true }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
function err_(codigo, mensaje, extra) { var o = { ok: false, error: codigo, mensaje: mensaje }; for (var k in (extra || {})) o[k] = extra[k]; return o; }

function propiedad_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }

function bytesHex_(b) {
  return b.map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length < 2 ? "0" + v : v; }).join("");
}
function hash_(t) {
  return bytesHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8));
}
/** Clave interna para derivar los enlaces privados (se crea sola la primera vez; vive solo en las propiedades del script). */
function claveTokens_() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty("TOKEN_KEY");
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty("TOKEN_KEY", k); }
  return k;
}
/** Token privado de una reserva = HMAC-SHA256(clave interna, id). En la planilla solo queda su hash. */
function tokenDe_(id) {
  return bytesHex_(Utilities.computeHmacSha256Signature("reserva:" + id, claveTokens_()));
}
function igualesSeguro_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function idNuevo_() {
  var u = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  return "R-" + u.slice(0, 8);
}

/** WhatsApp en formato internacional argentino (549…), igual que la web. */
function waNumber_(t) {
  var d = String(t == null ? "" : t).replace(/\D/g, "");
  if (d.indexOf("00") === 0) d = d.slice(2);
  if (d.indexOf("0") === 0) d = d.slice(1);
  if (d.indexOf("54") === 0) return d.indexOf("549") === 0 ? d : "549" + d.slice(2);
  return "549" + d.replace(/^15/, "");
}

function pesos_(n) { return "$" + String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function servicioPorId_(id) { for (var i = 0; i < SERVICIOS.length; i++) if (SERVICIOS[i].id === id) return SERVICIOS[i]; return null; }
function esc_(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function diaCorto_(f) {
  var p = String(f).split("-"), dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return dias[dowDe_(f)] + " " + Number(p[2]) + "/" + Number(p[1]);
}
function horaCorta_(h) {
  var p = String(h).split(":");
  return p[1] === "00" ? Number(p[0]) + "hs" : Number(p[0]) + ":" + p[1] + "hs";
}

/* ===== Tabla.gs ===== */
/* ---------- planilla como base de datos (cada hoja = una tabla) ---------- */

var HOJAS_ = {
  Reservas: ["id","creado","estado","pago","medio","inicio","fin","fecha","hora","servicio_id","servicio","valor",
             "duracion_min","sena","credito","por_pagar","nombre","apellido","whatsapp","whatsapp_wa","mail","cumple",
             "novedades","token_hash","vence","cancelada_en","clave","preferencia","init_point","nota","mensaje","enviar_whatsapp"],
  Pagos: ["proveedor","pago_id","reserva_id","monto","moneda","estado_mp","estado","receptor","modo","creado","actualizado","nota"],
  Creditos: ["id","origen_reserva","origen_pago","whatsapp_wa","monto","estado","aplicado_en","creado","actualizado","nota"],
  Eventos: ["evento_id","tiempo","reserva_id","tipo","detalle"],
  Bloqueos: ["fecha","desde","hasta","motivo"]
};

var LIBRO_ = null, HOJAS_ABIERTAS_ = {};   // se reinician en cada ejecución: evitan abrir la planilla decenas de veces

function libro_() {
  if (LIBRO_) return LIBRO_;
  var id = propiedad_("SHEET_ID");
  if (!id) throw new Error("Falta la propiedad SHEET_ID (ver SERVIDOR.md).");
  LIBRO_ = SpreadsheetApp.openById(id);
  return LIBRO_;
}

function hoja_(nombre) {
  if (HOJAS_ABIERTAS_[nombre]) return HOJAS_ABIERTAS_[nombre];
  var ss = libro_(), h = ss.getSheetByName(nombre);
  if (!h) {
    var cab = HOJAS_[nombre];
    h = ss.insertSheet(nombre);
    h.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight("bold").setBackground("#f8d5e1");
    h.setFrozenRows(1);
    // todo se guarda como texto: evita que Sheets convierta fechas, horas o números
    h.getRange(2, 1, 2000, cab.length).setNumberFormat("@");
  }
  HOJAS_ABIERTAS_[nombre] = h;
  return h;
}

/** Los tests (y nada más) reinician el estado de la ejecución. */
function reiniciarCache_() { LIBRO_ = null; HOJAS_ABIERTAS_ = {}; }

function celda_(v) {
  if (v === null || v === undefined) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") return v.toISOString();
  return String(v);
}

/** Lee toda la tabla como lista de objetos (con _fila = número de fila en la hoja). */
function leer_(nombre) {
  var h = hoja_(nombre), cab = HOJAS_[nombre], ult = h.getLastRow();
  if (ult < 2) return [];
  var vals = h.getRange(2, 1, ult - 1, cab.length).getValues(), out = [];
  for (var i = 0; i < vals.length; i++) {
    var o = { _fila: i + 2 }, vacia = true;
    for (var c = 0; c < cab.length; c++) { o[cab[c]] = celda_(vals[i][c]); if (o[cab[c]] !== "") vacia = false; }
    if (!vacia) out.push(o);
  }
  return out;
}

/** Columnas que se escriben como valores (en Reservas la última es una fórmula HYPERLINK y no se pisa). */
function anchoEscritura_(nombre) { return nombre === "Reservas" ? HOJAS_[nombre].length - 1 : HOJAS_[nombre].length; }

function filaAArray_(nombre, o) {
  var cab = HOJAS_[nombre].slice(0, anchoEscritura_(nombre));
  return cab.map(function (k) { return o[k] === undefined || o[k] === null ? "" : String(o[k]); });
}

function agregar_(nombre, o) {
  var h = hoja_(nombre), fila = Math.max(h.getLastRow(), 1) + 1;
  h.getRange(fila, 1, 1, anchoEscritura_(nombre)).setNumberFormat("@").setValues([filaAArray_(nombre, o)]);
  o._fila = fila;
  return o;
}

/** Cambia campos de una fila y devuelve el objeto actualizado. */
function actualizar_(nombre, o, cambios) {
  for (var k in cambios) o[k] = cambios[k];
  var h = hoja_(nombre);
  h.getRange(o._fila, 1, 1, anchoEscritura_(nombre)).setNumberFormat("@").setValues([filaAArray_(nombre, o)]);
  return o;
}

/** Registro de eventos. Con "clave" es idempotente: la misma clave no se registra dos veces. */
function evento_(reservaId, tipo, detalle, clave) {
  if (clave) {
    var h = hoja_("Eventos"), ult = h.getLastRow();
    if (ult >= 2) {
      var ids = h.getRange(2, 1, ult - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === clave) return false;
    }
  }
  agregar_("Eventos", {
    evento_id: clave || Utilities.getUuid(), tiempo: new Date(ahora_()).toISOString(),
    reserva_id: reservaId || "", tipo: tipo, detalle: detalle ? JSON.stringify(detalle) : ""
  });
  return true;
}

/** Exclusión mutua: todo lo que lee, decide y escribe agenda, pagos o créditos va acá. */
function conLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function reservaPorId_(id) {
  var r = leer_("Reservas");
  for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i];
  return null;
}

/* ===== Agenda.gs ===== */
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
  if (medio === MEDIO.MP && !propiedad_("MP_ACCESS_TOKEN")) return err_("mp_no_configurado", "El pago con Mercado Pago todavía no está disponible. Podés pagar por transferencia.");
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

/* ===== Gestion.gs ===== */
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

/* ===== Pagos.gs ===== */
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

/* ===== Mail.gs ===== */
/* ---------- mails (estética de Chhari; las imágenes viven en /email/ del sitio publicado) ---------- */

var IMG = "https://chharichhula.github.io/chharichhula-reservas/email/";

function estadoTexto_(d, tipo) {
  if (tipo === "cancelada") return "Cancelada";
  if (tipo === "confirmada") return "Confirmada · seña acreditada";
  if (d.estado === "Revisión") return "En revisión de Chhari";
  return "Pendiente de seña";
}
function saludoTexto_(tipo) {
  if (tipo === "confirmada") return "¡Tu turno está confirmado! Acá tenés el detalle y lo que tenés que saber para venir.";
  if (tipo === "cancelada") return "Cancelaste tu turno. Liberamos el horario; abajo te contamos qué pasa con tu seña.";
  return "¡Gracias por reservar en el bosque de Chari! Guardamos tu lugar. Acá tenés el detalle y lo que tenés que saber.";
}
function avisoHtml_(d, tipo) {
  var t;
  if (tipo === "confirmada") t = "Tu turno quedó <strong>confirmado</strong>: la seña figura acreditada. ¡Te espero!";
  else if (tipo === "cancelada") t = Number(d.creditoGenerado) > 0
    ? "Tu seña de <strong>" + pesos_(d.creditoGenerado) + "</strong> quedó <strong>a tu favor</strong> para reprogramar. No es una devolución de dinero. Podés usarla una sola vez, entrando al enlace de abajo y eligiendo un nuevo día."
    : "No había una seña acreditada, así que no se generó saldo a favor.";
  else t = "Guardamos tu lugar hasta <strong>" + esc_(d.venceTexto || "unas horas") + "</strong>. Tu turno queda <strong>confirmado cuando se acredita la seña</strong>; en ese momento te llega otro mail. Si ya transferiste, enviale el comprobante a Chari por WhatsApp.";
  return "<div style='background:" + C_PALE + ";border-radius:12px;padding:10px 14px;margin-top:12px;font-size:14px;line-height:1.5;color:" + C_TINTA + "'>" + t + "</div>";
}
function gestionHtml_(d, tipo, link) {
  var boton = "<a href='" + esc_(link) + "' style='display:inline-block;background:" + C_ROSA + ";color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:999px'>" + (tipo === "cancelada" ? "Ver mi seña a favor" : "Gestionar mi cita") + "</a>";
  var nota = tipo === "cancelada" ? "" :
    "<div style='font-size:13px;line-height:1.5;color:#7a6b64;margin-top:10px'>Con este enlace privado podés ver tu cita y cancelarla hasta <strong>72 hs antes</strong>. Entre 72 y 24 hs antes, escribile a Chari para reprogramar según su agenda. No lo compartas: da acceso a tu reserva.</div>";
  return titulo_("Tu enlace privado") + "<div style='margin:6px 0'>" + boton + "</div>" + nota;
}
function asuntoMail_(d, tipo) {
  var cuando = diaCorto_(d.fecha) + " a las " + horaCorta_(d.hora);
  if (tipo === "confirmada") return "Turno confirmado en Chhari Chhula · " + cuando;
  if (tipo === "cancelada") return "Cancelaste tu turno en Chhari Chhula · " + cuando;
  return "Guardamos tu lugar en Chhari Chhula · " + cuando;
}

function textoMail_(d, tipo, link) {
  var L = ["Hola " + d.nombre + ",", "", saludoTexto_(tipo), "", "TU TURNO",
    "Servicio: " + d.servicio + " (" + d.valor + ")", "Día: " + diaCorto_(d.fecha), "Hora: " + horaCorta_(d.hora),
    "Seña: " + pesos_(d.sena), "Estado: " + estadoTexto_(d, tipo), ""];
  if (tipo === "cancelada") {
    L.push(Number(d.creditoGenerado) > 0 ? "Tu seña de " + pesos_(d.creditoGenerado) + " quedó a tu favor para reprogramar (no es una devolución de dinero)." : "No había seña acreditada.");
    L.push("", "Ver mi seña a favor: " + link);
    return L.join("\n");
  }
  if (tipo === "recibida") {
    L.push("Tu turno queda confirmado cuando se acredita la seña. Si ya transferiste, enviale el comprobante a Chari por WhatsApp.", "",
      "DATOS DE TRANSFERENCIA", "Alias: " + CFG.SALON.alias, "Titular: " + CFG.SALON.titular, "Celular: " + CFG.SALON.celular + " (enviar comprobante)", "");
  }
  L.push("GESTIONAR MI CITA (enlace privado, no lo compartas)", link, "Cancelación online hasta 72 hs antes. Entre 72 y 24 hs antes, reprogramás directamente con Chari según disponibilidad.", "");
  L.push("RESERVA, CONFIRMACIÓN Y CANCELACIONES"); RESERVA.forEach(function (x) { L.push("- " + x); });
  L.push("", "A TENER EN CUENTA"); TENER_EN_CUENTA.forEach(function (x) { L.push("- " + x); });
  L.push("", "DÓNDE TE ESPERO", CFG.SALON.direccion + " · Barrio " + CFG.SALON.barrio); REGLAS.forEach(function (x) { L.push("- " + x); });
  L.push("", "SERVICIOS, VALORES Y TIEMPOS", "Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).");
  SERVICIOS.forEach(function (s) { L.push("", s.n + " · " + s.v + " · " + s.t, s.d); if (s.x) L.push(s.x); });
  L.push("", "VALORES EXTRAS"); REMOCIONES.forEach(function (x) { L.push("- " + x); }); EFECTOS.forEach(function (x) { L.push("- " + x); });
  L.push("", "Gracias, te espero.", CFG.SALON.instagram);
  return L.join("\n");
}

/** Envía el mail correspondiente. Tipos: recibida (transferencia pendiente), confirmada, cancelada. */
function enviarMail_(r, tipo, token) {
  if (!r || !r.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.mail)) return false;
  try {
    var d = {}; for (var k in r) d[k] = r[k];
    if (r.vence) { var l = aLocal_(msDe_(r.vence)); d.venceTexto = diaCorto_(l.fecha) + " " + horaCorta_(l.hora); }
    if (tipo === "cancelada") {
      var cs = leer_("Creditos").filter(function (c) { return c.origen_reserva === r.id; });
      d.creditoGenerado = cs.reduce(function (a, c) { return a + Number(c.monto); }, 0);
    }
    var link = CFG.SITIO + "#gestionar=" + r.id + "." + token;
    var yo = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({ to: r.mail, bcc: yo, replyTo: yo, subject: asuntoMail_(d, tipo),
      body: textoMail_(d, tipo, link), htmlBody: htmlMail_(d, tipo, link), name: "Chhari Chhula" });
    evento_(r.id, "mail_" + tipo, { a: r.mail });
    return true;
  } catch (err) {
    try { evento_(r.id, "error_mail", { e: String(err), tipo: tipo }); } catch (e2) { /* nada */ }
    return false;
  }
}

var C_VERDE = "#1B4D3A", C_ROSA = "#EE5D93", C_ROSA_CLARO = "#F8D5E1", C_PALE = "#FFE9F1", C_CREMA = "#FFF7EE", C_TINTA = "#2A2320";

function titulo_(t) {
  return "<div style='font-family:Georgia,\"Times New Roman\",serif;font-size:21px;color:" + C_VERDE + ";font-weight:bold;margin:0 0 8px'>" + t + "</div>";
}
function lista_(arr) {
  return "<ul style='margin:0;padding-left:20px;font-size:14px;line-height:1.55;color:" + C_TINTA + "'>" +
    arr.map(function (x) { return "<li style='margin-bottom:6px'>" + esc_(x) + "</li>"; }).join("") + "</ul>";
}
/* sección con una imagen decorativa a un costado */
function seccion_(contenido, imgFile, imgW, lado) {
  var img = "<img src='" + IMG + imgFile + "' width='" + imgW + "' alt='' style='display:block;width:" + imgW + "px;max-width:100%;height:auto;border:0'>";
  var t = "<td valign='top' style='padding:0'>" + contenido + "</td>";
  var i = "<td valign='middle' width='" + (imgW + 10) + "' style='padding:0 0 0 " + (lado === "d" ? 12 : 0) + "px'>" + img + "</td>";
  var i2 = "<td valign='middle' width='" + (imgW + 10) + "' style='padding:0 12px 0 0'>" + img + "</td>";
  return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
    (lado === "d" ? t + i : i2 + t) + "</tr></table>";
}
function bloque_(html) {
  return "<tr><td style='padding:6px 28px 14px'>" + html + "</td></tr>";
}
function sep_() {
  return "<tr><td style='padding:6px 28px'><div style='border-top:2px dotted " + C_ROSA_CLARO + ";height:1px;line-height:1px'>&nbsp;</div></td></tr>";
}

function htmlMail_(d, tipo, link) {
  var serv = SERVICIOS.map(function (s) {
    var largos = "";
    if (s.x) {
      largos = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-top:10px;background:" + C_CREMA + ";border-radius:12px'>" +
        s.x.split(" · ").map(function (it) {
          var pr = partePrecio_(it);
          return "<tr><td style='padding:7px 12px;font-size:14px;color:" + C_TINTA + ";border-bottom:1px dotted " + C_ROSA_CLARO + "'>" + esc_(pr.label) + "</td>" +
            "<td align='right' style='padding:7px 12px;font-size:14px;font-weight:bold;color:" + C_ROSA + ";border-bottom:1px dotted " + C_ROSA_CLARO + "'>" + esc_(pr.precio) + "</td></tr>";
        }).join("") + "</table>";
    }
    return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:12px 0;background:#ffffff;border:1px solid #F6B7CF;border-radius:16px;overflow:hidden'>" +
      "<tr><td style='background:" + C_PALE + ";padding:12px 16px'>" +
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
          "<td style='font-family:Georgia,serif;font-size:19px;color:" + C_VERDE + ";font-weight:bold'>" + esc_(s.n) + "</td>" +
          "<td align='right' style='white-space:nowrap'><span style='display:inline-block;background:" + C_ROSA + ";color:#ffffff;font-weight:bold;font-size:16px;padding:6px 14px;border-radius:999px'>" + esc_(fmtPrecio_(s.v)) + "</span></td>" +
        "</tr></table></td></tr>" +
      "<tr><td style='padding:12px 16px 14px'>" +
        "<div style='font-size:13px;color:" + C_VERDE + ";font-weight:bold;margin-bottom:6px'>&#9719; Tiempo aproximado: " + esc_(s.t) + "</div>" +
        "<div style='font-size:14px;line-height:1.6;color:" + C_TINTA + "'>" + esc_(s.d) + "</div>" +
        largos +
      "</td></tr></table>";
  }).join("");

  var remociones = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#ffffff;border:1px solid #F6B7CF;border-radius:16px'>" +
    REMOCIONES.map(function (it, i) {
      var pr = partePrecio_(it);
      var borde = i < REMOCIONES.length - 1 ? "border-bottom:1px dotted " + C_ROSA_CLARO : "";
      return "<tr><td style='padding:10px 14px;font-size:14px;line-height:1.45;color:" + C_TINTA + ";" + borde + "'>" + esc_(pr.label) + "</td>" +
        "<td align='right' valign='middle' style='padding:10px 14px;font-size:15px;font-weight:bold;color:" + C_ROSA + ";white-space:nowrap;" + borde + "'>" + esc_(pr.precio) + "</td></tr>";
    }).join("") + "</table>";

  var efectos = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>";
  for (var i = 0; i < EFECTOS.length; i += 2) {
    efectos += "<tr>";
    for (var j = i; j < i + 2; j++) {
      var pr = partePrecio_(EFECTOS[j]);
      efectos += "<td width='50%' valign='top' style='padding:0 " + (j % 2 === 0 ? "5px 8px 0" : "0 8px 5px") + "'>" +
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:" + C_PALE + ";border-radius:12px'><tr>" +
        "<td style='padding:9px 10px;font-size:13px;color:" + C_TINTA + "'>" + esc_(pr.label) + "</td>" +
        "<td align='right' style='padding:9px 10px;font-size:14px;font-weight:bold;color:" + C_ROSA + ";white-space:nowrap'>" + esc_(pr.precio) + "</td>" +
        "</tr></table></td>";
    }
    efectos += "</tr>";
  }
  efectos += "</table>";

  var turno =
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background:" + C_PALE + ";border:1px solid #F6B7CF;border-radius:16px'><tr><td style='padding:14px 18px'>" +
    "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='font-size:15px;color:" + C_TINTA + "'>" +
    fila_("Servicio", esc_(d.servicio)) + fila_("Día", esc_(diaCorto_(d.fecha))) + fila_("Hora", esc_(horaCorta_(d.hora))) +
    fila_("Valor del servicio", esc_(d.valor)) + fila_("Seña", "<span style='color:" + C_ROSA + ";font-weight:bold'>" + pesos_(d.sena) + "</span>") + (Number(d.credito) > 0 ? fila_("Seña a favor aplicada", esc_(pesos_(d.credito))) : "") + fila_("Estado", esc_(estadoTexto_(d, tipo))) +
    "</table></td></tr></table>";

  var html =
    "<div style='background:#0F3123;padding:22px 8px;font-family:Arial,Helvetica,sans-serif'>" +
    "<table role='presentation' align='center' width='600' cellpadding='0' cellspacing='0' border='0' style='width:100%;max-width:600px;background:" + C_CREMA + ";border-radius:24px;overflow:hidden'>" +

    // cabecera con logo y guirnalda
    "<tr><td align='center' style='background:" + C_VERDE + ";padding:26px 20px 14px'>" +
      "<img src='" + IMG + "logo.png' width='340' alt='Chhari Chhula · El hada de las uñas' style='display:block;width:340px;max-width:90%;height:auto;border:0'></td></tr>" +
    "<tr><td style='background:" + C_VERDE + ";padding:0;line-height:0'>" +
      "<img src='" + IMG + "guirnalda.png' width='600' alt='' style='display:block;width:100%;height:auto;border:0'></td></tr>" +

    // saludo con Chari
    "<tr><td style='padding:24px 28px 8px'>" +
      "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr>" +
        "<td valign='middle' style='font-size:16px;line-height:1.55;color:" + C_TINTA + "'>" +
          "<div style='font-family:Georgia,serif;font-size:26px;color:" + C_VERDE + ";margin-bottom:8px'>Hola, <span style='color:" + C_ROSA + "'>" + esc_(d.nombre) + "</span></div>" +
          saludoTexto_(tipo) +
        "</td>" +
        "<td valign='bottom' width='140' align='right' style='padding-left:12px'><img src='" + IMG + "chari.png' width='130' alt='Chari, el hada de las uñas' style='display:block;width:130px;height:auto;border:0'></td>" +
      "</tr></table></td></tr>" +

    bloque_(titulo_("Tu turno") + turno + avisoHtml_(d, tipo)) +
    bloque_(gestionHtml_(d, tipo, link)) +

    (tipo === "recibida" ? (    sep_() +
    bloque_(seccion_(
      titulo_("Datos de transferencia") +
      "<div style='font-size:15px;line-height:1.8;color:" + C_TINTA + "'>Alias: <strong>" + esc_(CFG.SALON.alias) + "</strong><br>Titular: <strong>" + esc_(CFG.SALON.titular) +
      "</strong><br>Celular: <strong>" + esc_(CFG.SALON.celular) + "</strong> (enviar comprobante)</div>", "hongos.png", 150, "d"))) : "") +

    (tipo !== "cancelada" ? (
    sep_() +
    bloque_(seccion_(titulo_("Reserva, confirmación y cancelaciones") + lista_(RESERVA), "cristales.png", 120, "d")) +

    bloque_(titulo_("A tener en cuenta") + lista_(TENER_EN_CUENTA)) +

    sep_() +
    bloque_(titulo_("Dónde te espero") +
      "<div style='font-size:15px;margin-bottom:8px;color:" + C_TINTA + "'><strong>" + esc_(CFG.SALON.direccion) + "</strong> · Barrio " + esc_(CFG.SALON.barrio) + "</div>" +
      lista_(REGLAS)) +

    sep_() +
    bloque_(titulo_("Servicios, valores y tiempos") +
      "<div style='font-size:13px;color:#7a6b64'>Todos los servicios de manicura incluyen 4 uñas con brillo o nail art (simple) y 6 uñas con color liso (a elección).</div>" + serv) +

    sep_() +
    bloque_(titulo_("Valores extras") +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 10px'>Servicios adicionales que podés sumar a tu turno.</div>" +
      "<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Remociones y reconstrucción</div>" + remociones) +
    bloque_(seccion_("<div style='font-weight:bold;font-size:15px;color:" + C_VERDE + ";margin:0 0 8px'>Efectos y diseños</div>" +
      "<div style='font-size:13px;color:#7a6b64;margin:0 0 8px'>Precio por servicio adicional.</div>", "flores.png", 110, "d") + efectos)
    ) : "") +

    // pie
    "<tr><td align='center' style='background:" + C_VERDE + ";padding:22px 20px;color:" + C_ROSA_CLARO + ";font-size:15px'>" +
      "<img src='" + IMG + "logo.png' width='220' alt='Chhari Chhula' style='display:block;margin:0 auto 10px;width:220px;height:auto;border:0'>" +
      "Gracias, te espero.<br><span style='color:#ffffff'>" + esc_(CFG.SALON.instagram) + "</span></td></tr>" +

    "</table></div>";
  return html;
}
/* separa "Etiqueta: $precio" y normaliza los miles ($7000 -> $7.000) */
function fmtPrecio_(t) {
  return String(t).replace(/\$\s?(\d{4,})/g, function (m, n) {
    return "$" + n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
}
function partePrecio_(t) {
  var i = String(t).lastIndexOf(": ");
  if (i < 0) return { label: t, precio: "" };
  return { label: String(t).slice(0, i), precio: fmtPrecio_(String(t).slice(i + 2)) };
}
function fila_(a, b) {
  return "<tr><td style='padding:6px 0;color:#7a6b64'>" + a + "</td><td align='right' style='padding:6px 0'><strong>" + b + "</strong></td></tr>";
}


/* ===== Api.gs ===== */
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

/* ===== Admin.gs ===== */
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
